/*
  Warnings:

  - A unique constraint covering the columns `[guest_seat_id]` on the table `PartyGuest` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "PartyGuest" DROP CONSTRAINT "PartyGuest_party_id_fkey";

-- AlterTable
ALTER TABLE "LayoutItem" ALTER COLUMN "layout_item_seat_count" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "PartyGuest_guest_seat_id_key" ON "PartyGuest"("guest_seat_id");

-- AddForeignKey
ALTER TABLE "PartyGuest" ADD CONSTRAINT "PartyGuest_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE CASCADE ON UPDATE CASCADE;
