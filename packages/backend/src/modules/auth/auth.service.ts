import { Injectable, Inject, ConflictException, InternalServerErrorException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

//DTOs
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { LoginDto } from 'src/modules/auth/dto/login.dto';

//SERVICES
import { EmailVerificationService } from 'src/modules/auth/services/email-verification-token.service';
import { PasswordHasher } from 'src/modules/auth/services/password-hasher.service';

//REPOSITORIES
import { UserRepository } from 'src/modules/users/repositories/user.repository';
import { PasswordResetRepository } from 'src/modules/auth/repositories/password-reset.repository';

//UTILS
import { generatePasswordResetToken, hashToken } from 'src/modules/auth/utils/token.utils';

import { PASSWORD_POLICY } from 'src/modules/auth/providers/password-policy.provider';
import type { PasswordPolicy } from 'src/modules/auth/policies/password.policy';


@Injectable()
export class AuthService {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly userRepository: UserRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordHasher: PasswordHasher,

    @Inject(PASSWORD_POLICY)
    private readonly passwordPolicy: PasswordPolicy,
  ) { }

  private readonly logger = new Logger(AuthService.name);
  private readonly DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8l7Kq1lYzQWQz6C5cZpZ1xYQ5HcQeW';


  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.trim();

    this.passwordPolicy.validate(dto.password, {
      email,
      username,
    });

    const hashedPassword = await this.passwordHasher.hash(dto.password);

    let user;
    try {
      user = await this.userRepository.createUser({
        email,
        username,
        hashedPassword,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_ALREADY_EXISTS') {
        throw new ConflictException(
          'Unable to create account with provided credentials',
        );
      }

      throw new InternalServerErrorException('Error creating user');
    }

    const verificationToken = await this.emailVerificationService.generateVerificationToken(user.id);

    console.log(
      `Verify email link: /verify-email?token=${verificationToken}`,
    );

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.userRepository.findActiveByEmail(email.toLowerCase().trim());

    // Use a dummy password hash to mitigate timing attacks
    const passwordHash = user?.password ?? this.DUMMY_PASSWORD_HASH;

    const passwordMatches = await this.passwordHasher.verify(
      passwordHash,
      dto.password,
    );

    if (!user || !passwordMatches) {
      this.logger.warn(`Login failed for email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.updateLastLogin(user.id);

    this.logger.log(`Login successful for email: ${email}`);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
    };
  }
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findActiveByEmail(email);

    if (!user) {
      return;
    }

    const { token, tokenHash, expiresAt } = generatePasswordResetToken();

    await this.passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    this.logger.log(
      `Password reset requested for user ${user.id}`,
    );
  }

  async confirmPasswordReset(token: string, newPassword: string,): Promise<void> {
    const tokenHash = hashToken(token);

    await this.prisma.$transaction(async (tx) => {
      const resetRepo = new PasswordResetRepository(tx);
      const userRepo = new UserRepository(tx);

      const resetToken = await resetRepo.findValidByTokenHash(tokenHash);
      if (!resetToken) return;

      const user = await userRepo.findById(resetToken.userId);
      if (!user) return;

      this.passwordPolicy.validate(newPassword, {
        email: user.email,
        username: user.username,
      });

      const hashedPassword = await this.passwordHasher.hash(newPassword);

      await userRepo.updatePasswordAndBumpSession(
        user.id,
        hashedPassword,
      );

      await resetRepo.markUsed(resetToken.id);
    });

  }
}
