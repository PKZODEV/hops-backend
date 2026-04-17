-- CreateEnum
CREATE TYPE "AmenityType" AS ENUM ('HOTEL', 'ROOM');

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "type" "AmenityType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_type_key" ON "Amenity"("name", "type");

-- CreateIndex
CREATE INDEX "Amenity_type_idx" ON "Amenity"("type");

-- Seed hotel amenities
INSERT INTO "Amenity" ("id", "name", "icon", "type", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Wi-Fi ฟรี',              'Wifi',             'HOTEL', true, 10,  NOW(), NOW()),
  (gen_random_uuid()::text, 'อาหารเช้า',               'Coffee',           'HOTEL', true, 20,  NOW(), NOW()),
  (gen_random_uuid()::text, 'ร้านอาหาร',               'UtensilsCrossed',  'HOTEL', true, 30,  NOW(), NOW()),
  (gen_random_uuid()::text, 'ฟิตเนส',                 'Dumbbell',         'HOTEL', true, 40,  NOW(), NOW()),
  (gen_random_uuid()::text, 'ที่จอดรถ',                'Car',              'HOTEL', true, 50,  NOW(), NOW()),
  (gen_random_uuid()::text, 'สระว่ายน้ำ',              'Waves',            'HOTEL', true, 60,  NOW(), NOW()),
  (gen_random_uuid()::text, 'สปา',                    'Sparkles',         'HOTEL', true, 70,  NOW(), NOW()),
  (gen_random_uuid()::text, 'บริการห้องพัก',            'BellRing',         'HOTEL', true, 80,  NOW(), NOW()),
  (gen_random_uuid()::text, 'บริการซักรีด',            'WashingMachine',   'HOTEL', true, 90,  NOW(), NOW()),
  (gen_random_uuid()::text, 'เคาน์เตอร์บริการ 24 ชั่วโมง', 'Users',            'HOTEL', true, 100, NOW(), NOW()),
  (gen_random_uuid()::text, 'ห้องประชุม',              'Presentation',     'HOTEL', true, 110, NOW(), NOW()),
  (gen_random_uuid()::text, 'รับส่งสนามบิน',            'PlaneTakeoff',     'HOTEL', true, 120, NOW(), NOW());

-- Seed in-room amenities
INSERT INTO "Amenity" ("id", "name", "icon", "type", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid()::text, 'เครื่องปรับอากาศ',          'Wind',         'ROOM', true, 10,  NOW(), NOW()),
  (gen_random_uuid()::text, 'Wi-Fi ในห้องพัก',          'Wifi',         'ROOM', true, 20,  NOW(), NOW()),
  (gen_random_uuid()::text, 'โทรทัศน์',                'Tv',           'ROOM', true, 30,  NOW(), NOW()),
  (gen_random_uuid()::text, 'มินิบาร์',                'Wine',         'ROOM', true, 40,  NOW(), NOW()),
  (gen_random_uuid()::text, 'ตู้เย็น',                 'Refrigerator', 'ROOM', true, 50,  NOW(), NOW()),
  (gen_random_uuid()::text, 'ตู้เซฟ',                  'Lock',         'ROOM', true, 60,  NOW(), NOW()),
  (gen_random_uuid()::text, 'อ่างอาบน้ำ',              'Bath',         'ROOM', true, 70,  NOW(), NOW()),
  (gen_random_uuid()::text, 'เครื่องทำน้ำอุ่น',          'ShowerHead',   'ROOM', true, 80,  NOW(), NOW()),
  (gen_random_uuid()::text, 'เครื่องเป่าผม',            'Wind',         'ROOM', true, 90,  NOW(), NOW()),
  (gen_random_uuid()::text, 'ระเบียง',                 'Home',         'ROOM', true, 100, NOW(), NOW()),
  (gen_random_uuid()::text, 'วิวทะเล',                 'Waves',        'ROOM', true, 110, NOW(), NOW()),
  (gen_random_uuid()::text, 'โต๊ะทำงาน',               'Briefcase',    'ROOM', true, 120, NOW(), NOW());
