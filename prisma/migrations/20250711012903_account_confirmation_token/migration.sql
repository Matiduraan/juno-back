/*
  Warnings:

  - A unique constraint covering the columns `[email_verification_token]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email_verification_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_verification_token_key" ON "User"("email_verification_token");
