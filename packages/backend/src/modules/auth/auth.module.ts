import { Module } from '@nestjs/common';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/auth.service';
import { PrismaModule } from 'prisma/prisma.module';
import { PasswordPolicyProvider } from 'src/modules/auth/providers/password-policy.provider';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordPolicyProvider],
  exports: [AuthService],
})
export class AuthModule {}