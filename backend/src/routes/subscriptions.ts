import { Router } from "express";
import {
  batchHasTransactions,
  listDetectedSubscriptions,
} from "../detect/detectSubscriptions.js";
import { HttpError } from "../http.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const subscriptionsRouter = Router();

subscriptionsRouter.get("/subscriptions/:batchId", async (req, res, next) => {
  try {
    const batchId = req.params.batchId ?? "";
    if (!UUID_RE.test(batchId)) {
      throw new HttpError(400, "batchId must be a UUID.");
    }

    const exists = await batchHasTransactions(batchId);
    if (!exists) {
      throw new HttpError(404, "No import found for that batch id.");
    }

    const subscriptions = await listDetectedSubscriptions(batchId);
    res.json({
      importBatchId: batchId,
      count: subscriptions.length,
      subscriptions,
    });
  } catch (error) {
    next(error);
  }
});
