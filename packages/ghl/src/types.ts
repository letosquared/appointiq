/**
 * GoHighLevel v2 API payload shapes.
 *
 * These types are the single source of truth for the GHL contract in this
 * project. Both the live client (`client.ts`) and the GHL-compatible sandbox
 * (`@appointiq/sandbox`) share them, so the contract cannot drift between
 * the real platform and the demo.
 *
 * Field names and shapes mirror the official HighLevel API v2 docs
 * (marketplace.gohighlevel.com/docs).
 */

export type IsoDate = string;
export type IsoDateTime = string;

/** A contact custom field as it appears on a Contact (value can be string or array). */
export interface ContactCustomField {
  id: string;
  value: string | number | boolean | string[] | null;
}

/** Custom field definition (GET/POST /custom-fields). */
export interface CustomFieldDefinition {
  id: string;
  locationId: string;
  name: string;
  fieldKey: string;
  dataType:
    | 'TEXT'
    | 'NUMBER'
    | 'DATE'
    | 'DATE_TIME'
    | 'PHONE'
    | 'EMAIL'
    | 'SINGLE_OPTIONS'
    | 'MULTIPLE_OPTIONS'
    | 'GENDER'
    | 'TIME';
  model: 'contact' | 'opportunity' | 'appointment';
  isRequired: boolean;
  isUnique: boolean;
  isHidden?: boolean;
  position?: number;
  options?: { label: string; value: string }[];
  createdAt?: IsoDateTime;
  updatedAt?: IsoDateTime;
}

/** A contact in the CRM. */
export interface Contact {
  id: string;
  locationId: string;
  businessId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  source?: string;
  country?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  tags: string[];
  customFields: ContactCustomField[];
  dnd?: boolean;
  type?: string;
  dateAdded?: IsoDateTime;
  dateUpdated?: IsoDateTime;
  attributions?: unknown[];
  [key: string]: unknown;
}

/** Payload used when creating/updating a contact. */
export interface CreateContactInput {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  source?: string;
  tags?: string[];
  customFields?: (
    | { id: string; value: string | number | boolean | string[] | null }
    | { key: string; value: string | number | boolean | string[] | null }
  )[];
}

export interface ContactListQuery {
  locationId?: string;
  query?: string;
  tags?: string;
  page?: number;
  pageLimit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactListResponse {
  contacts: Contact[];
  count: number;
  hasMore?: boolean;
}

export interface ContactLookupResponse {
  contacts: Contact[];
  count: number;
}

export interface ContactUpsertResponse {
  contact: Contact;
  newContact: boolean;
  wasDeleted?: boolean;
}

/** Calendar (GET /calendars). */
export interface Calendar {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  groupId?: string;
  groupName?: string;
  widgetId?: string;
  users?: string[];
  teamMembers?: string[];
  eventType?: string;
}

export interface CalendarListResponse {
  calendars: Calendar[];
}

/**
 * A day keyed set of available slots.
 * Response shape of GET /calendars/{calendarId}/free-slots:
 * `{ _dates_: { slots: string[] } }` — see CalendarSlotsResponse.
 */
export interface CalendarSlots {
  slots: string[];
}

export type CalendarSlotsResponse = Record<string, CalendarSlots>;

export interface FreeSlotsQuery {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  timezone: string;
  enableLookedBusy?: boolean;
}

/** Appointment / calendar event (POST /calendars/events, GET /calendars/events). */
export type AppointmentStatus =
  | 'booked'
  | 'blocked'
  | 'cancelled'
  | 'confirmed'
  | 'no-show'
  | 'completed';

export interface Appointment {
  id: string;
  calendarId: string;
  locationId: string;
  contactId: string;
  contact?: Pick<Contact, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>;
  title: string;
  appointmentStatus: AppointmentStatus;
  status?: AppointmentStatus;
  startTime: string;
  endTime: string;
  timezone?: string;
  assignedUserId?: string;
  notes?: string;
  dateAdded?: IsoDateTime;
  dateUpdated?: IsoDateTime;
}

export interface CreateAppointmentInput {
  calendarId: string;
  locationId: string;
  contactId: string;
  startTime: string; // ISO datetime
  /** Optional — when omitted the sandbox derives it from the schedule duration. */
  endTime?: string;
  title?: string;
  notes?: string;
  assignedUserId?: string;
  appointmentStatus?: AppointmentStatus;
  toNotify?: boolean;
  ignoreDateRange?: boolean;
}

export interface UpdateAppointmentInput {
  title?: string;
  notes?: string;
  appointmentStatus?: AppointmentStatus;
  assignedUserId?: string;
}

export interface AppointmentListQuery {
  calendarId?: string;
  contactId?: string;
  startTime?: string;
  endTime?: string;
  userId?: string;
  groupId?: string;
  locationId?: string;
  status?: string;
  page?: number;
  pageLimit?: number;
}

export interface AppointmentListResponse {
  events: Appointment[];
  total?: number;
}

export interface AppointmentSlotsQuery {
  contactId: string;
  calendarId: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export interface AppointmentSlotsResponse {
  timezone?: string;
  slots: { startTime: string; endTime: string }[];
}

/** Workflow (GET /workflows). */
export interface Workflow {
  id: string;
  locationId: string;
  name: string;
  status: 'active' | 'inactive' | 'draft' | 'trash';
  type: string;
  triggerType?: string;
  dateAdded?: IsoDateTime;
  dateUpdated?: IsoDateTime;
}

export interface WorkflowListResponse {
  workflows: Workflow[];
}

/** Outbound webhook events — what HighLevel posts to a configured webhook URL. */
export type WebhookEventType =
  | 'ContactCreated'
  | 'ContactUpdated'
  | 'ContactDeleted'
  | 'ContactTagAdd'
  | 'ContactTagDelete'
  | 'ContactCustomFieldUpdate'
  | 'AppointmentBooked'
  | 'AppointmentUpdated'
  | 'AppointmentCancelled'
  | 'AppointmentStatusChanged'
  | 'CalendarEventStatusChanged';

export interface WebhookEnvelope {
  type: WebhookEventType;
  locationId: string;
  instanceId?: string;
  id: string; // the entity id
  data?: Record<string, unknown>;
  /** When the event was generated (ISO). Sandbox-only convenience. */
  createdAt?: IsoDateTime;
  /** HMAC signature (sandbox + real GHL when configured). */
  signature?: string;
  /** Delivery attempts so far (sandbox-only). */
  deliveryAttempts?: number;
  /** Timestamp of the last delivery attempt (sandbox-only). */
  lastAttemptAt?: IsoDateTime;
  /** True once delivered to a subscribed webhook URL (sandbox-only). */
  delivered?: boolean;
}

/** A webhook subscription in the sandbox (mirrors GHL's Settings > Webhooks). */
export interface WebhookSubscription {
  id: string;
  url: string;
  enabled: boolean;
  eventTypes: WebhookEventType[];
  createdAt: IsoDateTime;
}
