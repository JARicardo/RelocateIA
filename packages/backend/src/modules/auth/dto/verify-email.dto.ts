import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(32, 512)
  token!: string;
}