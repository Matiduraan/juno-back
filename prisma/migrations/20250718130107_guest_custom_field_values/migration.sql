/*
  Warnings:

  - You are about to drop the column `field_value` on the `GuestCustomFields` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "GuestCustomFields" DROP COLUMN "field_value";

-- CreateTable
CREATE TABLE "GuestCustomFieldValues" (
    "value_id" SERIAL NOT NULL,
    "field_id" INTEGER NOT NULL,
    "guest_id" INTEGER NOT NULL,
    "field_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestCustomFieldValues_pkey" PRIMARY KEY ("value_id")
);

-- AddForeignKey
ALTER TABLE "GuestCustomFieldValues" ADD CONSTRAINT "GuestCustomFieldValues_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "PartyGuest"("guest_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestCustomFieldValues" ADD CONSTRAINT "GuestCustomFieldValues_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "GuestCustomFields"("field_id") ON DELETE RESTRICT ON UPDATE CASCADE;
