-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "import_batch_id" UUID NOT NULL,
    "txn_date" DATE NOT NULL,
    "merchant_raw" TEXT NOT NULL,
    "merchant_norm" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_rules" (
    "id" SERIAL NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detected_subscriptions" (
    "id" SERIAL NOT NULL,
    "import_batch_id" UUID NOT NULL,
    "merchant_norm" TEXT NOT NULL,
    "avg_amount" DECIMAL(10,2),
    "interval_days" INTEGER,
    "occurrences" INTEGER,
    "first_seen" DATE,
    "last_seen" DATE,
    "price_increased" BOOLEAN NOT NULL DEFAULT false,
    "projected_annual" DECIMAL(10,2),

    CONSTRAINT "detected_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_import_batch_id_idx" ON "transactions"("import_batch_id");

-- CreateIndex
CREATE INDEX "detected_subscriptions_import_batch_id_idx" ON "detected_subscriptions"("import_batch_id");
