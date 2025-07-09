/*
  Warnings:

  - You are about to drop the column `message_content` on the `PartyInvitation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PartyInvitation" DROP COLUMN "message_content",
ADD COLUMN     "message_option" INTEGER DEFAULT 0;
