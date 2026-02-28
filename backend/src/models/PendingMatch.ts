// src/models/PendingMatch.ts
/**
 * A PendingMatch is created when a rider's lost-item report
 * matches a found item with >= 80% vector similarity.
 * Admin reviews and approves → email sent to rider.
 */
import { mongoose } from "../db/mongo";

const PendingMatchSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, unique: true, index: true },

    // Rider's claim
    claimId:        { type: String, required: true },
    riderName:      { type: String, required: true },
    riderPhone:     { type: String, required: true },
    riderEmail:     { type: String },
    riderAddress:   { type: String },
    riderDescription: { type: String, required: true },
    riderLocation:  { type: String },

    // Matched found item
    foundItemId:    { type: String, required: true },
    foundFilename:  { type: String },
    foundDescription: { type: String },
    foundLocation:  { type: String },
    foundAttributes:  { type: mongoose.Schema.Types.Mixed },

    // Match quality
    matchScore:     { type: Number, required: true }, // 0–1 from Pinecone

    // Admin decision
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected"],
      default: "pending_review",
    },
    reviewedAt:       { type: Date },
    adminNotes:       { type: String },

    // Collection token — generated on approval, sent to rider via email
    collectionToken:  { type: String, default: null, index: { sparse: true } },

    // Conflict handling
    conflict: { type: Boolean, default: false },
    conflictGroup: { type: String, default: null },
    conflictClaimIds: [{ type: String }],

    // Source of match
    source: { type: String, enum: ["ai", "manual"], default: "ai" },
  },
  { timestamps: true }
);

export const PendingMatchModel =
  mongoose.models.PendingMatch ||
  mongoose.model("PendingMatch", PendingMatchSchema);
