/** Kept in the order a matter travels — see lib/constants/stages.ts. */
export type StageId =
  | 'plaint'
  | 'application'
  | 'cognizance'
  | 'process-fee'
  | 'notice-summons'
  | 'notice'
  | 'summons'
  | 'service'
  | 'written-statement'
  | 'framing-issues'
  | 'evidence'
  | 'prosecution-evidence'
  | 'defence-evidence'
  | 'cross-examination'
  | 'regular-hearing'
  | 'hearing'
  | 'arguments'
  | 'stay'
  | 'compliance'
  | 'cheque-report'
  | 'final-report'
  | 'order'
  | 'judgment'
  | 'decreed'
  | 'preliminary-decree'
  | 'final-decree'
  | 'decree-preparation'
  | 'appeal'
  | 'execution'
  | 'disposed';

export type CaseStatus = 'active' | 'disposed';
export type PartySide = 'party1' | 'party2';

/** One diary entry — what happened on a given date. */
export interface HearingEntry {
  date: string; // ISO
  stage: StageId;
  note?: string;
  recordedAt: string; // ISO
}

/** The record as it travels over the wire and lives in the offline cache. */
export interface CaseRecord {
  id: string;
  crn: string;
  caseNo?: string;
  court: string;
  courtRoom?: string;
  judge?: string;
  party1: string;
  party2: string;
  stage: StageId;
  preDate?: string | null;
  nextDate?: string | null;
  purpose?: string;
  appearingFor?: PartySide;
  clientName?: string;
  clientPhone?: string;
  notes?: string;
  pinned: boolean;
  status: CaseStatus;
  history: HearingEntry[];
  createdAt: string;
  updatedAt: string;
  /** Set on records still sitting in the offline outbox. */
  _pending?: boolean;
}

export interface CaseListResponse {
  items: CaseRecord[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DiaryStats {
  today: number;
  tomorrow: number;
  thisWeek: number;
  active: number;
  overdue: number;
  disposed: number;
}

export type CaseFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'disposed' | 'range';
