import type { StageId } from '@/types/case';

/**
 * The procedural stages this chamber actually uses, taken from its own cause
 * register. Ordered roughly as a matter travels: institution, service,
 * pleadings, evidence, hearing, reports, orders, closure.
 *
 * `aliases` exist for the CSV importer — the register is kept with short codes
 * (CR, PF, WS) and the occasional variant spelling, and an import should
 * recognise them rather than reject the row.
 */

/** Stage groups map to the five procedural colour tokens in DESIGN.md. */
type StageGroup = 'notice' | 'filing' | 'evidence' | 'arguments' | 'order';

export interface StageMeta {
  id: StageId;
  label: string;
  /** Shown on the small badge and the docket filter chips, where space is tight. */
  short: string;
  group: StageGroup;
  aliases?: readonly string[];
}

export const STAGES: readonly StageMeta[] = [
  // ── Institution ────────────────────────────────────────────────────────
  { id: 'plaint', label: 'Plaint', short: 'Plaint', group: 'filing' },
  { id: 'application', label: 'Application', short: 'Application', group: 'filing', aliases: ['Appl'] },
  { id: 'cognizance', label: 'Cognizance', short: 'Cognizance', group: 'filing', aliases: ['Cognisance'] },

  // ── Service ────────────────────────────────────────────────────────────
  { id: 'process-fee', label: 'Process Fee', short: 'Process Fee', group: 'notice', aliases: ['PF'] },
  {
    id: 'notice-summons',
    label: 'Notice / Summons',
    short: 'Notice/Summons',
    group: 'notice',
    aliases: ['Notice/Summons', 'Notice and Summons'],
  },
  { id: 'notice', label: 'Notice', short: 'Notice', group: 'notice' },
  { id: 'summons', label: 'Summons', short: 'Summons', group: 'notice' },
  { id: 'service', label: 'Service', short: 'Service', group: 'notice' },

  // ── Pleadings ──────────────────────────────────────────────────────────
  {
    id: 'written-statement',
    label: 'Written Statement / Reply',
    short: 'WS / Reply',
    group: 'filing',
    aliases: ['WS', 'Reply', 'Written Statement'],
  },
  { id: 'framing-issues', label: 'Framing of Issues', short: 'Issues', group: 'filing' },

  // ── Evidence ───────────────────────────────────────────────────────────
  { id: 'evidence', label: 'Evidence', short: 'Evidence', group: 'evidence' },
  {
    id: 'prosecution-evidence',
    label: 'Prosecution Evidence',
    short: 'Pros. Evidence',
    group: 'evidence',
    aliases: ['PE'],
  },
  {
    id: 'defence-evidence',
    label: 'Defence Evidence',
    short: 'Def. Evidence',
    group: 'evidence',
    aliases: ['DE', 'Defense Evidence'],
  },
  { id: 'cross-examination', label: 'Cross Examination', short: 'Cross', group: 'evidence', aliases: ['Cross'] },

  // ── Hearing ────────────────────────────────────────────────────────────
  { id: 'regular-hearing', label: 'Regular Hearing', short: 'Regular Hearing', group: 'arguments' },
  { id: 'hearing', label: 'Hearing', short: 'Hearing', group: 'arguments' },
  { id: 'arguments', label: 'Arguments', short: 'Arguments', group: 'arguments' },
  { id: 'stay', label: 'Stay', short: 'Stay', group: 'arguments' },
  { id: 'compliance', label: 'Compliance', short: 'Compliance', group: 'filing' },

  // ── Reports ────────────────────────────────────────────────────────────
  { id: 'cheque-report', label: 'Cheque Report', short: 'Cheque Report', group: 'filing', aliases: ['CR'] },
  { id: 'final-report', label: 'Final Report', short: 'Final Report', group: 'filing', aliases: ['FR'] },

  // ── Orders and closure ─────────────────────────────────────────────────
  { id: 'order', label: 'Order', short: 'Order', group: 'order' },
  { id: 'judgment', label: 'Judgment', short: 'Judgment', group: 'order', aliases: ['Judgement'] },
  { id: 'decreed', label: 'Decreed', short: 'Decreed', group: 'order', aliases: ['Decree'] },
  {
    id: 'preliminary-decree',
    label: 'Preliminary Decree',
    short: 'Prelim. Decree',
    group: 'order',
    aliases: ['PD'],
  },
  { id: 'final-decree', label: 'Final Decree', short: 'Final Decree', group: 'order', aliases: ['FD'] },
  {
    id: 'decree-preparation',
    label: 'Decree Preparation',
    short: 'Decree Prep.',
    group: 'filing',
    aliases: ['Preparation of Decree', 'Drawing of Decree'],
  },
  { id: 'appeal', label: 'Appeal', short: 'Appeal', group: 'filing' },
  { id: 'execution', label: 'Execution', short: 'Execution', group: 'filing' },
  { id: 'disposed', label: 'Disposed', short: 'Disposed', group: 'order' },
] as const;

export const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]];

/** What a new matter starts at when nothing else is chosen. */
export const DEFAULT_STAGE: StageId = 'notice-summons';

const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export function getStage(id: string): StageMeta {
  return STAGE_BY_ID.get(id as StageId) ?? STAGES[0];
}

/**
 * Dark tones are muted containers rather than vivid fills — a docket of twenty
 * badges has to stay calm, and the old indigo fought every card it sat on.
 */
const STAGE_TONE: Record<StageGroup, string> = {
  notice: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#4a3612] dark:text-[#f3dda8]',
  filing: 'bg-[#E2E8F0] text-[#334155] dark:bg-[#333e54] dark:text-[#ccd3e0]',
  evidence: 'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#23375e] dark:text-[#bed3f0]',
  arguments: 'bg-[#EDE9FE] text-[#5B21B6] dark:bg-[#39325f] dark:text-[#d8d4f5]',
  order: 'bg-[#DCFCE7] text-[#166534] dark:bg-[#1c4634] dark:text-[#b6e8c9]',
};

export function stageTone(id: string): string {
  return STAGE_TONE[getStage(id).group];
}
