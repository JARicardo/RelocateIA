import { Injectable, Inject, ConflictException, InternalServerErrorException, UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

//DTOs
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { LoginDto } from 'src/modules/auth/dto/login.dto';

//SERVICES
import { EmailVerificationService } from 'src/modules/auth/services/email-verification-token.service';

//REPOSITORIES
import { UserRepository } from 'src/modules/users/repositories/user.repository';

@Injectable()
export class AuthService {
  
  constructor(
    private readonly userRepository: UserRepository, 
    private readonly emailVerificationService: EmailVerificationService
  ) { }

  private readonly logger = new Logger(AuthService.name);
  private readonly DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8l7Kq1lYzQWQz6C5cZpZ1xYQ5HcQeW';


  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.trim();

    const hashedPassword = await bcrypt.hash(
      dto.password,
      Number(process.env.BCRYPT_ROUNDS),
    );

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

    const passwordMatches = await bcrypt.compare(
      dto.password,
      passwordHash,
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
}
