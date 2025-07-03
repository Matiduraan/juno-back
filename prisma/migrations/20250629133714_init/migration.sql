-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLANNER', 'HOST');

-- CreateEnum
CREATE TYPE "LayoutType" AS ENUM ('PARTY', 'MODEL');

-- CreateEnum
CREATE TYPE "GuestStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'PENDING');

-- CreateEnum
CREATE TYPE "HostInvitationStatus" AS ENUM ('PENDING', 'SENT', 'ACCEPTED');

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_role" "UserRole" NOT NULL DEFAULT 'PLANNER',
    "password" TEXT NOT NULL,
    "google_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "token_id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "GoogleRefreshToken" (
    "token_id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleRefreshToken_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "Layout" (
    "layout_id" SERIAL NOT NULL,
    "layout_owner_id" INTEGER NOT NULL,
    "layout_name" TEXT NOT NULL,
    "layout_type" "LayoutType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "layout_description" TEXT,

    CONSTRAINT "Layout_pkey" PRIMARY KEY ("layout_id")
);

-- CreateTable
CREATE TABLE "LayoutItem" (
    "layout_item_id" SERIAL NOT NULL,
    "layout_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "layout_item_color" TEXT,
    "layout_item_name" TEXT NOT NULL,
    "layout_item_position_x" DOUBLE PRECISION NOT NULL,
    "layout_item_position_y" DOUBLE PRECISION NOT NULL,
    "layout_item_radius" DOUBLE PRECISION,
    "layout_item_rotation" DOUBLE PRECISION NOT NULL,
    "layout_item_shape" TEXT,
    "layout_item_size" DOUBLE PRECISION,
    "layout_item_type" TEXT NOT NULL,
    "layout_item_seat_count" INTEGER DEFAULT 4,
    "layout_item_height" DOUBLE PRECISION,
    "layout_item_width" DOUBLE PRECISION,

    CONSTRAINT "LayoutItem_pkey" PRIMARY KEY ("layout_item_id")
);

-- CreateTable
CREATE TABLE "PartyMoment" (
    "moment_id" SERIAL NOT NULL,
    "moment_description" TEXT NOT NULL,
    "moment_type_id" INTEGER NOT NULL,
    "moment_time_start" TEXT NOT NULL,
    "moment_time_end" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "moment_name" TEXT NOT NULL,
    "party_id" INTEGER NOT NULL,

    CONSTRAINT "PartyMoment_pkey" PRIMARY KEY ("moment_id")
);

-- CreateTable
CREATE TABLE "PartyMomentType" (
    "moment_type_id" SERIAL NOT NULL,
    "moment_type_name" TEXT NOT NULL,
    "moment_type_color" TEXT NOT NULL,
    "moment_type_icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "PartyMomentType_pkey" PRIMARY KEY ("moment_type_id")
);

-- CreateTable
CREATE TABLE "Party" (
    "party_id" SERIAL NOT NULL,
    "party_name" TEXT NOT NULL,
    "organizer_id" INTEGER NOT NULL,
    "layout_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "party_date" TIMESTAMP(3) NOT NULL,
    "party_end_time" TEXT NOT NULL,
    "party_start_time" TEXT NOT NULL,
    "google_calendar_id" TEXT,
    "party_location_link" TEXT,
    "party_location_name" TEXT NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("party_id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "event_id" SERIAL NOT NULL,
    "party_id" INTEGER NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_start" TIMESTAMP(3) NOT NULL,
    "event_end" TIMESTAMP(3) NOT NULL,
    "google_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "event_description" TEXT,
    "event_location" TEXT,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "PartyGuest" (
    "party_id" INTEGER NOT NULL,
    "guest_status" "GuestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "guest_email" TEXT,
    "guest_name" TEXT NOT NULL,
    "guest_notes" TEXT,
    "guest_phone" TEXT,
    "guest_avatar" TEXT,
    "guest_seat_id" INTEGER,
    "guest_id" SERIAL NOT NULL,

    CONSTRAINT "PartyGuest_pkey" PRIMARY KEY ("guest_id")
);

-- CreateTable
CREATE TABLE "PartyHost" (
    "party_host_id" SERIAL NOT NULL,
    "party_id" INTEGER NOT NULL,
    "host_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyHost_pkey" PRIMARY KEY ("party_host_id")
);

-- CreateTable
CREATE TABLE "HostInvitation" (
    "invitation_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "party_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "HostInvitationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "HostInvitation_pkey" PRIMARY KEY ("invitation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleRefreshToken_token_key" ON "GoogleRefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleRefreshToken_user_id_key" ON "GoogleRefreshToken"("user_id");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleRefreshToken" ADD CONSTRAINT "GoogleRefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Layout" ADD CONSTRAINT "Layout_layout_owner_id_fkey" FOREIGN KEY ("layout_owner_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayoutItem" ADD CONSTRAINT "LayoutItem_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "Layout"("layout_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMoment" ADD CONSTRAINT "PartyMoment_moment_type_id_fkey" FOREIGN KEY ("moment_type_id") REFERENCES "PartyMomentType"("moment_type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMoment" ADD CONSTRAINT "PartyMoment_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyMomentType" ADD CONSTRAINT "PartyMomentType_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "Layout"("layout_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGuest" ADD CONSTRAINT "PartyGuest_guest_seat_id_fkey" FOREIGN KEY ("guest_seat_id") REFERENCES "LayoutItem"("layout_item_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyGuest" ADD CONSTRAINT "PartyGuest_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyHost" ADD CONSTRAINT "PartyHost_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyHost" ADD CONSTRAINT "PartyHost_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostInvitation" ADD CONSTRAINT "HostInvitation_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "Party"("party_id") ON DELETE RESTRICT ON UPDATE CASCADE;
