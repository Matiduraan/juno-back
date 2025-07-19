/*
  Warnings:

  - A unique constraint covering the columns `[user_id,party_id,preference_name]` on the table `UserPreferences` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "UserPreferences_user_id_party_id_idx" ON "UserPreferences"("user_id", "party_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_user_id_party_id_preference_name_key" ON "UserPreferences"("user_id", "party_id", "preference_name");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE CASCADE ON UPDATE CASCADE;
