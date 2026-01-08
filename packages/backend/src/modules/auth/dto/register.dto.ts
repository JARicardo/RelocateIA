import { IsEmail, IsNotEmpty, MinLength, Matches, IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @MinLength(1)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username can contain only letters, numbers, ., _, -',
  })
  username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'Password must be at least 10 characters long',
  })
  @Matches(/^(?=.*[a-z])/, {
    message: 'Password must contain at least one lowercase letter',
  })
  @Matches(/^(?=.*[A-Z])/, {
    message: 'Password must contain at least one uppercase letter',
  })
  @Matches(/^(?=.*\d)/, {
    message: 'Password must contain at least one number',
  })
  @Matches(/^(?=.*[\W_])/, {
    message: 'Password must contain at least one special character',
  })
  password!: string;
}
