import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;
}
