/*
  Warnings:

  - You are about to drop the column `finished_tutorials` on the `UserPreferences` table. All the data in the column will be lost.
  - Added the required column `preference_name` to the `UserPreferences` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preference_value` to the `UserPreferences` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "UserPreferences" DROP CONSTRAINT "UserPreferences_user_id_fkey";

-- DropIndex
DROP INDEX "UserPreferences_user_id_key";

-- AlterTable
ALTER TABLE "UserPreferences" DROP COLUMN "finished_tutorials",
ADD COLUMN     "party_id" INTEGER,
ADD COLUMN     "preference_name" TEXT NOT NULL,
ADD COLUMN     "preference_value" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
