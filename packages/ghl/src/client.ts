import { GhlConfigError } from './errors';
import type { Transport } from './transports';
import type {
  Appointment,
  AppointmentListQuery,
  AppointmentListResponse,
  AppointmentSlotsQuery,
  AppointmentSlotsResponse,
  Calendar,
  CalendarListResponse,
  CalendarSlotsResponse,
  Contact,
  ContactListQuery,
  ContactListResponse,
  ContactLookupResponse,
  ContactUpsertResponse,
  CreateAppointmentInput,
  CreateContactInput,
  CustomFieldDefinition,
  FreeSlotsQuery,
  UpdateAppointmentInput,
  Workflow,
  WorkflowListResponse,
} from './types';

/**
 * GHL requires a Version header on most resources. These are the versions used
 * by the public API v2 (marketplace.gohighlevel.com/docs). The sandbox accepts
 * the same headers, which is how the two stay interchangeable.
 */
const VERSIONS: Record<string, string> = {
  '/contacts': '2021-07-28',
  '/calendars': '2021-04-15',
  '/custom-fields': '2021-07-28',
  '/workflows': '2021-07-28',
};

export interface GhlClientOptions {
  transport: Transport;
}

export class GhlClient {
  readonly transport: Transport;
  readonly contacts: ContactsApi;
  readonly tags: TagsApi;
  readonly customFields: CustomFieldsApi;
  readonly calendars: CalendarsApi;
  readonly appointments: AppointmentsApi;
  readonly workflows: WorkflowsApi;

  constructor(opts: GhlClientOptions) {
    if (!opts.transport) throw new GhlConfigError('GhlClient requires a transport');
    this.transport = opts.transport;
    this.contacts = new ContactsApi(opts.transport);
    this.tags = new TagsApi(opts.transport);
    this.customFields = new CustomFieldsApi(opts.transport);
    this.calendars = new CalendarsApi(opts.transport);
    this.appointments = new AppointmentsApi(opts.transport);
    this.workflows = new WorkflowsApi(opts.transport);
  }
}

export function versionHeadersFor(path: string): Record<string, string> | undefined {
  const version = Object.entries(VERSIONS)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => path.startsWith(prefix));
  return version ? { Version: version[1] } : undefined;
}

class ContactsApi {
  constructor(private readonly transport: Transport) {}

  async list(query: ContactListQuery = {}): Promise<ContactListResponse> {
    return this.request('GET', '/contacts', undefined, query);
  }

  async get(id: string): Promise<Contact> {
    return this.request('GET', `/contacts/${id}`);
  }

  async lookup(params: { email?: string; phone?: string }): Promise<ContactLookupResponse> {
    return this.request('GET', '/contacts/lookup', undefined, {
      ...(params.email ? { email: params.email } : {}),
      ...(params.phone ? { phone: params.phone } : {}),
    });
  }

  async create(input: CreateContactInput): Promise<Contact> {
    const res = await this.request<Contact>('POST', '/contacts', input);
    return res;
  }

  async update(id: string, input: CreateContactInput): Promise<Contact> {
    return this.request('PUT', `/contacts/${id}`, input);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/contacts/${id}`);
  }

  async upsert(input: CreateContactInput): Promise<ContactUpsertResponse> {
    return this.request('POST', '/contacts/upsert', input);
  }

  async updateCustomFields(
    id: string,
    fields: { id?: string; key?: string; value: string | number | boolean | string[] | null }[],
  ): Promise<Contact> {
    return this.request('PUT', `/contacts/${id}/custom-fields`, { customFields: fields });
  }

  private request<T>(method: string, path: string, body?: unknown, query?: object): Promise<T> {
    return this.transport
      .request({ method: method as 'GET', path, body, query: query as unknown as Record<string, string | number | boolean | string[] | undefined>, headers: versionHeadersFor(path) })
      .then((r) => r.body as T);
  }
}

class TagsApi {
  constructor(private readonly transport: Transport) {}

  async add(contactId: string, tags: string[]): Promise<{ tags: string[] }> {
    const path = `/contacts/${contactId}/tags`;
    return this.transport.request({ method: 'POST', path, body: { tags }, headers: versionHeadersFor(path) }).then((r) => r.body as { tags: string[] });
  }

  async remove(contactId: string, tags: string[]): Promise<{ tags: string[] }> {
    const path = `/contacts/${contactId}/tags`;
    return this.transport.request({ method: 'DELETE', path, body: { tags }, headers: versionHeadersFor(path) }).then((r) => r.body as { tags: string[] });
  }
}

class CustomFieldsApi {
  constructor(private readonly transport: Transport) {}

  async list(model: 'contact' | 'opportunity' | 'appointment' = 'contact'): Promise<{ customFields: CustomFieldDefinition[] }> {
    const path = '/custom-fields';
    return this.transport.request({ method: 'GET', path, query: { model }, headers: versionHeadersFor(path) }).then((r) => r.body as { customFields: CustomFieldDefinition[] });
  }

  async create(input: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    const path = '/custom-fields';
    return this.transport.request({ method: 'POST', path, body: input, headers: versionHeadersFor(path) }).then((r) => r.body as CustomFieldDefinition);
  }

  async update(id: string, input: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition> {
    const path = `/custom-fields/${id}`;
    return this.transport.request({ method: 'PUT', path, body: input, headers: versionHeadersFor(path) }).then((r) => r.body as CustomFieldDefinition);
  }
}

class CalendarsApi {
  constructor(private readonly transport: Transport) {}

  async list(): Promise<CalendarListResponse> {
    const path = '/calendars';
    return this.transport.request({ method: 'GET', path, headers: versionHeadersFor(path) }).then((r) => r.body as CalendarListResponse);
  }

  async get(id: string): Promise<Calendar> {
    const path = `/calendars/${id}`;
    return this.transport.request({ method: 'GET', path, headers: versionHeadersFor(path) }).then((r) => r.body as Calendar);
  }

  async freeSlots(id: string, query: FreeSlotsQuery): Promise<CalendarSlotsResponse> {
    const path = `/calendars/${id}/free-slots`;
    return this.transport
      .request({
        method: 'GET',
        path,
        query: query as unknown as Record<string, string | number | boolean | string[] | undefined>,
        headers: versionHeadersFor(path),
      })
      .then((r) => r.body as CalendarSlotsResponse);
  }
}

class AppointmentsApi {
  constructor(private readonly transport: Transport) {}

  async list(query: AppointmentListQuery = {}): Promise<AppointmentListResponse> {
    const path = '/calendars/events/appointments';
    return this.transport
      .request({
        method: 'GET',
        path,
        query: query as unknown as Record<string, string | number | boolean | string[] | undefined>,
        headers: versionHeadersFor(path),
      })
      .then((r) => r.body as AppointmentListResponse);
  }

  async create(input: CreateAppointmentInput): Promise<Appointment> {
    const path = '/calendars/events/appointments';
    return this.transport.request({ method: 'POST', path, body: input, headers: versionHeadersFor(path) }).then((r) => r.body as Appointment);
  }

  async get(id: string): Promise<Appointment> {
    const path = `/calendars/events/appointments/${id}`;
    return this.transport.request({ method: 'GET', path, headers: versionHeadersFor(path) }).then((r) => r.body as Appointment);
  }

  async update(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
    const path = `/calendars/events/appointments/${id}`;
    return this.transport.request({ method: 'PUT', path, body: input, headers: versionHeadersFor(path) }).then((r) => r.body as Appointment);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const path = `/calendars/events/appointments/${id}`;
    return this.transport.request({ method: 'DELETE', path, headers: versionHeadersFor(path) }).then((r) => r.body as { success: boolean });
  }

  /** Get booking slots for a contact against a calendar (POST /calendars/events/appointments/slots). */
  async slots(query: AppointmentSlotsQuery): Promise<AppointmentSlotsResponse> {
    const path = '/calendars/events/appointments/slots';
    return this.transport.request({ method: 'POST', path, body: query, headers: versionHeadersFor(path) }).then((r) => r.body as AppointmentSlotsResponse);
  }
}

class WorkflowsApi {
  constructor(private readonly transport: Transport) {}

  async list(): Promise<WorkflowListResponse> {
    const path = '/workflows';
    return this.transport.request({ method: 'GET', path, headers: versionHeadersFor(path) }).then((r) => r.body as WorkflowListResponse);
  }

  async get(id: string): Promise<Workflow> {
    const path = `/workflows/${id}`;
    return this.transport.request({ method: 'GET', path, headers: versionHeadersFor(path) }).then((r) => r.body as Workflow);
  }
}

export type { Calendar, Contact, Workflow };
