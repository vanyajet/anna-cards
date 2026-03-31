-- CreateEnum
CREATE TYPE "CardMode" AS ENUM ('FREE', 'CRYPTO');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "mode" "CardMode" NOT NULL DEFAULT 'CRYPTO',
ALTER COLUMN "burnTxSig" DROP NOT NULL;
