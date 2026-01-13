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

import { AuthLogContext } from 'src/modules/auth/types/auth-log-context';

import { PASSWORD_POLICY } from 'src/modules/auth/providers/password-policy.provider';
import type { PasswordPolicy } from 'src/modules/auth/policies/password.policy';


@Injectable()
export class AuthService {

  constructor(
    private readonly prisma: PrismaClient,
    private readonly userRepository: UserRepository,
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

    this.passwordPolicy.validate(dto.password, { email, username });

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

      this.logger.error('User registration failed', err instanceof Error ? err.stack : undefined);
      throw new InternalServerErrorException('Error creating user');
    }

    await this.emailVerificationService.generateVerificationToken(user.id);

    this.logger.log('auth.register.success', { userId: user.id });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    };
  }

  async login(dto: LoginDto, context?: AuthLogContext) {
    const { email, password } = dto;

    const user = await this.userRepository.findActiveByEmail(email.toLowerCase().trim());

    const passwordHash = user?.password ?? this.DUMMY_PASSWORD_HASH;

    const passwordMatches = await this.passwordHasher.verify(
      passwordHash,
      password,
    );

    if (!user || !passwordMatches) {
      this.logger.warn('auth.login.failed', {
        reason: 'invalid_credentials',
        ip: context?.ip,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userRepository.updateLastLogin(user.id);

    this.logger.log('auth.login.success', {
      userId: user.id,
      ip: context?.ip,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
    });

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isEmailVerified: user.isEmailVerified,
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepository.findActiveByEmail(normalizedEmail);

    if (!user) {
      return;
    }

    const { tokenHash, expiresAt } = generatePasswordResetToken();

    await this.prisma.$transaction(async (tx) => {
      const resetRepo = new PasswordResetRepository(tx);

      await resetRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });
    });

    this.logger.log('auth.password_reset.requested', { userId: user.id });
  }

  async confirmPasswordReset(token: string, newPassword: string,): Promise<void> {
    const tokenHash = hashToken(token);

    let user;
    await this.prisma.$transaction(async (tx) => {
      const resetRepo = new PasswordResetRepository(tx);
      const userRepo = new UserRepository(tx);

      const resetToken = await resetRepo.findValidByTokenHash(tokenHash);
      if (!resetToken) return;

      user = await userRepo.findById(resetToken.userId);
      if (!user) return;

      this.passwordPolicy.validate(newPassword, {
        email: user.email,
        username: user.username,
      });

      const hashedPassword = await this.passwordHasher.hash(newPassword);

      await userRepo.updatePasswordAndBumpSession(user.id, hashedPassword);

      await resetRepo.markUsed(resetToken.id);

    });

    this.logger.log('auth.password_reset.completed', { userId: user.id });
  }
}
