import { Injectable, Inject, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { RegisterDto } from 'src/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) { }
  private readonly saltRounds = 12;
  private readonly logger = new Logger(AuthService.name);

  async register(dto: RegisterDto) {
    const { email, username, password } = dto;

    // Hashes the password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    try {
      // Creates the user in database, then return the selects the new created data and returns it
      const user = await this.prisma.user.create({
        data: {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          isEmailVerified: false,
        },
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
        },
      });

      return user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
      ) {
        this.logger.warn(`Registration attempt with existing email: ${email}`);

        throw new ConflictException(
          'Unable to create account with provided credentials',
        );
      }
      this.logger.error(
        `Unexpected error during registration for email: ${email}`,
        err instanceof Error ? err.stack : undefined,
      );

      throw new InternalServerErrorException('Error creating user');
    }
  }
}
