import { IsEmail } from 'class-validator';
import { Transform } from 'class-transformer';

export class RequestPasswordResetDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email!: string;
}
