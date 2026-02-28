// src/models/Item.ts
/**
 * Mongoose schema for Lost & Found items
 * --------------------------------------
 * Stores uploaded + analysed image metadata and AI attributes.
 */

import { mongoose } from "../db/mongo";

// Define the schema for each lost item
const ItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    filename: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: false,
    },
    locationName: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: false,
    },
    // The AI-generated attributes JSON object
    attributes: {
      type: mongoose.Schema.Types.Mixed, // allows dynamic key-value structure
      required: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Export the model (avoiding re-declaration on hot reload)
export const ItemModel =
  mongoose.models.Item || mongoose.model("Item", ItemSchema);

// Export the TypeScript type for code safety
export type ItemDocument = mongoose.InferSchemaType<typeof ItemSchema>;