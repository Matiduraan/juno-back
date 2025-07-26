/*
  Warnings:

  - You are about to drop the column `user_role` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RolePermissionKey" AS ENUM ('EDIT_PARTY_DETAILS', 'SEND_INVITATIONS', 'MANAGE_GUESTS', 'VIEW_GUEST_LIST', 'VIEW_LAYOUT', 'EDIT_LAYOUT', 'MANAGE_GUEST_CUSTOM_FIELDS');

-- AlterTable
ALTER TABLE "PartyHost" ADD COLUMN     "role_id" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "user_role";

-- CreateTable
CREATE TABLE "Roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" TEXT NOT NULL,
    "party_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "RolePermissions" (
    "role_permission_id" SERIAL NOT NULL,
    "permission_key" "RolePermissionKey" NOT NULL,
    "role_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermissions_pkey" PRIMARY KEY ("role_permission_id")
);

-- CreateIndex
CREATE INDEX "RolePermissions_role_id_idx" ON "RolePermissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermissions_role_id_permission_key_key" ON "RolePermissions"("role_id", "permission_key");

-- AddForeignKey
ALTER TABLE "PartyHost" ADD CONSTRAINT "PartyHost_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Roles" ADD CONSTRAINT "Roles_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissions" ADD CONSTRAINT "RolePermissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Predefined data

DO $$
DECLARE
  inserted_id INTEGER;
BEGIN
  INSERT INTO "Roles" ("role_name", "party_id", "created_at", "updated_at")
  VALUES ('Main host', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  RETURNING "role_id" INTO inserted_id;

  INSERT INTO "RolePermissions" ("permission_key", "role_id", "created_at", "updated_at")
  SELECT permission_key, inserted_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  FROM (
    VALUES
      ('EDIT_PARTY_DETAILS'::"RolePermissionKey"),
      ('SEND_INVITATIONS'::"RolePermissionKey"),
      ('MANAGE_GUESTS'::"RolePermissionKey"),
      ('VIEW_GUEST_LIST'::"RolePermissionKey"),
      ('VIEW_LAYOUT'::"RolePermissionKey"),
      ('EDIT_LAYOUT'::"RolePermissionKey"),
      ('MANAGE_GUEST_CUSTOM_FIELDS'::"RolePermissionKey")
  ) AS perms(permission_key);

  UPDATE "PartyHost"
    SET "role_id" = inserted_id
    WHERE "role_id" IS NULL;

END $$;

-- Luego de establecer valores y defaults, hacés el campo NOT NULL
ALTER TABLE "PartyHost" ALTER COLUMN "role_id" SET NOT NULL;