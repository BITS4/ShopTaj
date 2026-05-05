-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone_otp" TEXT,
ADD COLUMN     "phone_otp_expiry" TIMESTAMP(3);
