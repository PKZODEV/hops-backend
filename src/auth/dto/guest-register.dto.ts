import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class GuestRegisterDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
  password: string;

  @IsString()
  @MinLength(9, { message: 'เบอร์โทรไม่ถูกต้อง' })
  phone: string;

  @IsOptional()
  @IsString()
  name?: string;
}
