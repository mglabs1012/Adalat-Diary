import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';
import { DEFAULT_STAGE, STAGE_IDS } from '@/lib/constants/stages';

const HearingEntrySchema = new Schema(
  {
    date: { type: Date, required: true },
    stage: { type: String, enum: STAGE_IDS, required: true },
    note: { type: String, trim: true, maxlength: 2000 },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const CaseSchema = new Schema(
  {
    // ── The seven core diary fields ───────────────────────────────────────
    crn: { type: String, trim: true, uppercase: true, maxlength: 40 },
    preDate: { type: Date, default: null }, // previous hearing
    court: { type: String, required: true, trim: true, maxlength: 120 },
    party1: { type: String, required: true, trim: true, maxlength: 160 }, // petitioner / plaintiff
    party2: { type: String, required: true, trim: true, maxlength: 160 }, // respondent / defendant
    stage: { type: String, enum: STAGE_IDS, required: true, default: DEFAULT_STAGE },
    nextDate: { type: Date, default: null },

    // ── Chamber context ───────────────────────────────────────────────────
    caseNo: { type: String, trim: true, maxlength: 60 },
    courtRoom: { type: String, trim: true, maxlength: 40 },
    judge: { type: String, trim: true, maxlength: 120 },
    purpose: { type: String, trim: true, maxlength: 200 },
    appearingFor: { type: String, enum: ['party1', 'party2'], default: 'party1' },
    clientName: { type: String, trim: true, maxlength: 160 },
    clientPhone: { type: String, trim: true, maxlength: 20 },
    notes: { type: String, trim: true, maxlength: 5000 },

    pinned: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'disposed'], default: 'active', index: true },
    history: { type: [HearingEntrySchema], default: [] },

    ownerId: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    // Slim wire payloads: the client only ever sees `id`.
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.ownerId;
        return ret;
      },
    },
  },
);

// ── Indexes ─────────────────────────────────────────────────────────────────
/**
 * One CRN per chamber — but only where a CRN exists. A plain unique index
 * would treat every CRN-less matter as a duplicate of the last one, so the
 * constraint is filtered to documents that actually carry the field.
 */
CaseSchema.index(
  { ownerId: 1, crn: 1 },
  { unique: true, partialFilterExpression: { crn: { $type: 'string' } } },
);
// The hot path: "what is listed next" — covers Board, Diary and the docket sort.
CaseSchema.index({ ownerId: 1, status: 1, nextDate: 1 });
// Pinned-first docket ordering.
CaseSchema.index({ ownerId: 1, pinned: -1, nextDate: 1 });
// Free-text lookup across the fields an advocate actually searches by.
CaseSchema.index(
  { crn: 'text', caseNo: 'text', party1: 'text', party2: 'text', court: 'text', judge: 'text' },
  { name: 'case_search', weights: { crn: 10, caseNo: 8, party1: 5, party2: 5, court: 2, judge: 2 } },
);

export type CaseDoc = InferSchemaType<typeof CaseSchema>;

export const CaseModel: Model<CaseDoc> =
  (models.Case as Model<CaseDoc>) || model<CaseDoc>('Case', CaseSchema);
