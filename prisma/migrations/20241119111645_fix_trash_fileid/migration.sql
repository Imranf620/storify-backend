-- DropForeignKey
ALTER TABLE "Trash" DROP CONSTRAINT "Trash_fileId_fkey";

-- AddForeignKey
ALTER TABLE "Trash" ADD CONSTRAINT "Trash_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
