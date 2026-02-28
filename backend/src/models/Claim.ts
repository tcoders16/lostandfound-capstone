// src/models/Claim.ts
/**
 * MongoDB schema for rider-submitted lost item reports (claims).
 */
import { mongoose } from "../db/mongo";

const ClaimSchema = new mongoose.Schema(
  {
    claimId: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    locationName: { type: String },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String },
    email: { type: String },
    manualReviewRequired: { type: Boolean, default: false },
    manualReviewedAt: { type: Date },

    // Follow-up chat questions + answers captured during AI triage
    clarifyingQuestions: [
      {
        question:   { type: String, required: true },
        answer:     { type: String },
        matchId:    { type: String }, // optional pending-match link
        itemId:     { type: String }, // optional found item link
        askedAt:    { type: Date, default: Date.now },
        answeredAt: { type: Date },
        source:     { type: String, enum: ["auto", "manual"], default: "auto" },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    matchedItemId: { type: String }, // set when admin matches to a found item
  },
  { timestamps: true }
);

export const ClaimModel =
  mongoose.models.Claim || mongoose.model("Claim", ClaimSchema);
