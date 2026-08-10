/**
 * Rule-based reply drafting. Produces the SMS/WhatsApp message the practice
 * manager would send — or that a real LLM would draft. Deterministic by design,
 * so the demo is repeatable. Copy is tuned to Mercy Medical Centre.
 */

import type { LeadSignal } from './scoring';
import type { Tier } from './scoring';

export interface DraftReply {
  channel: 'whatsapp' | 'sms' | 'email';
  subject?: string;
  body: string;
  tone: 'urgent' | 'warm' | 'nurture';
}

export interface ReplyConfig {
  clinicName: string;
  phone: string;
  whatsapp: string;
  hours: string;
}

export const DEFAULT_REPLY_CONFIG: ReplyConfig = {
  clinicName: 'Mercy Medical Centre',
  phone: '+254 729 370 022',
  whatsapp: '+254 733 370 022',
  hours: 'Mon–Fri 09:00–17:00, Sat 09:00–12:00',
};

const TREATMENT_COPY: Record<string, { noun: string; ask: string }> = {
  Infertility: {
    noun: 'fertility journey',
    ask: 'How long have you been trying to conceive, and has any testing been done yet?',
  },
  'Antenatal Care': {
    noun: 'antenatal care',
    ask: 'How far along is your pregnancy, and where are you attending your ANC clinic currently?',
  },
  Gynaecology: {
    noun: 'gynaecology consult',
    ask: 'Can you share a little about the symptoms you are experiencing?',
  },
  'Wellness Clinic': {
    noun: 'wellness check-up',
    ask: 'Do you have a preference for mornings or afternoons for your check-up?',
  },
  'Childbirth Class': {
    noun: 'childbirth preparation class',
    ask: 'What stage of pregnancy are you at? Classes are best taken from the third trimester.',
  },
  'Family Planning': {
    noun: 'family planning consultation',
    ask: 'Are you looking to start, switch or review a method?',
  },
};

function detectTreatment(signal: LeadSignal): string | undefined {
  const cf = signal.customFields ?? {};
  const explicit = String(cf.treatment_interest ?? '');
  if (explicit) return explicit;
  const message = signal.message ?? '';
  if (/(antenat|pregnan|pre-natal|prenatal|obstetric|scan)/i.test(message)) return 'Antenatal Care';
  if (/(infert|conceiv|fertility|ivf|trying)/i.test(message)) return 'Infertility';
  if (/(fibroid|gynae|menstrual|pap|std|period|pain|bleed)/i.test(message)) return 'Gynaecology';
  if (/(childbirth|birth class|lamaze|breastfeed|newborn)/i.test(message)) return 'Childbirth Class';
  if (/(family planning|contracept|implant|coil)/i.test(message)) return 'Family Planning';
  if (/(wellness|check-?up|screening|fitness)/i.test(message)) return 'Wellness Clinic';
  return undefined;
}

export function draftReply(signal: LeadSignal, tier: Tier, config: ReplyConfig = DEFAULT_REPLY_CONFIG): DraftReply {
  const treatment = detectTreatment(signal) ?? 'Gynaecology';
  const copy = TREATMENT_COPY[treatment] ?? TREATMENT_COPY.Gynaecology!;
  const firstName = signal.contact.firstName ?? '';
  const name = firstName ? `${firstName}, ` : '';
  const message = signal.message ?? '';

  const greeting = `${name}thank you for reaching out to ${config.clinicName}.`;

  if (tier === 'hot') {
    const body =
      `${greeting}\n\nWe can see you for your ${copy.noun} urgently. We are open ${config.hours}. ` +
      `Reply with a preferred time or call ${config.phone}, and we will reserve your slot right away.`;
    return { channel: signal.contact.phone ? 'whatsapp' : 'email', body, tone: 'urgent' };
  }

  if (tier === 'warm') {
    const hasQuestion = /\?/.test(message);
    const body =
      `${greeting}\n\n${copy.ask}\n\n` +
      `In the meantime, would you like to book an appointment? We have openings ${config.hours}. ` +
      `Just reply with a day that suits you.`;
    return {
      channel: signal.contact.phone ? 'whatsapp' : 'email',
      body,
      tone: hasQuestion ? 'warm' : 'warm',
    };
  }

  // cold — soft nurture, no hard sell
  const body =
    `${greeting}\n\nWhen you are ready, we would love to support your ${copy.noun} at ${config.clinicName}. ` +
    `Bookings and questions: ${config.phone} (WhatsApp ${config.whatsapp}). ` +
    `We are open ${config.hours}.`;
  return { channel: signal.contact.phone ? 'whatsapp' : 'email', body, tone: 'nurture' };
}
