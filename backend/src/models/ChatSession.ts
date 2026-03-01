// src/models/ChatSession.ts
import { mongoose } from "../db/mongo";

const MessageSchema = new mongoose.Schema({
  role:         { type: String, enum: ["assistant","user"], required: true },
  content:      { type: String, required: true },
  questionType: {
    type: String,
    enum: [
      // legacy types (kept for backward compat)
      "color","features","age",
      // new category-specific types from chatOrchestrationService
      "appearance","damage","identity","extras",       // electronics
      "brand","contents",                              // clothing / accessory
      "doc_type","container","other_items",            // document
      "distinctive","markings","material",             // other / accessory
      // always-present
      "location","serial","conflict","other",
    ],
    default: "other",
  },
  timestamp:    { type: Date, default: Date.now },
}, { _id: false });

const ChatSessionSchema = new mongoose.Schema({
  sessionId:            { type: String, required: true, unique: true, index: true },
  claimId:              { type: String, required: true },
  foundItemId:          { type: String, default: null },  // null = no match yet
  initialScore:         { type: Number, default: 0 },
  currentScore:         { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["searching","chatting","completed","no_match","conflict","cancelled"],
    default: "searching",
  },
  conflictGroup:        { type: String, default: null },  // UUID shared by conflicting matches
  conflictMatchIds:     [{ type: String }],               // other matchIds in same conflict
  messages:             [MessageSchema],
  enrichedDescription:  { type: String, default: "" },   // cumulative from all answers
  questionsAsked:       { type: Number, default: 0 },
  maxQuestions:         { type: Number, default: 6 },     // 6 normal, 8 for conflict
  riderOriginalDesc:    { type: String, default: "" },
  riderName:            { type: String, default: "" },
  riderEmail:           { type: String, default: "" },
  category:             { type: String, default: "other" }, // extracted from [category] prefix in description
}, { timestamps: true });

export const ChatSessionModel =
  mongoose.models.ChatSession || mongoose.model("ChatSession", ChatSessionSchema);
