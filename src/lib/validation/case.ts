import { z } from 'zod';
import { STAGE_IDS } from '@/lib/constants/stages';

const trimmed = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === '' ? undefined : v));

/** Accepts "2026-09-10", a full ISO string, or null/"" to clear the date. */
const dateField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null || v === '') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

export const caseCreateSchema = z.object({
  crn: trimmed(40).transform((v) => v.toUpperCase()),
  court: trimmed(120),
  party1: trimmed(160),
  party2: trimmed(160),
  stage: z.enum(STAGE_IDS).default('appearance'),
  preDate: dateField,
  nextDate: dateField,

  caseNo: optionalText(60),
  courtRoom: optionalText(40),
  judge: optionalText(120),
  purpose: optionalText(200),
  appearingFor: z.enum(['party1', 'party2']).optional(),
  clientName: optionalText(160),
  clientPhone: optionalText(20),
  notes: optionalText(5000),
  pinned: z.boolean().optional(),
  status: z.enum(['active', 'disposed']).optional(),
});

export const caseUpdateSchema = caseCreateSchema.partial();

/** Roll the diary forward: today's date becomes preDate, a new nextDate is set. */
export const adjournSchema = z.object({
  nextDate: dateField,
  stage: z.enum(STAGE_IDS).optional(),
  note: z.string().trim().max(2000).optional(),
  purpose: optionalText(200),
  disposed: z.boolean().optional(),
});

export const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  filter: z.enum(['all', 'today', 'upcoming', 'overdue', 'disposed']).default('all'),
  stage: z.enum(STAGE_IDS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CaseCreateInput = z.input<typeof caseCreateSchema>;
export type AdjournInput = z.input<typeof adjournSchema>;
