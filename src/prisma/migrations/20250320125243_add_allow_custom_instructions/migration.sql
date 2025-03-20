/*
  Warnings:

  - You are about to drop the column `useCustomInstructions` on the `TicketConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TicketConfig" DROP COLUMN "useCustomInstructions",
ADD COLUMN     "allowCustomInstructions" BOOLEAN NOT NULL DEFAULT false;
