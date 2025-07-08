-- CreateTable
CREATE TABLE "PartyInvitation" (
    "invitation_id" SERIAL NOT NULL,
    "party_id" INTEGER NOT NULL,
    "email_body" TEXT NOT NULL,
    "email_subject" TEXT NOT NULL,
    "message_content" TEXT NOT NULL,
    "invitation_file_link" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyInvitation_pkey" PRIMARY KEY ("invitation_id")
);

-- AddForeignKey
ALTER TABLE "PartyInvitation" ADD CONSTRAINT "PartyInvitation_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE RESTRICT ON UPDATE CASCADE;
