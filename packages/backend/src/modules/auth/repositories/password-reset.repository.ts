import { Prisma, PasswordResetToken } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaTx) { }

  async create(params: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.passwordResetToken.create({
      data: {
        userId: params.userId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
      },
    });
  }

  async findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async markUsed(tokenId: string): Promise<void> {
    await this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: {
        usedAt: new Date(),
      },
    });
  }
}
