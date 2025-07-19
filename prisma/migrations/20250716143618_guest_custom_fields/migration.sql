-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE');

-- CreateTable
CREATE TABLE "GuestCustomFields" (
    "field_id" SERIAL NOT NULL,
    "party_id" INTEGER NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "field_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestCustomFields_pkey" PRIMARY KEY ("field_id")
);

-- AddForeignKey
ALTER TABLE "GuestCustomFields" ADD CONSTRAINT "GuestCustomFields_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE RESTRICT ON UPDATE CASCADE;
