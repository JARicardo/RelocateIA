import {
    Body,
    Controller,
    Post,
    Get,
    HttpCode,
    HttpStatus,
    Logger,
    Req,
    Res,
    UseGuards,
    Query
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

//SERVICES
import { AuthService } from 'src/modules/auth/auth.service';
import { EmailVerificationService } from 'src/modules/auth/services/email-verification-token.service';

//DTOs
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { VerifyEmailDto } from 'src/modules/auth/dto/verify-email.dto';
import { ResendVerificationDto} from 'src/modules/auth/dto/resend-verification.dto';

//GUARDS
import { IsAuthenticatedGuard } from 'src/modules/auth/guards/is_authtenticated.guard';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly emailVerificationService: EmailVerificationService
    ) { }

    @Post('register')
    @Throttle({
        default: {
            limit: 10,
            ttl: 60,
        },
    })
    @HttpCode(HttpStatus.OK)
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto)
    }

    @Post('login')
    @Throttle({
        default: {
            limit: 5,
            ttl: 60,
        },
    })
    async login(@Body() dto: LoginDto, @Req() request: Request) {
        const user = await this.authService.login(dto);

        // Session management
        await new Promise<void>((resolve, reject) => {
            request.session.regenerate((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        request.session.userId = user.id;
        request.session.username = user.username;
        request.session.isEmailVerified = user.isEmailVerified;

        return {
            id: user.id,
            email: user.email,
        }
    }

    @Post('logout')
    async logout(@Req() req: Request, @Res() res: Response) {
        const userId = req.session?.userId;

        if (userId) {
            this.logger.log(`User logged out: ${userId}`);
        }

        if (!req.session) {
            return res.status(200).json({ message: 'Logged out' });
        }

        req.session.destroy((err) => {
            if (err) {
                this.logger.error('Error destroying session', err.stack);
                return res.status(200).json({ message: 'Logged out' });
            }

            res.clearCookie('connect.sid');
            return res.status(200).json({ message: 'Logged out' });
        });
    }

    @UseGuards(IsAuthenticatedGuard)
    @Get('me')
    getMe(@Req() req: Request) {
        return { userId: req.session.userId };
    }

    @Get('verify-email')
    @Throttle({
        default: {
            limit: 10,
            ttl: 60,
        },
    })
    async verifyEmail(@Query() dto: VerifyEmailDto) {
        await this.emailVerificationService.verifyEmail(dto);

        return { message: 'Email verification processed' };
    }

    @Post('resend-verification')
    @Throttle({
        default: {
            limit: 3,
            ttl: 900,
        },
    })
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body() dto: ResendVerificationDto) {
        await this.emailVerificationService.resendVerification(dto);

        return {
            message: 'If the email exists, a verification link was sent',
        };
    }
}
