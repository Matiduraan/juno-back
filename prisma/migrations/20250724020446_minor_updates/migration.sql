/*
  Warnings:

  - Added the required column `role_id` to the `HostInvitation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RolePermissionKey" ADD VALUE 'MANAGE_HOSTS';
ALTER TYPE "RolePermissionKey" ADD VALUE 'VIEW_PARTY';
ALTER TYPE "RolePermissionKey" ADD VALUE 'MANAGE_HOST_PERMISSIONS';

-- AlterTable
ALTER TABLE "HostInvitation" ADD COLUMN     "role_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PartyHost" ALTER COLUMN "role_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "HostInvitation" ADD CONSTRAINT "HostInvitation_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;
