-- CreateEnum
CREATE TYPE "SubscriptionPaymentInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "subcriptionPlan" (
    "plan_id" SERIAL NOT NULL,
    "plan_name" TEXT NOT NULL,
    "plan_description" TEXT,
    "plan_price_monthly" DOUBLE PRECISION NOT NULL,
    "plan_price_yearly" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcriptionPlan_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "planFeature" (
    "feature_id" SERIAL NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "feature_name" TEXT NOT NULL,
    "feature_description" TEXT,
    "feature_key" TEXT NOT NULL,
    "feature_value" INTEGER,
    "feature_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planFeature_pkey" PRIMARY KEY ("feature_id")
);

-- CreateTable
CREATE TABLE "userSubscription" (
    "user_subscription_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "subscription_status" TEXT NOT NULL DEFAULT 'active',
    "subcription_price" DOUBLE PRECISION NOT NULL,
    "subcription_payment_interval" "SubscriptionPaymentInterval" NOT NULL DEFAULT 'MONTHLY',
    "subscription_next_renewal_date" TIMESTAMP(3) NOT NULL,
    "subscription_trial_end_date" TIMESTAMP(3),
    "subscription_start" TIMESTAMP(3) NOT NULL,
    "subscription_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userSubscription_pkey" PRIMARY KEY ("user_subscription_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "planFeature_feature_key_key" ON "planFeature"("feature_key");

-- AddForeignKey
ALTER TABLE "planFeature" ADD CONSTRAINT "planFeature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subcriptionPlan"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSubscription" ADD CONSTRAINT "userSubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subcriptionPlan"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userSubscription" ADD CONSTRAINT "userSubscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
