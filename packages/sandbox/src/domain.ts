/**
 * Sandbox domain model. Re-exports the GHL contract types and adds the few
 * extras the sandbox needs (users, schedules, meta) that the public API
 * does not fully model.
 */

export type {
  Appointment,
  AppointmentListResponse,
  AppointmentSlotsQuery,
  AppointmentSlotsResponse,
  AppointmentStatus,
  Calendar,
  CalendarListResponse,
  CalendarSlotsResponse,
  Contact,
  ContactCustomField,
  ContactListQuery,
  ContactListResponse,
  ContactLookupResponse,
  ContactUpsertResponse,
  CreateAppointmentInput,
  CreateContactInput,
  CustomFieldDefinition,
  FreeSlotsQuery,
  IsoDate,
  IsoDateTime,
  UpdateAppointmentInput,
  WebhookEnvelope,
  WebhookEventType,
  WebhookSubscription,
  Workflow,
  WorkflowListResponse,
} from '@appointiq/ghl';

export interface User {
  id: string;
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'admin' | 'doctor' | 'staff' | 'user';
  isAdmin: boolean;
  timezone: string;
}

/** Sandbox-only bookkeeping stored in the `meta` collection. */
export interface SandboxMeta {
  version: number;
  seededAt: string;
  schedules: import('./schedule').CalendarSchedule[];
  /** Sub-account level settings. */
  settings: {
    timezone: string;
    businessHoursMessage: string;
  };
}
