-- AlterTable
ALTER TABLE "users" ADD COLUMN     "verify_code" TEXT,
ADD COLUMN     "verify_code_expiry" TIMESTAMP(3);
