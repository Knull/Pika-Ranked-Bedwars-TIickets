-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "added_roles" JSONB,
ADD COLUMN     "added_user" JSONB,
ADD COLUMN     "duration" INTEGER;
