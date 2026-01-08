import { IsEmail, IsNotEmpty, MinLength, MaxLength, IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
