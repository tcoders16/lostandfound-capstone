// src/services/pinecone/searchAnalysedItem.service.ts
import { PineconeService } from "./pineconeService";
import { EmbeddingService } from "./embeddingService";

/**
 * Given a natural-language query (e.g. "black mouse Oakville"),
 * this function generates an embedding and searches Pinecone.
 */
export async function searchAnalysedItems(queryText: string, topK = 3) {
  try {
    console.log("🔍 Searching Pinecone for:", queryText);

    // Create embedding from the search text
    const queryVector = await EmbeddingService.embedText(queryText);

    // Search the Pinecone index for similar vectors
    const matches = await PineconeService.searchVector(queryVector, topK);

    // Simplify response for frontend
    return matches.map((m: any) => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata,
    }));
  } catch (err: any) {
    console.error("[searchAnalysedItems] Error:", err);
    return [];
  }
}