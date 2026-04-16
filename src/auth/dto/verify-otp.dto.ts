import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'OTP ต้องเป็น 6 หลัก' })
  otp: string;

  @IsString()
  refCode: string;
}
