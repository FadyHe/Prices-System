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

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type SearchHistoryDoc = InferSchemaType<typeof SearchHistorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>('User', UserSchema);

export const SearchHistory: Model<SearchHistoryDoc> =
  (mongoose.models.SearchHistory as Model<SearchHistoryDoc>) ||
  mongoose.model<SearchHistoryDoc>('SearchHistory', SearchHistorySchema);

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
    bestPrice: doc.bestPrice,
    bestSource: doc.bestSource,
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