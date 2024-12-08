/*
  Warnings:

  - A unique constraint covering the columns `[fileId]` on the table `Trash` will be added. If there are existing duplicate values, this will fail.
  - Made the column `fileId` on table `Trash` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Trash" DROP CONSTRAINT "Trash_fileId_fkey";

-- AlterTable
ALTER TABLE "Trash" ALTER COLUMN "fileId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Trash_fileId_key" ON "Trash"("fileId");

-- AddForeignKey
ALTER TABLE "Trash" ADD CONSTRAINT "Trash_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
