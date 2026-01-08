import { IsString, MinLength, MaxLength } from 'class-validator';

export class ConfirmPasswordResetDto {
  @IsString()
  token!: string;

  @MinLength(12)
  @MaxLength(128)
  newPassword!: string;
}
