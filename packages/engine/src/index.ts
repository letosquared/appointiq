/**
 * @appointiq/engine
 *
 * The AppointIQ decision engine: deterministic lead scoring, reply drafting and
 * routing. It is the "no-API-key AI qualifier" the n8n workflows call over HTTP,
 * and the same logic the dashboard uses to show what an LLM would decide.
 *
 * Swapping in a real model later is a one-interface change (see docs/go-live.md).
 */

export { scoreLead, scoreToLabel, DEFAULT_SCORING_CONFIG } from './scoring';
export type { LeadSignal, Qualification, ScoreBreakdown, Tier, ScoringConfig } from './scoring';

export { draftReply, DEFAULT_REPLY_CONFIG } from './replies';
export type { DraftReply, ReplyConfig } from './replies';

export { detectService, routeLead, SERVICE_ROUTES } from './routing';
export type { RoutingDecision, CalendarRef } from './routing';
