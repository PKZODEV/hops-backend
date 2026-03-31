-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "propertyCategoryId" TEXT;

-- CreateTable
CREATE TABLE "PropertyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyCategory_name_key" ON "PropertyCategory"("name");

-- CreateIndex
CREATE INDEX "Property_propertyCategoryId_idx" ON "Property"("propertyCategoryId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_propertyCategoryId_fkey" FOREIGN KEY ("propertyCategoryId") REFERENCES "PropertyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default property categories
INSERT INTO "PropertyCategory" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'โรงแรม', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'พูลวิลล่า', true, NOW(), NOW()),
  (gen_random_uuid()::text, 'โฮมสเตย์', true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
