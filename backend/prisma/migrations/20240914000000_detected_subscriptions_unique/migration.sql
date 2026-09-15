-- Re-running detection for a batch should not create duplicate merchants.
CREATE UNIQUE INDEX "detected_subscriptions_import_batch_id_merchant_norm_key"
ON "detected_subscriptions"("import_batch_id", "merchant_norm");
