// src/controllers/searchController.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { searchAnalysedItems } from "../../services/pinecone/searchAnalysedItemService";


export async function searchController(
  req: FastifyRequest<{ Body: { query: string } }>,
  reply: FastifyReply
) {
  try {
    const { query } = req.body;
    if (!query) {
      return reply.status(400).send({ error: "Query text required" });
    }

    const results = await searchAnalysedItems(query);
    return reply.status(200).send({ results });
  } catch (err: any) {
    console.error("[searchController] Error:", err);
    return reply.status(500).send({ error: err.message });
  }
}