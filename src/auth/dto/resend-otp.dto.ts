import { IsEmail } from 'class-validator';

export class ResendOtpDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;
}
