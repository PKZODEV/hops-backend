import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  MinLength,
} from 'class-validator';
import { RegistrationRole } from '@prisma/client';

export class RegisterRequestDto {
  @IsEnum(RegistrationRole, { message: 'ประเภทผู้ลงทะเบียนไม่ถูกต้อง' })
  role: RegistrationRole;

  @IsString()
  @MinLength(1, { message: 'กรุณากรอกชื่อ' })
  name: string;

  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'เบอร์โทรไม่ถูกต้อง' })
  phone: string;

  @IsString()
  @MinLength(1, { message: 'กรุณากรอกชื่อกิจการ' })
  businessName: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsObject()
  documents: Record<string, string>;
}
