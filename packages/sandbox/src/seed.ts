import type {
  Appointment,
  Calendar,
  Contact,
  CustomFieldDefinition,
  User,
  WebhookSubscription,
  Workflow,
} from './domain';
import type { CalendarSchedule } from './schedule';
import type { Store } from './store';

/**
 * Seed data for the demo location — Mercy Medical Centre, Nairobi.
 *
 * Content mirrors the real clinic (mercymedicalcentre.co.ke): OB/GYN practice
 * with Dr. Wahome Ngare, Dr. G.P. Mwangi and Dr. Martin Mutua, serving antenatal
 * care, infertility, gynaecology, wellness, childbirth classes and family planning
 * to Nairobi patients paying by insurance or M-Pesa.
 *
 * Appointments are generated relative to "now" so the demo always looks alive.
 */

const LOCATION_ID = 'xK9sJh2DpQ4mN7vZ';
const NOW = Date.now();
const DAY = 86_400_000;

/**
 * Build a timestamp `daysFromNow` days ahead at hh:mm in the clinic timezone
 * (UTC+03:00 Nairobi), returned as UTC ISO. The local wall-clock time is what
 * matters — the UTC instant is derived from it, not the other way around.
 */
function iso(daysFromNow: number, hh = 9, mm = 0, tzOffsetMinutes = 180): string {
  const dayStart = new Date(NOW + daysFromNow * DAY);
  dayStart.setUTCHours(0, 0, 0, 0);
  const localMinutes = hh * 60 + mm - tzOffsetMinutes;
  return new Date(dayStart.getTime() + localMinutes * 60_000).toISOString();
}

export const users: User[] = [
  {
    id: 'u_dr_wahome',
    locationId: LOCATION_ID,
    firstName: 'Wahome',
    lastName: 'Ngare',
    email: 'dr.ngare@mercymedicalcentre.co.ke',
    phone: '+254733370022',
    role: 'doctor',
    isAdmin: false,
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'u_dr_mwangi',
    locationId: LOCATION_ID,
    firstName: 'G.P.',
    lastName: 'Mwangi',
    email: 'dr.mwangi@mercymedicalcentre.co.ke',
    phone: '+254733370022',
    role: 'doctor',
    isAdmin: false,
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'u_dr_mutua',
    locationId: LOCATION_ID,
    firstName: 'Martin',
    lastName: 'Mutua',
    email: 'dr.mutua@mercymedicalcentre.co.ke',
    phone: '+254733370022',
    role: 'doctor',
    isAdmin: false,
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'u_director_wahome',
    locationId: LOCATION_ID,
    firstName: 'Mercy',
    lastName: 'Wahome',
    email: 'director@mercymedicalcentre.co.ke',
    phone: '+254729370022',
    role: 'admin',
    isAdmin: true,
    timezone: 'Africa/Nairobi',
  },
];

export const calendars: Calendar[] = [
  {
    id: 'cal_antenatal_mwangi',
    locationId: LOCATION_ID,
    name: 'Antenatal Care — Dr. Mwangi',
    slug: 'antenatal-dr-mwangi',
    description: 'Routine and high-risk antenatal care, obstetric scans and prenatal counselling.',
    isActive: true,
    groupName: 'Obstetrics',
    users: ['u_dr_mwangi'],
    teamMembers: ['u_dr_mwangi'],
    eventType: 'eventType_antenatal',
  },
  {
    id: 'cal_gynae_mwangi',
    locationId: LOCATION_ID,
    name: 'Gynaecology — Dr. Mwangi',
    slug: 'gynaecology-dr-mwangi',
    description: 'Uterine fibroids, menstrual disorders, STD screening, pap smears and minor surgery consults.',
    isActive: true,
    groupName: 'Gynaecology',
    users: ['u_dr_mwangi'],
    teamMembers: ['u_dr_mwangi'],
    eventType: 'eventType_gynae',
  },
  {
    id: 'cal_infertility_wahome',
    locationId: LOCATION_ID,
    name: 'Infertility Consult — Dr. Wahome Ngare',
    slug: 'infertility-dr-wahome',
    description: 'Fertility awareness, male and female factor evaluation, and treatment planning.',
    isActive: true,
    groupName: 'Reproductive Health',
    users: ['u_dr_wahome'],
    teamMembers: ['u_dr_wahome'],
    eventType: 'eventType_infertility',
  },
  {
    id: 'cal_obstetrics_wahome',
    locationId: LOCATION_ID,
    name: 'Obstetrics — Dr. Wahome Ngare',
    slug: 'obstetrics-dr-wahome',
    description: 'Routine and high-risk prenatal care, obstetric scans and postpartum follow-up.',
    isActive: true,
    groupName: 'Obstetrics',
    users: ['u_dr_wahome'],
    teamMembers: ['u_dr_wahome'],
    eventType: 'eventType_obstetrics',
  },
  {
    id: 'cal_gynae_mutua',
    locationId: LOCATION_ID,
    name: 'General Gynaecology — Dr. Mutua',
    slug: 'general-gynaecology-dr-mutua',
    description: 'General gynaecological consultations and wellness screenings.',
    isActive: true,
    groupName: 'Gynaecology',
    users: ['u_dr_mutua'],
    teamMembers: ['u_dr_mutua'],
    eventType: 'eventType_gynae',
  },
  {
    id: 'cal_childbirth_mutua',
    locationId: LOCATION_ID,
    name: 'Childbirth Preparation Class — Dr. Mutua',
    slug: 'childbirth-class-dr-mutua',
    description: 'Pregnancy health, Lamaze techniques, doula support, breastfeeding and newborn care.',
    isActive: true,
    groupName: 'Parenting',
    users: ['u_dr_mutua'],
    teamMembers: ['u_dr_mutua'],
    eventType: 'eventType_childbirth',
  },
  {
    id: 'cal_wellness_clinic',
    locationId: LOCATION_ID,
    name: 'Women’s Wellness Clinic',
    slug: 'womens-wellness-clinic',
    description: 'Health screening and preventive gynaecological care with the full OB/GYN team.',
    isActive: true,
    groupName: 'Wellness',
    users: ['u_dr_wahome', 'u_dr_mwangi', 'u_dr_mutua'],
    teamMembers: ['u_dr_wahome', 'u_dr_mwangi', 'u_dr_mutua'],
    eventType: 'eventType_wellness',
  },
  {
    id: 'cal_family_planning',
    locationId: LOCATION_ID,
    name: 'Family Planning Consult',
    slug: 'family-planning',
    description: 'Family planning consultations and counselling.',
    isActive: true,
    groupName: 'Wellness',
    users: ['u_dr_mutua'],
    teamMembers: ['u_dr_mutua'],
    eventType: 'eventType_family',
  },
];

export const schedules: CalendarSchedule[] = [
  {
    calendarId: 'cal_antenatal_mwangi',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 30,
    appointmentDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
  {
    calendarId: 'cal_gynae_mwangi',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 30,
    appointmentDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
  {
    calendarId: 'cal_infertility_wahome',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 45,
    appointmentDurationMinutes: 45,
    bufferMinutes: 15,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
  {
    calendarId: 'cal_obstetrics_wahome',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 30,
    appointmentDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
  {
    calendarId: 'cal_gynae_mutua',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 30,
    appointmentDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
  {
    calendarId: 'cal_childbirth_mutua',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 60,
    appointmentDurationMinutes: 60,
    bufferMinutes: 15,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 4, 5], start: '09:00', end: '16:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
  {
    calendarId: 'cal_wellness_clinic',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 45,
    appointmentDurationMinutes: 45,
    bufferMinutes: 15,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '09:00', end: '16:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
  {
    calendarId: 'cal_family_planning',
    timezone: 'Africa/Nairobi',
    slotIntervalMinutes: 30,
    appointmentDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeHours: 2,
    workingHours: [
      { days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
      { days: [6], start: '09:00', end: '12:00' },
    ],
    blockedSlots: [],
  },
];

export const customFields: CustomFieldDefinition[] = [
  {
    id: 'cf_lead_score',
    locationId: LOCATION_ID,
    name: 'Lead Score',
    fieldKey: 'lead_score',
    dataType: 'NUMBER',
    model: 'contact',
    isRequired: false,
    isUnique: false,
  },
  {
    id: 'cf_lead_stage',
    locationId: LOCATION_ID,
    name: 'Lead Stage',
    fieldKey: 'lead_stage',
    dataType: 'SINGLE_OPTIONS',
    model: 'contact',
    isRequired: false,
    isUnique: false,
    options: ['New', 'Contacted', 'Qualified', 'Booked', 'Visited', 'No-show', 'Disqualified'].map(
      (label) => ({ label, value: label }),
    ),
  },
  {
    id: 'cf_treatment_interest',
    locationId: LOCATION_ID,
    name: 'Treatment Interest',
    fieldKey: 'treatment_interest',
    dataType: 'SINGLE_OPTIONS',
    model: 'contact',
    isRequired: false,
    isUnique: false,
    options: [
      'Antenatal Care',
      'Gynaecology',
      'Infertility',
      'Wellness Clinic',
      'Childbirth Class',
      'Family Planning',
    ].map((label) => ({ label, value: label })),
  },
  {
    id: 'cf_urgency',
    locationId: LOCATION_ID,
    name: 'Urgency',
    fieldKey: 'urgency',
    dataType: 'SINGLE_OPTIONS',
    model: 'contact',
    isRequired: false,
    isUnique: false,
    options: ['Immediate', 'This week', 'This month', 'Planning ahead'].map((label) => ({
      label,
      value: label,
    })),
  },
  {
    id: 'cf_lead_source',
    locationId: LOCATION_ID,
    name: 'Lead Source',
    fieldKey: 'lead_source',
    dataType: 'TEXT',
    model: 'contact',
    isRequired: false,
    isUnique: false,
  },
  {
    id: 'cf_insurance_provider',
    locationId: LOCATION_ID,
    name: 'Insurance Provider',
    fieldKey: 'insurance_provider',
    dataType: 'TEXT',
    model: 'contact',
    isRequired: false,
    isUnique: false,
  },
  {
    id: 'cf_whatsapp',
    locationId: LOCATION_ID,
    name: 'WhatsApp',
    fieldKey: 'whatsapp',
    dataType: 'PHONE',
    model: 'contact',
    isRequired: false,
    isUnique: false,
  },
  {
    id: 'cf_estimated_value',
    locationId: LOCATION_ID,
    name: 'Estimated Value (KSh)',
    fieldKey: 'estimated_value',
    dataType: 'NUMBER',
    model: 'contact',
    isRequired: false,
    isUnique: false,
  },
  {
    id: 'cf_followup_due',
    locationId: LOCATION_ID,
    name: 'Follow-up Due',
    fieldKey: 'followup_due',
    dataType: 'DATE_TIME',
    model: 'contact',
    isRequired: false,
    isUnique: false,
  },
];

const cf = (id: string, value: string | number | boolean | string[] | null) => ({ id, value });

function lead(
  id: string,
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    source: string;
    interest: string;
    stage: string;
    score: number;
    urgency?: string;
    insurance?: string;
    whatsapp?: string;
    value?: number;
    addedDaysAgo: number;
    tags?: string[];
  },
): Contact {
  const interest = data.interest;
  return {
    id,
    locationId: LOCATION_ID,
    firstName: data.firstName,
    lastName: data.lastName,
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
    phone: data.phone,
    country: 'KE',
    timezone: 'Africa/Nairobi',
    source: data.source,
    tags: data.tags ?? ['lead'],
    customFields: [
      cf('cf_lead_score', data.score),
      cf('cf_lead_stage', data.stage),
      cf('cf_treatment_interest', interest),
      cf('cf_urgency', data.urgency ?? 'This month'),
      cf('cf_lead_source', data.source),
      cf('cf_insurance_provider', data.insurance ?? ''),
      cf('cf_whatsapp', data.whatsapp ?? data.phone),
      cf('cf_estimated_value', data.value ?? 0),
      cf('cf_followup_due', ''),
    ],
    dateAdded: iso(-data.addedDaysAgo, 8 + (Number(id.slice(-1)) % 6), 15),
    dateUpdated: iso(-1, 17, 30),
  };
}

export const contacts: Contact[] = [
  lead('c_001', {
    firstName: 'Achieng',
    lastName: 'Otieno',
    phone: '+254712345601',
    email: 'achieng.otieno@gmail.com',
    source: 'Google Ads',
    interest: 'Antenatal Care',
    stage: 'Booked',
    score: 92,
    urgency: 'Immediate',
    insurance: 'Jubilee',
    value: 18500,
    addedDaysAgo: 4,
    tags: ['lead', 'google-ads', 'hot-lead'],
  }),
  lead('c_002', {
    firstName: 'Wanjiku',
    lastName: 'Njoroge',
    phone: '+254712345602',
    email: 'wanjiku.njoroge@yahoo.com',
    source: 'Facebook',
    interest: 'Infertility',
    stage: 'Qualified',
    score: 78,
    urgency: 'This month',
    insurance: '',
    value: 45000,
    addedDaysAgo: 2,
    tags: ['lead', 'facebook'],
  }),
  lead('c_003', {
    firstName: 'Mary',
    lastName: 'Wambui',
    phone: '+254712345603',
    source: 'WhatsApp',
    interest: 'Gynaecology',
    stage: 'Contacted',
    score: 64,
    urgency: 'This week',
    insurance: 'Madison',
    value: 12000,
    addedDaysAgo: 1,
    tags: ['lead', 'whatsapp'],
  }),
  lead('c_004', {
    firstName: 'Naomi',
    lastName: 'Chebet',
    phone: '+254712345604',
    email: 'naomi.chebet@gmail.com',
    source: 'Clinic Website',
    interest: 'Childbirth Class',
    stage: 'Booked',
    score: 85,
    urgency: 'This month',
    insurance: '',
    value: 15000,
    addedDaysAgo: 6,
    tags: ['lead', 'website'],
  }),
  lead('c_005', {
    firstName: 'Grace',
    lastName: 'Akinyi',
    phone: '+254712345605',
    source: 'Referral',
    interest: 'Antenatal Care',
    stage: 'Visited',
    score: 95,
    urgency: 'Immediate',
    insurance: 'AAR',
    value: 24000,
    addedDaysAgo: 12,
    tags: ['lead', 'referral', 'patient'],
  }),
  lead('c_006', {
    firstName: 'Esther',
    lastName: 'Kamau',
    phone: '+254712345606',
    email: 'esther.kamau@gmail.com',
    source: 'Google Ads',
    interest: 'Wellness Clinic',
    stage: 'New',
    score: 41,
    urgency: 'Planning ahead',
    insurance: '',
    value: 8000,
    addedDaysAgo: 0,
    tags: ['lead', 'google-ads'],
  }),
  lead('c_007', {
    firstName: 'Cynthia',
    lastName: 'Mwende',
    phone: '+254712345607',
    source: 'Facebook',
    interest: 'Gynaecology',
    stage: 'No-show',
    score: 52,
    urgency: 'This month',
    insurance: 'CIC',
    value: 12000,
    addedDaysAgo: 9,
    tags: ['lead', 'facebook', 'no-show'],
  }),
  lead('c_008', {
    firstName: 'Ruth',
    lastName: 'Wairimu',
    phone: '+254712345608',
    source: 'WhatsApp',
    interest: 'Infertility',
    stage: 'Booked',
    score: 88,
    urgency: 'This week',
    insurance: '',
    value: 45000,
    addedDaysAgo: 3,
    tags: ['lead', 'whatsapp', 'hot-lead'],
  }),
  lead('c_009', {
    firstName: 'Brenda',
    lastName: 'Auma',
    phone: '+254712345609',
    email: 'brenda.auma@gmail.com',
    source: 'Clinic Website',
    interest: 'Family Planning',
    stage: 'New',
    score: 33,
    urgency: 'Planning ahead',
    insurance: '',
    value: 5000,
    addedDaysAgo: 0,
    tags: ['lead', 'website'],
  }),
  lead('c_010', {
    firstName: 'Faith',
    lastName: 'Gitau',
    phone: '+254712345610',
    source: 'Google Ads',
    interest: 'Antenatal Care',
    stage: 'Qualified',
    score: 71,
    urgency: 'This month',
    insurance: 'Old Mutual',
    value: 18500,
    addedDaysAgo: 5,
    tags: ['lead', 'google-ads'],
  }),
  lead('c_011', {
    firstName: 'Joyce',
    lastName: 'Ochieng',
    phone: '+254712345611',
    source: 'Referral',
    interest: 'Gynaecology',
    stage: 'Contacted',
    score: 59,
    urgency: 'This week',
    insurance: 'Kenya Alliance',
    value: 12000,
    addedDaysAgo: 2,
    tags: ['lead', 'referral'],
  }),
  lead('c_012', {
    firstName: 'Lilian',
    lastName: 'Kilonzo',
    phone: '+254712345612',
    email: 'lilian.kilonzo@yahoo.com',
    source: 'Facebook',
    interest: 'Wellness Clinic',
    stage: 'Visited',
    score: 74,
    urgency: 'This month',
    insurance: 'Britam',
    value: 8000,
    addedDaysAgo: 10,
    tags: ['lead', 'facebook', 'patient'],
  }),
];

export const appointments: Appointment[] = [
  {
    id: 'app_001',
    calendarId: 'cal_antenatal_mwangi',
    locationId: LOCATION_ID,
    contactId: 'c_001',
    title: 'Antenatal Care — Dr. Mwangi',
    appointmentStatus: 'booked',
    status: 'booked',
    startTime: iso(1, 9, 30),
    endTime: iso(1, 10, 0),
    timezone: 'Africa/Nairobi',
    assignedUserId: 'u_dr_mwangi',
    dateAdded: iso(-4, 14, 0),
    dateUpdated: iso(-4, 14, 0),
  },
  {
    id: 'app_002',
    calendarId: 'cal_childbirth_mutua',
    locationId: LOCATION_ID,
    contactId: 'c_004',
    title: 'Childbirth Preparation Class',
    appointmentStatus: 'booked',
    status: 'booked',
    startTime: iso(2, 10, 0),
    endTime: iso(2, 11, 0),
    timezone: 'Africa/Nairobi',
    assignedUserId: 'u_dr_mutua',
    dateAdded: iso(-6, 11, 30),
    dateUpdated: iso(-6, 11, 30),
  },
  {
    id: 'app_003',
    calendarId: 'cal_infertility_wahome',
    locationId: LOCATION_ID,
    contactId: 'c_008',
    title: 'Infertility Consult — Dr. Wahome Ngare',
    appointmentStatus: 'booked',
    status: 'booked',
    startTime: iso(1, 14, 0),
    endTime: iso(1, 14, 45),
    timezone: 'Africa/Nairobi',
    assignedUserId: 'u_dr_wahome',
    dateAdded: iso(-3, 16, 20),
    dateUpdated: iso(-3, 16, 20),
  },
  {
    id: 'app_004',
    calendarId: 'cal_obstetrics_wahome',
    locationId: LOCATION_ID,
    contactId: 'c_005',
    title: 'Obstetrics — Dr. Wahome Ngare',
    appointmentStatus: 'completed',
    status: 'completed',
    startTime: iso(-3, 9, 0),
    endTime: iso(-3, 9, 30),
    timezone: 'Africa/Nairobi',
    assignedUserId: 'u_dr_wahome',
    dateAdded: iso(-12, 10, 0),
    dateUpdated: iso(-3, 10, 5),
  },
  {
    id: 'app_005',
    calendarId: 'cal_wellness_clinic',
    locationId: LOCATION_ID,
    contactId: 'c_012',
    title: 'Women’s Wellness Clinic',
    appointmentStatus: 'completed',
    status: 'completed',
    startTime: iso(-6, 9, 0),
    endTime: iso(-6, 9, 45),
    timezone: 'Africa/Nairobi',
    assignedUserId: 'u_dr_wahome',
    dateAdded: iso(-10, 13, 0),
    dateUpdated: iso(-6, 10, 10),
  },
  {
    id: 'app_006',
    calendarId: 'cal_gynae_mutua',
    locationId: LOCATION_ID,
    contactId: 'c_003',
    title: 'General Gynaecology — Dr. Mutua',
    appointmentStatus: 'booked',
    status: 'booked',
    startTime: iso(3, 11, 0),
    endTime: iso(3, 11, 30),
    timezone: 'Africa/Nairobi',
    assignedUserId: 'u_dr_mutua',
    dateAdded: iso(-1, 18, 45),
    dateUpdated: iso(-1, 18, 45),
  },
  {
    id: 'app_007',
    calendarId: 'cal_family_planning',
    locationId: LOCATION_ID,
    contactId: 'c_007',
    title: 'Family Planning Consult',
    appointmentStatus: 'cancelled',
    status: 'cancelled',
    startTime: iso(-4, 10, 0),
    endTime: iso(-4, 10, 30),
    timezone: 'Africa/Nairobi',
    assignedUserId: 'u_dr_mutua',
    dateAdded: iso(-9, 12, 0),
    dateUpdated: iso(-4, 9, 0),
  },
];

export const workflows: Workflow[] = [
  {
    id: 'wf_lead_intake',
    locationId: LOCATION_ID,
    name: 'New Lead Intake & Qualification',
    status: 'active',
    type: 'trigger',
    triggerType: 'contact.created',
    dateAdded: iso(-60, 9, 0),
    dateUpdated: iso(-2, 9, 0),
  },
  {
    id: 'wf_reminder',
    locationId: LOCATION_ID,
    name: 'Appointment Reminder (24h + 2h)',
    status: 'active',
    type: 'automation',
    triggerType: 'appointment.booked',
    dateAdded: iso(-60, 9, 0),
    dateUpdated: iso(-2, 9, 0),
  },
  {
    id: 'wf_noshow_rebooking',
    locationId: LOCATION_ID,
    name: 'No-Show & Missed-Call Rebooking',
    status: 'active',
    type: 'trigger',
    triggerType: 'appointment.no_show',
    dateAdded: iso(-45, 9, 0),
    dateUpdated: iso(-2, 9, 0),
  },
  {
    id: 'wf_followup',
    locationId: LOCATION_ID,
    name: 'Post-Visit Follow-up',
    status: 'active',
    type: 'automation',
    triggerType: 'appointment.completed',
    dateAdded: iso(-45, 9, 0),
    dateUpdated: iso(-2, 9, 0),
  },
  {
    id: 'wf_digest',
    locationId: LOCATION_ID,
    name: 'Daily Ops Digest to WhatsApp',
    status: 'active',
    type: 'schedule',
    triggerType: 'schedule.daily',
    dateAdded: iso(-30, 9, 0),
    dateUpdated: iso(-2, 9, 0),
  },
];

export const webhookSubscriptions: WebhookSubscription[] = [];

export interface SeedResult {
  collections: Record<string, unknown[]>;
  schedules: CalendarSchedule[];
  seededAt: string;
}

export function buildSeedData(): SeedResult {
  return {
    collections: {
      users,
      contacts,
      calendars,
      customFields,
      appointments,
      workflows,
      webhooks: webhookSubscriptions,
      events: [],
    },
    schedules,
    seededAt: new Date().toISOString(),
  };
}

export async function seedIfEmpty(store: Store): Promise<void> {
  const existing = await store.getCollection<Contact>('contacts');
  if (existing && existing.length > 0) return;
  const seed = buildSeedData();
  for (const [name, rows] of Object.entries(seed.collections)) {
    await store.putCollection(name, rows as never[]);
  }
  await store.putCollection('meta', [
    { schedules: seed.schedules, seededAt: seed.seededAt, version: 1 },
  ]);
}
