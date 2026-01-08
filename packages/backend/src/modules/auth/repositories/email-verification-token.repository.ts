import { Prisma, EmailVerificationToken } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

type EmailVerificationWithUser =
  Prisma.EmailVerificationTokenGetPayload<{
    include: { user: true };
  }>;

export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaTx) { }

  createToken(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerificationToken> {
    return this.prisma.emailVerificationToken.create({
      data: params,
    });
  }

  findValidToken(tokenHash: string):Promise<EmailVerificationWithUser | null> {
    return this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
        user: { deleted: false },
      },
      include: {
        user: true,
      },
    });
  }

  markTokenUsed(tokenId: string): Promise<EmailVerificationToken> {
    return this.prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }
}
