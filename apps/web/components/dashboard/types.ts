// Client-safe shapes (mirrors lib/data.ts + lib/automation.ts). Never import the
// server libs from client components.

export interface AutomationRun {
  id: string;
  type: 'qualify' | 'booked' | 'reply' | 'reminder' | 'rebook' | 'reset';
  contactId: string;
  contactName?: string;
  score?: number;
  tier?: string;
  stage?: string;
  calendarId?: string;
  appointmentId?: string;
  message?: string;
  createdAt: string;
}

export interface OutboxMessage {
  id: string;
  to: string;
  name: string;
  channel: 'sms' | 'whatsapp' | 'email';
  body: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
}

export interface DashboardData {
  mode: 'sandbox' | 'live';
  counts: {
    contacts: number;
    newLeads: number;
    booked: number;
    visited: number;
    noShows: number;
    appointmentsToday: number;
    followupsDue: number;
    potentialRevenue: number;
  };
  pipeline: { stage: string; count: number }[];
  calendars: { id: string; name: string }[];
  users: { id: string; firstName: string; lastName: string; role: string; timezone?: string }[];
  appointments: {
    id: string;
    calendarId: string;
    contactId: string;
    title?: string;
    startTime: string;
    endTime: string;
    appointmentStatus?: string;
    assignedUserId?: string;
  }[];
  contacts: {
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    phone?: string;
    email?: string;
    source?: string;
    tags?: string[];
    customFields: { id: string; value: string | number | boolean | string[] | null }[];
  }[];
  runs: AutomationRun[];
  outbox: OutboxMessage[];
  events: {
    type: string;
    id: string;
    createdAt?: string;
    delivered?: boolean;
    deliveryAttempts?: number;
  }[];
  sources: { source: string; count: number }[];
}
