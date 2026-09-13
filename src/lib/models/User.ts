import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const UserSchema = new Schema(
  {
    // Stored lowercase so "Garvit" and "garvit" are the same advocate.
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
    },
    /** `scrypt$<salt>$<key>` — see lib/auth/password.ts. Never selected by default. */
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true, maxlength: 60 },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

UserSchema.index({ username: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const UserModel: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>('User', UserSchema);
