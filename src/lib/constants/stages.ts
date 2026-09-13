import type { StageId } from '@/types/case';

/** Stage groups map to the four procedural colour tokens in DESIGN.md. */
type StageGroup = 'notice' | 'filing' | 'evidence' | 'arguments' | 'order';

export interface StageMeta {
  id: StageId;
  label: string;
  short: string;
  group: StageGroup;
}

export const STAGES: readonly StageMeta[] = [
  { id: 'appearance', label: 'Appearance', short: 'Appearance', group: 'notice' },
  { id: 'notice', label: 'Notice / Summons', short: 'Notice', group: 'notice' },
  { id: 'written-statement', label: 'Written Statement / Reply', short: 'WS / Reply', group: 'filing' },
  { id: 'framing-issues', label: 'Framing of Issues', short: 'Issues', group: 'filing' },
  { id: 'evidence', label: 'Evidence', short: 'Evidence', group: 'evidence' },
  { id: 'cross-examination', label: 'Cross Examination', short: 'Cross', group: 'evidence' },
  { id: 'arguments', label: 'Arguments', short: 'Arguments', group: 'arguments' },
  { id: 'final-arguments', label: 'Final Arguments', short: 'Final Args', group: 'arguments' },
  { id: 'judgment', label: 'Judgment', short: 'Judgment', group: 'order' },
  { id: 'order', label: 'Order', short: 'Order', group: 'order' },
  { id: 'execution', label: 'Execution', short: 'Execution', group: 'filing' },
  { id: 'disposed', label: 'Disposed', short: 'Disposed', group: 'order' },
] as const;

export const STAGE_IDS = STAGES.map((s) => s.id) as [StageId, ...StageId[]];

const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

export function getStage(id: string): StageMeta {
  return STAGE_BY_ID.get(id as StageId) ?? STAGES[0];
}

/** Low-saturation pastels — trajectory at a glance, no cognitive clutter. */
const STAGE_TONE: Record<StageGroup, string> = {
  notice: 'bg-[#FEF3C7] text-[#92400E] dark:bg-[#4a3400] dark:text-[#ffdea4]',
  filing: 'bg-[#E2E8F0] text-[#334155] dark:bg-[#2d384e] dark:text-[#c7ccd8]',
  evidence: 'bg-[#DBEAFE] text-[#1E40AF] dark:bg-[#1e3a8a] dark:text-[#bfdbfe]',
  arguments: 'bg-[#EDE9FE] text-[#5B21B6] dark:bg-[#3323cc] dark:text-[#e2dfff]',
  order: 'bg-[#DCFCE7] text-[#166534] dark:bg-[#14532d] dark:text-[#bbf7d0]',
};

export function stageTone(id: string): string {
  return STAGE_TONE[getStage(id).group];
}
