import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'อีเมลไม่ถูกต้อง' })
  email: string;

  @IsString()
  password: string;
}
