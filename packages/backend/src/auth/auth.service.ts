import { Injectable, Inject, ConflictException, InternalServerErrorException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import * as bcrypt from 'bcrypt';

const DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8l7Kq1lYzQWQz6C5cZpZ1xYQ5HcQeW';

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
          username: username.trim(),
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

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Use a dummy password hash to mitigate timing attacks
    const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;

    const passwordMatches = await bcrypt.compare(
      dto.password,
      passwordHash,
    );

    if (!user || !passwordMatches) {
      this.logger.warn(`Login failed for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Login successful for email: ${email}`);

    return {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
