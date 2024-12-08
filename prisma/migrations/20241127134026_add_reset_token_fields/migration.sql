-- AlterTable
ALTER TABLE "User" ALTER COLUMN "resetTokenExpire" DROP NOT NULL,
ALTER COLUMN "resetTokenExpire" DROP DEFAULT;
