import type { FastifyInstance } from "fastify";
import {
  createClaim,
  listClaims,
  listPendingMatches,
  approveMatch,
  rejectMatch,
  addClarifyingQA,
  listManualClaims,
  approveManualClaim,
  rejectManualClaim,
} from "../../controllers/claims/claimsController";

export async function claimsRoutes(app: FastifyInstance) {
  // Rider: submit a lost item report
  app.post("/", createClaim);

  // Admin: list all raw claims
  app.get("/", listClaims);

  // Admin: list all AI-suggested matches awaiting review
  app.get("/matches", listPendingMatches);
  // Admin: list manual-review claims
  app.get("/manual", listManualClaims);

  // Admin: approve a match (sends email to rider)
  app.post("/matches/:matchId/approve", approveMatch);

  // Admin: reject a match
  app.post("/matches/:matchId/reject", rejectMatch);

  // Admin: resolve manual claim
  app.post("/:claimId/manual/approve", approveManualClaim);
  app.post("/:claimId/manual/reject", rejectManualClaim);

  // Chatbot: store clarifying question/answer
  app.post("/:claimId/questions", addClarifyingQA);
}
