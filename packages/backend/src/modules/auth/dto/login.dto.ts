import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsString()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}
