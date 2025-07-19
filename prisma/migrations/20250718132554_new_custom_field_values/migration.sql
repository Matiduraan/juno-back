/*
  Warnings:

  - A unique constraint covering the columns `[field_id,guest_id]` on the table `GuestCustomFieldValues` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "CustomFieldType" ADD VALUE 'CHECKBOX';

-- CreateIndex
CREATE UNIQUE INDEX "GuestCustomFieldValues_field_id_guest_id_key" ON "GuestCustomFieldValues"("field_id", "guest_id");
