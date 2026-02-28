// src/services/pinecone/pineconeService.ts
import { EmbeddingService } from "./embeddingService";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

export const PineconeService = {
  /**
   * Raw vector upsert — caller provides pre-computed embedding + metadata.
   * Used by upsertEnrichedClaimToVector (claims) and other advanced cases.
   */
  async upsertVector(id: string, values: number[], metadata: Record<string, any>) {
    await index.upsert([{ id, values, metadata }]);
    console.log(`✅ [PineconeService] Vector upserted: ${id}`);
  },

  /**
   * Semantic search.
   *
   * filterType defaults to "found_item" so that claim vectors stored by
   * upsertEnrichedClaimToVector never pollute found-item search results.
   *
   * Graceful fallback: if the type filter returns 0 matches (e.g. the index
   * contains legacy items that were upserted before type tagging was added),
   * the query is retried without the filter so the pipeline doesn't silently
   * return nothing.
   */
  async searchVector(
    query: number[],
    topK = 5,
    filterType: string | null = "found_item"
  ) {
    const baseQuery: any = { vector: query, topK, includeMetadata: true };

    if (filterType) {
      const filtered = await index.query({
        ...baseQuery,
        filter: { type: { $eq: filterType } },
      });

      const hits = filtered.matches ?? [];
      console.log(
        `🔍 [PineconeService] ${hits.length} match(es) (filter: type=${filterType})`
      );

      if (hits.length > 0) return hits;

      // Zero hits with filter → legacy items without type tag; retry unfiltered
      console.warn(
        `[PineconeService] 0 results with type filter — retrying unfiltered ` +
          `(run a re-index if this persists)`
      );
    }

    const unfiltered = await index.query(baseQuery);
    console.log(
      `🔍 [PineconeService] ${unfiltered.matches?.length ?? 0} match(es) (unfiltered)`
    );
    return unfiltered.matches ?? [];
  },

  /**
   * Embed an item description → upsert to Pinecone as a found_item.
   *
   * Builds a rich embedding string from every available attribute field so
   * that semantic search has maximum signal.  Tags the vector with
   * type="found_item" so it can be discriminated from claim vectors.
   */
  async embedAndUpsertItem(item: {
    itemId: string;
    description?: string;
    locationName?: string;
    attributes?: Record<string, any>;
  }) {
    const attrs = item.attributes ?? {};

    // Build the richest possible text for embedding
    const parts: string[] = [];

    if (item.description)     parts.push(item.description);
    if (item.locationName)    parts.push(`Found at ${item.locationName}`);
    if (attrs.summary)        parts.push(attrs.summary);
    if (attrs.category)       parts.push(`Category: ${attrs.category}`);
    if (attrs.brand)          parts.push(`Brand: ${attrs.brand}`);
    if (attrs.model)          parts.push(`Model: ${attrs.model}`);
    if (attrs.color)          parts.push(`Color: ${attrs.color}`);
    if (attrs.material)       parts.push(`Material: ${attrs.material}`);
    if (attrs.size)           parts.push(`Size: ${attrs.size}`);
    if (attrs.condition)      parts.push(`Condition: ${attrs.condition}`);
    if (attrs.text)           parts.push(`Text/label: ${attrs.text}`);
    if (attrs.serialNumber)   parts.push(`Serial: ${attrs.serialNumber}`);
    if (Array.isArray(attrs.keywords) && attrs.keywords.length)
      parts.push(`Keywords: ${(attrs.keywords as string[]).join(", ")}`);
    if (Array.isArray(attrs.distinctiveFeatures) && attrs.distinctiveFeatures.length)
      parts.push(`Distinctive features: ${(attrs.distinctiveFeatures as string[]).join(", ")}`);
    if (Array.isArray(attrs.labels) && attrs.labels.length)
      parts.push(`Labels: ${(attrs.labels as string[]).join(", ")}`);

    const embeddingText = parts.filter(Boolean).join(". ").trim() || item.itemId;

    const embedding = await EmbeddingService.embedText(embeddingText);

    await index.upsert([
      {
        id: item.itemId,
        values: embedding,
        metadata: {
          type:         "found_item",   // ← discriminator — NEVER remove
          description:  item.description  ?? "",
          locationName: item.locationName ?? "",
          filename:     item.itemId,
          // Spread flat attributes for metadata filtering in future
          ...(attrs.category  ? { category:  attrs.category  } : {}),
          ...(attrs.brand     ? { brand:     attrs.brand     } : {}),
          ...(attrs.color     ? { color:     attrs.color     } : {}),
          ...(attrs.summary   ? { summary:   attrs.summary   } : {}),
        },
      },
    ]);

    console.log(`📡 [PineconeService] Upserted found_item: ${item.itemId} (${embeddingText.slice(0, 80)}…)`);
  },
};
