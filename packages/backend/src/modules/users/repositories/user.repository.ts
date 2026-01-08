import { Prisma, User } from '@prisma/client';

type PrismaTx = Prisma.TransactionClient;

export class UserRepository {
    constructor(private readonly prisma: PrismaTx) { }

    async findActiveByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: {
                email,
                deleted: false,
            },
        });
    }

    async findUnverifiedByEmail(email: string) {
        return this.prisma.user.findFirst({
            where: {
                email,
                deleted: false,
                isEmailVerified: false,
            },
        });
    }


    updateLastLogin(userId: string): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    }

    async createUser(params: {
        email: string;
        username: string;
        hashedPassword: string;
    }): Promise<User> {
        try {
            return await this.prisma.user.create({
                data: {
                    email: params.email,
                    username: params.username,
                    password: params.hashedPassword,
                    isEmailVerified: false,
                },
            });
        } catch (err) {
            if (
                err instanceof Prisma.PrismaClientKnownRequestError &&
                err.code === 'P2002'
            ) {
                throw new Error('USER_ALREADY_EXISTS');
            }
            throw err;
        }
    }
}
