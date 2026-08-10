import { createId } from './ids';
import { defaultSandboxConfig, type SandboxConfig } from './config';
import {
  type Appointment,
  type Calendar,
  type Contact,
  type ContactCustomField,
  type CreateAppointmentInput,
  type CreateContactInput,
  type CustomFieldDefinition,
  type User,
  type WebhookSubscription,
  type Workflow,
} from './domain';
import { generateSlots, conflicts as slotConflicts, legacyToIso, type CalendarSchedule, type BookedWindow } from './schedule';
import { seedIfEmpty, type SeedResult } from './seed';
import type { Store } from './store';
import { WebhookEmitter } from './webhooks';

export interface RouterRequest {
  method: string;
  path: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface RouterResponse {
  status: number;
  body: unknown;
}

export interface SandboxServerOptions {
  store: Store;
  config?: Partial<SandboxConfig>;
  /** When set, every CRM request must carry `Authorization: Bearer <apiKey>`. */
  apiKey?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  autoSeed?: boolean;
}

const ok = (body: unknown, status = 200): RouterResponse => ({ status, body });
const fail = (status: number, message: string, extra?: Record<string, unknown>): RouterResponse => ({
  status,
  body: { message, statusCode: status, ...extra },
});

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * A GoHighLevel-compatible API. Implements the same routes, payload shapes and
 * error codes as the real platform so that `GhlClient` can target either the
 * live API or this sandbox behind the same interface.
 */
export class SandboxServer {
  private readonly config: SandboxConfig;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private readonly emitter: WebhookEmitter;
  private readonly store: Store;
  private seedPromise?: Promise<void>;

  constructor(private readonly opts: SandboxServerOptions) {
    this.store = opts.store;
    this.config = defaultSandboxConfig(opts.config);
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.now = opts.now ?? (() => new Date());
    this.emitter = new WebhookEmitter({ store: this.store, secret: this.config.webhookSecret, fetchImpl: this.fetchImpl });
  }

  async handle(req: RouterRequest): Promise<RouterResponse> {
    if (this.opts.autoSeed !== false) await this.ensureSeeded();
    const { method, path } = req;
    const segments = path.split('/').filter(Boolean);
    const head = segments[0] ?? '';

    if (!this.authorized(req)) return fail(401, 'Unauthorized');

    try {
      switch (head) {
        case 'contacts':
          return await this.handleContacts(method, segments, req);
        case 'custom-fields':
          return await this.handleCustomFields(method, segments, req);
        case 'calendars':
          return await this.handleCalendars(method, segments, req);
        case 'users':
          return await this.handleUsers(method, segments, req);
        case 'workflows':
          return await this.handleWorkflows(method, segments, req);
        case 'webhooks':
          return await this.handleWebhookSubscriptions(method, segments, req);
        case 'sandbox':
          return await this.handleSandbox(method, segments, req);
        default:
          return fail(404, `Not found: ${path}`);
      }
    } catch (err) {
      if (err instanceof ContactNotFound) return fail(404, err.message);
      return fail(500, err instanceof Error ? err.message : 'Internal error');
    }
  }

  private ensureSeeded(): Promise<void> {
    this.seedPromise ??= seedIfEmpty(this.store);
    return this.seedPromise;
  }

  private authorized(req: RouterRequest): boolean {
    if (!this.apiKey) return true;
    const auth = req.headers?.authorization ?? req.headers?.Authorization;
    return auth === `Bearer ${this.apiKey}`;
  }

  /* ------------------------------------------------------------ */
  /* Collections                                                   */
  /* ------------------------------------------------------------ */

  private async contacts(): Promise<Contact[]> {
    return (await this.store.getCollection<Contact>('contacts')) ?? [];
  }
  private async saveContacts(c: Contact[]): Promise<void> {
    await this.store.putCollection('contacts', c);
  }
  private async calendars(): Promise<Calendar[]> {
    return (await this.store.getCollection<Calendar>('calendars')) ?? [];
  }
  private async appointments(): Promise<Appointment[]> {
    return (await this.store.getCollection<Appointment>('appointments')) ?? [];
  }
  private async saveAppointments(a: Appointment[]): Promise<void> {
    await this.store.putCollection('appointments', a);
  }
  private async schedules(): Promise<CalendarSchedule[]> {
    const meta = (await this.store.getCollection<Record<string, unknown>[] >('meta')) ?? [];
    const firstMeta = meta[0] as { schedules?: CalendarSchedule[] } | undefined;
    return firstMeta?.schedules ?? [];
  }
  private async users(): Promise<User[]> {
    return (await this.store.getCollection<User>('users')) ?? [];
  }

  /* ------------------------------------------------------------ */
  /* Contacts                                                      */
  /* ------------------------------------------------------------ */

  private async handleContacts(method: string, segments: string[], req: RouterRequest): Promise<RouterResponse> {
    const sub = segments[1];

    if (sub === 'lookup' && method === 'GET') {
      const all = await this.contacts();
      const email = first(req.query.email)?.toLowerCase();
      const phone = first(req.query.phone);
      const matches = all.filter(
        (c) =>
          (email && c.email?.toLowerCase() === email) ||
          (phone && c.phone && normalizePhone(c.phone) === normalizePhone(phone)),
      );
      return ok({ contacts: matches, count: matches.length });
    }

    if (sub === 'upsert' && method === 'POST') {
      return ok(await this.upsertContact(req.body as CreateContactInput));
    }

    if (segments[2] === 'custom-fields' && method === 'PUT') {
      if (!sub) return fail(404, 'Contact not found');
      const contact = await this.getContactOrFail(sub);
      const body = (req.body ?? {}) as { customFields?: { id?: string; key?: string; value: ContactCustomField['value'] }[] };
      contact.customFields = await this.resolveCustomFields(body.customFields ?? [], contact.customFields);
      await this.saveContacts(await this.replaceContact(contact));
      return ok(contact);
    }

    if (segments[2] === 'tags') {
      if (!sub) return fail(404, 'Contact not found');
      const contact = await this.getContactOrFail(sub);
      const tags = ((req.body as { tags?: string[] })?.tags ?? []) as string[];
      if (method === 'POST') {
        contact.tags = [...new Set([...contact.tags, ...tags])];
        await this.saveContacts(await this.replaceContact(contact));
        await this.emitter.emit('ContactTagAdd', contact.id, { contactId: contact.id, tags });
        return ok({ tags: contact.tags });
      }
      if (method === 'DELETE') {
        contact.tags = contact.tags.filter((t) => !tags.includes(t));
        await this.saveContacts(await this.replaceContact(contact));
        await this.emitter.emit('ContactTagDelete', contact.id, { contactId: contact.id, tags });
        return ok({ tags: contact.tags });
      }
      return fail(405, 'Method not allowed');
    }

    if (sub && method === 'GET') {
      return ok(await this.getContactOrFail(sub));
    }
    if (sub && method === 'PUT') {
      const contact = await this.getContactOrFail(sub);
      await this.applyContactInput(contact, req.body as CreateContactInput);
      contact.dateUpdated = new Date().toISOString();
      await this.saveContacts(await this.replaceContact(contact));
      await this.emitter.emit('ContactUpdated', contact.id, { contactId: contact.id });
      return ok(contact);
    }
    if (sub && method === 'DELETE') {
      const contact = await this.getContactOrFail(sub);
      const all = (await this.contacts()).filter((c) => c.id !== contact.id);
      await this.saveContacts(all);
      await this.emitter.emit('ContactDeleted', contact.id, { contactId: contact.id });
      return ok({ success: true });
    }

    if (method === 'POST') {
      const contact = await this.createContact(req.body as CreateContactInput);
      return ok(contact, 201);
    }

    if (method === 'GET') {
      const all = await this.contacts();
      const q = req.query;
      let rows = all;
      const locationId = first(q.locationId);
      if (locationId) rows = rows.filter((c) => c.locationId === locationId);
      const tags = first(q.tags);
      if (tags) {
        const wanted = tags.split(',').filter(Boolean);
        rows = rows.filter((c) => wanted.every((t) => c.tags.includes(t)));
      }
      const search = first(q.query);
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter((c) =>
          [c.name, c.email, c.phone, ...c.tags].some((v) => v?.toLowerCase().includes(s)),
        );
      }
      const sortBy = first(q.sortBy);
      const sortOrder = first(q.sortOrder) === 'desc' ? -1 : 1;
      if (sortBy) {
        rows = [...rows].sort((a, b) => {
          const av = String(a[sortBy] ?? '');
          const bv = String(b[sortBy] ?? '');
          return av.localeCompare(bv) * sortOrder;
        });
      }
      const page = Number(first(q.page) ?? 1) || 1;
      const pageLimit = Number(first(q.pageLimit) ?? 25) || 25;
      const start = (page - 1) * pageLimit;
      return ok({ contacts: rows.slice(start, start + pageLimit), count: rows.length });
    }

    return fail(405, 'Method not allowed');
  }

  private async getContactOrFail(id: string): Promise<Contact> {
    const contact = (await this.contacts()).find((c) => c.id === id);
    if (!contact) throw new ContactNotFound(id);
    return contact;
  }

  private async replaceContact(updated: Contact): Promise<Contact[]> {
    return (await this.contacts()).map((c) => (c.id === updated.id ? updated : c));
  }

  private async createContact(input: CreateContactInput): Promise<Contact> {
    const contact = this.blankContact();
    await this.applyContactInput(contact, input);
    contact.dateAdded = new Date().toISOString();
    contact.dateUpdated = contact.dateAdded;
    await this.saveContacts([...(await this.contacts()), contact]);
    await this.emitter.emit('ContactCreated', contact.id, { contactId: contact.id });
    return contact;
  }

  private async upsertContact(input: CreateContactInput): Promise<{ contact: Contact; newContact: boolean }> {
    const all = await this.contacts();
    const email = input.email?.toLowerCase();
    const phone = input.phone ? normalizePhone(input.phone) : undefined;
    const existing = all.find(
      (c) =>
        (email && c.email?.toLowerCase() === email) || (phone && c.phone && normalizePhone(c.phone) === phone),
    );
    if (existing) {
      await this.applyContactInput(existing, input);
      existing.dateUpdated = new Date().toISOString();
      await this.saveContacts(await this.replaceContact(existing));
      await this.emitter.emit('ContactUpdated', existing.id, { contactId: existing.id });
      return { contact: existing, newContact: false };
    }
    const contact = await this.createContact(input);
    return { contact, newContact: true };
  }

  private blankContact(): Contact {
    const id = createId('c');
    return {
      id,
      locationId: this.config.locationId,
      tags: [],
      customFields: [],
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    };
  }

  private async applyContactInput(contact: Contact, input: CreateContactInput): Promise<void> {
    if (!input) return;
    const fields = [
      'firstName', 'lastName', 'name', 'email', 'phone', 'address1', 'city', 'state',
      'postalCode', 'country', 'timezone', 'source',
    ] as const;
    for (const f of fields) {
      const value = input[f];
      if (value !== undefined) contact[f] = String(value);
    }
    if (input.tags) contact.tags = [...new Set([...contact.tags, ...input.tags])];
    if (input.customFields) {
      contact.customFields = await this.resolveCustomFields(input.customFields, contact.customFields);
    }
  }

  private async resolveCustomFields(
    incoming: { id?: string; key?: string; value: ContactCustomField['value'] }[],
    current: ContactCustomField[],
  ): Promise<ContactCustomField[]> {
    const defs = (await this.store.getCollection<CustomFieldDefinition>('customFields')) ?? [];
    const out = [...current];
    for (const inc of incoming) {
      const def = inc.id ? defs.find((d) => d.id === inc.id) : defs.find((d) => d.fieldKey === inc.key);
      if (!def) continue;
      const idx = out.findIndex((f) => f.id === def.id);
      const coerced = coerceValue(def, inc.value);
      const entry = { id: def.id, value: coerced };
      if (idx >= 0) out[idx] = entry;
      else out.push(entry);
    }
    return out;
  }

  /* ------------------------------------------------------------ */
  /* Custom fields                                                 */
  /* ------------------------------------------------------------ */

  private async handleCustomFields(method: string, segments: string[], req: RouterRequest): Promise<RouterResponse> {
    const defs = (await this.store.getCollection<CustomFieldDefinition>('customFields')) ?? [];
    if (method === 'GET' && !segments[1]) {
      const model = first(req.query.model) ?? 'contact';
      return ok({ customFields: defs.filter((d) => d.model === model) });
    }
    if (method === 'POST' && !segments[1]) {
      const input = req.body as Partial<CustomFieldDefinition>;
      const def: CustomFieldDefinition = {
        id: createId('cf'),
        locationId: this.config.locationId,
        name: input.name ?? 'Untitled',
        fieldKey: input.fieldKey ?? `field_${createId('')}`,
        dataType: input.dataType ?? 'TEXT',
        model: input.model ?? 'contact',
        isRequired: input.isRequired ?? false,
        isUnique: input.isUnique ?? false,
        options: input.options,
        createdAt: new Date().toISOString(),
      };
      await this.store.putCollection('customFields', [...defs, def]);
      return ok(def, 201);
    }
    if (segments[1] && method === 'PUT') {
      const idx = defs.findIndex((d) => d.id === segments[1]);
      if (idx < 0) return fail(404, 'Custom field not found');
      const input = req.body as Partial<CustomFieldDefinition>;
      const updated: CustomFieldDefinition = { ...defs[idx]!, ...input, id: segments[1]! };
      defs[idx] = updated;
      await this.store.putCollection('customFields', defs);
      return ok(updated);
    }
    return fail(405, 'Method not allowed');
  }

  /* ------------------------------------------------------------ */
  /* Calendars + appointments                                      */
  /* ------------------------------------------------------------ */

  private async handleCalendars(method: string, segments: string[], req: RouterRequest): Promise<RouterResponse> {
    const all = await this.calendars();
    const sub = segments[1];

    if (!sub && method === 'GET') return ok({ calendars: all });

    if (sub && method === 'GET' && segments[2] === 'free-slots') {
      const calendar = all.find((c) => c.id === sub);
      if (!calendar) return fail(404, 'Calendar not found');
      const schedule = (await this.schedules()).find((s) => s.calendarId === sub);
      if (!schedule) return fail(404, 'Calendar has no schedule configured');
      const startDate = first(req.query.startDate);
      const endDate = first(req.query.endDate);
      const timezone = first(req.query.timezone) ?? schedule.timezone;
      if (!startDate || !endDate) return fail(400, 'startDate and endDate are required');
      const booked = await this.bookedForCalendar(sub);
      const slots = generateSlots({
        schedule,
        startDate,
        endDate,
        timezone,
        now: this.now(),
        booked,
      });
      return ok(slots.slots);
    }

    if (sub === 'events' && segments[2] === 'appointments') {
      const apptId = segments[3];
      if (apptId === 'slots' && method === 'POST') {
        const body = req.body as { contactId?: string; calendarId?: string; startDate?: string; endDate?: string; timezone?: string };
        if (!body.calendarId) return fail(400, 'calendarId is required');
        const schedule = (await this.schedules()).find((s) => s.calendarId === body.calendarId);
        if (!schedule) return fail(404, 'Calendar has no schedule configured');
        const startDate = body.startDate ?? toDateKey(this.now(), schedule.timezone);
        const endDate = body.endDate ?? toDateKey(addDays(this.now(), 14), schedule.timezone);
        const booked = await this.bookedForCalendar(body.calendarId);
        const generated = generateSlots({
          schedule,
          startDate,
          endDate,
          timezone: body.timezone ?? schedule.timezone,
          now: this.now(),
          booked,
        });
        const slots = Object.values(generated.slots)
          .flatMap((d) => d.slots)
          .slice(0, 20)
          .map((startTime) => ({
            startTime,
            endTime: new Date(new Date(startTime).getTime() + schedule.appointmentDurationMinutes * 60000).toISOString(),
          }));
        return ok({ timezone: body.timezone ?? schedule.timezone, slots });
      }

      if (apptId && method === 'GET') {
        const appt = (await this.appointments()).find((a) => a.id === apptId);
        if (!appt) return fail(404, 'Appointment not found');
        return ok(appt);
      }
      if (apptId && method === 'PUT') {
        return this.updateAppointment(apptId, req.body as Partial<CreateAppointmentInput>);
      }
      if (apptId && method === 'DELETE') {
        const allAppts = await this.appointments();
        const appt = allAppts.find((a) => a.id === apptId);
        if (!appt) return fail(404, 'Appointment not found');
        await this.saveAppointments(allAppts.filter((a) => a.id !== appt.id));
        await this.emitter.emit('AppointmentCancelled', appt.id, { appointmentId: appt.id });
        return ok({ success: true });
      }

      if (method === 'POST') {
        return this.createAppointment(req.body as CreateAppointmentInput);
      }

      if (method === 'GET') {
        let rows = await this.appointments();
        const q = req.query;
        const locationId = first(q.locationId);
        if (locationId) rows = rows.filter((a) => a.locationId === locationId);
        const calendarId = first(q.calendarId);
        if (calendarId) rows = rows.filter((a) => a.calendarId === calendarId);
        const contactId = first(q.contactId);
        if (contactId) rows = rows.filter((a) => a.contactId === contactId);
        const status = first(q.status);
        if (status) rows = rows.filter((a) => a.appointmentStatus === status);
        const start = first(q.startTime);
        if (start) rows = rows.filter((a) => new Date(a.startTime) >= new Date(start));
        const end = first(q.endTime);
        if (end) rows = rows.filter((a) => new Date(a.startTime) <= new Date(end));
        rows = rows.sort((a, b) => a.startTime.localeCompare(b.startTime));
        const page = Number(first(q.page) ?? 1) || 1;
        const pageLimit = Number(first(q.pageLimit) ?? 25) || 25;
        const startIdx = (page - 1) * pageLimit;
        return ok({ events: rows.slice(startIdx, startIdx + pageLimit) });
      }
    }

    if (sub && method === 'GET') {
      const calendar = all.find((c) => c.id === sub);
      if (!calendar) return fail(404, 'Calendar not found');
      return ok(calendar);
    }

    return fail(405, 'Method not allowed');
  }

  private async createAppointment(input: CreateAppointmentInput): Promise<RouterResponse> {
    if (!input.calendarId || !input.contactId || !input.startTime) {
      return fail(400, 'calendarId, contactId and startTime are required');
    }
    const schedule = (await this.schedules()).find((s) => s.calendarId === input.calendarId);
    if (!schedule) return fail(404, 'Calendar has no schedule configured');
    const start = new Date(input.startTime);
    const duration = input.endTime
      ? Math.round((new Date(input.endTime).getTime() - start.getTime()) / 60000)
      : schedule.appointmentDurationMinutes;
    const end = new Date(start.getTime() + duration * 60000);

    if (start < this.now()) return fail(409, 'Cannot book an appointment in the past');

    const booked = await this.bookedForCalendar(input.calendarId);
    const conflicts = slotConflicts(start, end, schedule, booked);
    if (conflicts) {
      return fail(409, 'This slot is no longer available — the calendar has a conflict');
    }

    const calendar = (await this.calendars()).find((c) => c.id === input.calendarId);
    const appointment: Appointment = {
      id: createId('app'),
      calendarId: input.calendarId,
      locationId: this.config.locationId,
      contactId: input.contactId,
      title: input.title ?? calendar?.name ?? 'Appointment',
      appointmentStatus: input.appointmentStatus ?? 'booked',
      status: input.appointmentStatus ?? 'booked',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timezone: schedule.timezone,
      assignedUserId: input.assignedUserId ?? calendar?.users?.[0],
      notes: input.notes,
      dateAdded: new Date().toISOString(),
      dateUpdated: new Date().toISOString(),
    };
    await this.saveAppointments([...(await this.appointments()), appointment]);

    const contact = (await this.contacts()).find((c) => c.id === input.contactId);
    await this.emitter.emit('AppointmentBooked', appointment.id, {
      appointmentId: appointment.id,
      contactId: input.contactId,
      calendarId: input.calendarId,
      startTime: appointment.startTime,
      contact: contact ? { firstName: contact.firstName, lastName: contact.lastName, phone: contact.phone, email: contact.email } : undefined,
    });
    return ok(appointment, 201);
  }

  private async updateAppointment(id: string, input: Partial<CreateAppointmentInput>): Promise<RouterResponse> {
    const all = await this.appointments();
    const idx = all.findIndex((a) => a.id === id);
    if (idx < 0) return fail(404, 'Appointment not found');
    const prevStatus = all[idx]!.appointmentStatus;
    const updated: Appointment = { ...all[idx]! };
    if (input.title !== undefined) updated.title = input.title;
    if (input.notes !== undefined) updated.notes = input.notes;
    if (input.appointmentStatus !== undefined) updated.appointmentStatus = input.appointmentStatus;
    if (input.assignedUserId !== undefined) updated.assignedUserId = input.assignedUserId;
    if (input.startTime) {
      const start = new Date(input.startTime);
      const duration = input.endTime
        ? Math.round((new Date(input.endTime).getTime() - start.getTime()) / 60000)
        : Math.round((new Date(updated.endTime).getTime() - new Date(updated.startTime).getTime()) / 60000);
      updated.startTime = start.toISOString();
      updated.endTime = new Date(start.getTime() + duration * 60000).toISOString();
    }
    updated.dateUpdated = new Date().toISOString();
    all[idx] = updated;
    await this.saveAppointments(all);
    if (prevStatus !== updated.appointmentStatus) {
      await this.emitter.emit('AppointmentStatusChanged', id, {
        appointmentId: id,
        previousStatus: prevStatus,
        newStatus: updated.appointmentStatus,
      });
    } else {
      await this.emitter.emit('AppointmentUpdated', id, { appointmentId: id });
    }
    return ok(updated);
  }

  /**
   * Every appointment on the target calendar OR on a sibling calendar that
   * shares a doctor — a doctor cannot be double-booked across their calendars.
   */
  private async bookedForCalendar(calendarId: string): Promise<BookedWindow[]> {
    const calendar = (await this.calendars()).find((c) => c.id === calendarId);
    if (!calendar) return [];
    const siblings = (await this.calendars()).filter(
      (c) => c.id !== calendarId && c.isActive && (c.users ?? []).some((u) => (calendar.users ?? []).includes(u)),
    );
    const ids = new Set([calendarId, ...siblings.map((c) => c.id)]);
    return (await this.appointments())
      .filter((a) => ids.has(a.calendarId) && a.appointmentStatus !== 'cancelled' && a.appointmentStatus !== 'no-show')
      .map((a) => ({ start: new Date(a.startTime), end: new Date(a.endTime) }));
  }

  /* ------------------------------------------------------------ */
  /* Users / workflows / webhooks / sandbox                        */
  /* ------------------------------------------------------------ */

  private async handleUsers(method: string, segments: string[], req: RouterRequest): Promise<RouterResponse> {
    const users = await this.users();
    if (method === 'GET' && !segments[1]) return ok({ users });
    if (method === 'GET' && segments[1]) {
      const user = users.find((u) => u.id === segments[1]);
      if (!user) return fail(404, 'User not found');
      return ok(user);
    }
    return fail(405, 'Method not allowed');
  }

  private async handleWorkflows(method: string, segments: string[], _req: RouterRequest): Promise<RouterResponse> {
    const workflows = (await this.store.getCollection<Workflow>('workflows')) ?? [];
    if (method === 'GET' && !segments[1]) return ok({ workflows });
    if (method === 'GET' && segments[1]) {
      const wf = workflows.find((w) => w.id === segments[1]);
      if (!wf) return fail(404, 'Workflow not found');
      return ok(wf);
    }
    return fail(405, 'Method not allowed');
  }

  private async handleWebhookSubscriptions(method: string, segments: string[], req: RouterRequest): Promise<RouterResponse> {
    const subs = (await this.store.getCollection<WebhookSubscription>('webhooks')) ?? [];
    if (method === 'GET' && !segments[1]) return ok({ webhooks: subs });
    if (method === 'POST' && !segments[1]) {
      const body = req.body as Partial<WebhookSubscription>;
      if (!body.url || !Array.isArray(body.eventTypes) || body.eventTypes.length === 0) {
        return fail(400, 'url and eventTypes are required');
      }
      const sub: WebhookSubscription = {
        id: createId('wh'),
        url: body.url,
        enabled: body.enabled ?? true,
        eventTypes: body.eventTypes,
        createdAt: new Date().toISOString(),
      };
      await this.store.putCollection('webhooks', [...subs, sub]);
      return ok(sub, 201);
    }
    if (segments[1] && method === 'DELETE') {
      await this.store.putCollection('webhooks', subs.filter((s) => s.id !== segments[1]));
      return ok({ success: true });
    }
    return fail(405, 'Method not allowed');
  }

  private async handleSandbox(method: string, segments: string[], _req: RouterRequest): Promise<RouterResponse> {
    if (segments[1] === 'events' && method === 'GET') {
      const events = (await this.store.getCollection('events')) ?? [];
      return ok({ events });
    }
    if (segments[1] === 'reset' && method === 'POST') {
      await this.forceSeed();
      return ok({ success: true });
    }
    if (segments[1] === 'seed' && method === 'POST') {
      await this.forceSeed();
      return ok({ success: true });
    }
    return fail(404, 'Not found');
  }

  private async forceSeed(): Promise<void> {
    const seed = (await import('./seed')).buildSeedData() as SeedResult;
    for (const [name, rows] of Object.entries(seed.collections)) {
      await this.store.putCollection(name, rows as never[]);
    }
    await this.store.putCollection('meta', [
      { schedules: seed.schedules, seededAt: seed.seededAt, version: 1 },
    ]);
  }
}

/* ------------------------------------------------------------ */
/* Helpers                                                       */
/* ------------------------------------------------------------ */

export class ContactNotFound extends Error {
  constructor(id: string) {
    super(`Contact not found: ${id}`);
    this.name = 'ContactNotFound';
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function coerceValue(def: CustomFieldDefinition, value: unknown): ContactCustomField['value'] {
  if (value === null || value === undefined) return null;
  if (def.dataType === 'NUMBER') {
    const n = Number(value);
    return Number.isFinite(n) ? n : value as number;
  }
  if (def.dataType === 'DATE_TIME' || def.dataType === 'DATE') {
    return legacyToIso(String(value));
  }
  if (def.dataType === 'MULTIPLE_OPTIONS') {
    return Array.isArray(value) ? value.map(String) : String(value).split(',').map((s) => s.trim());
  }
  return String(value);
}

function toDateKey(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const read = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
