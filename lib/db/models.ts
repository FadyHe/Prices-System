import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const SavedProductSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    currency: { type: String, required: true },
    seller: { type: String, required: true },
    url: { type: String, required: true },
    source: { type: String, required: true },
    image: { type: String, default: '' },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    image: { type: String },
    provider: {
      type: String,
      enum: ['credentials', 'google'],
      default: 'credentials',
    },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    plan: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free',
      index: true,
    },
    planRenewsAt: { type: Date },
    paymobCustomerId: { type: String },
  },
  { timestamps: true }
);

const SearchHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    query: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now, index: true },
    resultCount: { type: Number, default: 0 },
    bestPrice: { type: Number },
    bestSource: { type: String },
    pinned: { type: Boolean, default: false },
    savedProducts: { type: [SavedProductSchema], default: [] },
  },
  { timestamps: true }
);

SearchHistorySchema.index({ userId: 1, timestamp: -1 });
SearchHistorySchema.index(
  { userId: 1, query: 1 },
  { collation: { locale: 'en', strength: 2 } }
);

const EmailVerificationTokenSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date },
  },
  { timestamps: true }
);

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    ip: { type: String, index: true },
    action: { type: String, required: true, index: true },
    query: { type: String },
    resultCount: { type: Number },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);
AuditLogSchema.index({ createdAt: -1 });

const ScrapeJobSchema = new Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    query: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'complete', 'failed'],
      default: 'pending',
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    ip: { type: String, index: true },
    plan: { type: String },
    products: { type: [SavedProductSchema], default: [] },
    totalScraped: { type: Number },
    count: { type: Number },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);
ScrapeJobSchema.index({ createdAt: -1 });
ScrapeJobSchema.index({ status: 1, createdAt: -1 });

// Atomic quota counters: one doc per identity+kind+window. The ceiling is
// enforced inside findOneAndUpdate (filter count < limit + $inc), so two
// concurrent requests at the boundary can never exceed it. TTL index on
// expiresAt sweeps old windows automatically.
const QuotaWindowSchema = new Schema({
  key: { type: String, required: true },
  kind: { type: String, enum: ['hour', 'day'], required: true },
  window: { type: String, required: true },
  count: { type: Number, default: 0 },
  expiresAt: {
    type: Date,
    index: { expires: 0 },
  },
});
QuotaWindowSchema.index({ key: 1, kind: 1, window: 1 }, { unique: true });

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type SearchHistoryDoc = InferSchemaType<typeof SearchHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};
export type EmailVerificationTokenDoc = InferSchemaType<
  typeof EmailVerificationTokenSchema
> & { _id: mongoose.Types.ObjectId };
export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type ScrapeJobDoc = InferSchemaType<typeof ScrapeJobSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type QuotaWindowDoc = InferSchemaType<typeof QuotaWindowSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', UserSchema);

export const SearchHistory: Model<SearchHistoryDoc> =
  (mongoose.models.SearchHistory as Model<SearchHistoryDoc>) ||
  mongoose.model<SearchHistoryDoc>('SearchHistory', SearchHistorySchema);

export const EmailVerificationToken: Model<EmailVerificationTokenDoc> =
  (mongoose.models.EmailVerificationToken as Model<EmailVerificationTokenDoc>) ||
  mongoose.model<EmailVerificationTokenDoc>(
    'EmailVerificationToken',
    EmailVerificationTokenSchema
  );

export const AuditLog: Model<AuditLogDoc> =
  (mongoose.models.AuditLog as Model<AuditLogDoc>) ||
  mongoose.model<AuditLogDoc>('AuditLog', AuditLogSchema);

export const ScrapeJob: Model<ScrapeJobDoc> =
  (mongoose.models.ScrapeJob as Model<ScrapeJobDoc>) ||
  mongoose.model<ScrapeJobDoc>('ScrapeJob', ScrapeJobSchema);

export const QuotaWindow: Model<QuotaWindowDoc> =
  (mongoose.models.QuotaWindow as Model<QuotaWindowDoc>) ||
  mongoose.model<QuotaWindowDoc>('QuotaWindow', QuotaWindowSchema);

export interface SearchHistoryResponse {
  id: string;
  query: string;
  timestamp: number;
  resultCount: number;
  bestPrice?: number;
  bestSource?: string;
  pinned?: boolean;
  savedProducts?: Array<{
    name: string;
    price: number;
    currency: string;
    seller: string;
    url: string;
    source: string;
    image?: string;
  }>;
}

export function toHistoryResponse(
  doc: SearchHistoryDoc
): SearchHistoryResponse {
  return {
    id: doc._id.toString(),
    query: doc.query,
    timestamp: new Date(doc.timestamp ?? Date.now()).getTime(),
    resultCount: doc.resultCount ?? 0,
    bestPrice: doc.bestPrice ?? undefined,
    bestSource: doc.bestSource ?? undefined,
    pinned: doc.pinned,
    savedProducts: (doc.savedProducts ?? []).map((p) => ({
      name: p.name,
      price: p.price,
      currency: p.currency,
      seller: p.seller,
      url: p.url,
      source: p.source,
      image: p.image,
    })),
  };
}