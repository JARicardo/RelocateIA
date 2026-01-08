import { PrismaClient } from '@prisma/client';
import { EmailVerificationRepository } from 'src/modules/auth/repositories/email-verification-token.repository';
import { generateToken, hashToken } from 'src/modules/auth/utils/token.utils';

import { VerifyEmailDto } from 'src/modules/auth/dto/verify-email.dto';
import { ResendVerificationDto} from 'src/modules/auth/dto/resend-verification.dto';


const VERIFICATION_TOKEN_TTL_MINUTES = 30;

export class EmailVerificationService {
  private readonly repo: EmailVerificationRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new EmailVerificationRepository(prisma);
  }

  async generateVerificationToken(userId: string): Promise<string> {
    const token = generateToken();
    const tokenHash = hashToken(token);

    const expiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000,
    );

    await this.repo.createToken({
      userId,
      tokenHash,
      expiresAt,
    });

    return token;
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const tokenHash = hashToken(dto.token);

    await this.prisma.$transaction(async (tx) => {
      const repo = new EmailVerificationRepository(tx);

      const verificationToken = await repo.findValidToken(tokenHash);

      if (!verificationToken) {
        return;
      }

      const { user } = verificationToken;

      if (!user.isEmailVerified) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            isEmailVerified: true,
            sessionVersion: { increment: 1 },
          },
        });
      }

      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      });
    });
  }

  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        deleted: false,
        isEmailVerified: false,
      },
    });

    if (!user) {
      return;
    }

    const token = await this.generateVerificationToken(user.id);

    console.log(
      `Resend verify email link: /verify-email?token=${token}`,
    );
  }
}
