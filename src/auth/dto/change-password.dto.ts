import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' })
  newPassword: string;
}
