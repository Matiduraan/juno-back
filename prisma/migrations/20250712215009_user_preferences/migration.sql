-- CreateTable
CREATE TABLE "UserPreferences" (
    "preference_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finished_tutorials" TEXT,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_user_id_key" ON "UserPreferences"("user_id");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
