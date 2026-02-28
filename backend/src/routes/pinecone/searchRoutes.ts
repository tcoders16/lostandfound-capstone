import { FastifyInstance } from "fastify";
import { searchController } from "../../controllers/pinecone/searchController";

export default async function searchRoutes(app: FastifyInstance) {
  app.post("/", searchController)}