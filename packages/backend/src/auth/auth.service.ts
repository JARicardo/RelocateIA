import { Injectable, Inject, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { RegisterDto } from 'src/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(@Inject('PRISMA') private prisma: PrismaClient) { }
  private readonly saltRounds = 12;

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
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
          // extraemos qué campo causó conflicto si está disponible
          const metaTarget = (err.meta as any)?.target;
          const field = Array.isArray(metaTarget) ? metaTarget.join(', ') : metaTarget;
          throw new ConflictException(`Value already exists for field: ${field ?? 'unknown'}`);
        }
      }
      // cualquier otro error
      throw new InternalServerErrorException('Error creating user');
    }
  }
}
