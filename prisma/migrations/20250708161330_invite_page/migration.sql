/*
  Warnings:

  - A unique constraint covering the columns `[confirmation_id]` on the table `PartyGuest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[party_id]` on the table `PartyInvitation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Party" ADD COLUMN     "party_dress_code" TEXT,
ADD COLUMN     "party_special_instructions" TEXT;

-- AlterTable
ALTER TABLE "PartyGuest" ADD COLUMN     "confirmation_id" TEXT,
ADD COLUMN     "confirmed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PartyInvitation" ADD COLUMN     "invitation_file_extension" TEXT,
ALTER COLUMN "email_body" DROP NOT NULL,
ALTER COLUMN "email_body" SET DEFAULT '',
ALTER COLUMN "email_subject" DROP NOT NULL,
ALTER COLUMN "email_subject" SET DEFAULT '',
ALTER COLUMN "message_content" DROP NOT NULL,
ALTER COLUMN "message_content" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "PartyGuest_confirmation_id_key" ON "PartyGuest"("confirmation_id");

-- CreateIndex
CREATE UNIQUE INDEX "PartyInvitation_party_id_key" ON "PartyInvitation"("party_id");
