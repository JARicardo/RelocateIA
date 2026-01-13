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
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';

//SERVICES
import { AuthService } from 'src/modules/auth/auth.service';
import { EmailVerificationService } from 'src/modules/auth/services/email-verification-token.service';

//DTOs
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { LoginDto } from 'src/modules/auth/dto/login.dto';
import { VerifyEmailDto } from 'src/modules/auth/dto/verify-email.dto';
import { ResendVerificationDto } from 'src/modules/auth/dto/resend-verification.dto';
import { RequestPasswordResetDto } from 'src/modules/auth/dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from 'src/modules/auth/dto/confirm-password-reset.dto';

//GUARDS
import { IsAuthenticatedGuard } from 'src/modules/auth/guards/is_authtenticated.guard';

//ERRORS
import { WeakPasswordError } from 'src/modules/auth/errors/weak-password.error';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';


@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private readonly authService: AuthService,
        private readonly emailVerificationService: EmailVerificationService
    ) { }

    private buildLogContext(req: Request) {
        return {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.get('x-request-id'),
        };
    }

    @Post('register')
    @Throttle({ default: { limit: 10, ttl: 60 } })
    @HttpCode(HttpStatus.CREATED)
    async register(@Body() dto: RegisterDto) {
        try {
            await this.authService.register(dto);
        } catch (err) {
            if (err instanceof WeakPasswordError) {
                throw new BadRequestException(err.message);
            }
            throw err;
        }
    }

    @Post('login')
    @Throttle({ default: { limit: 5, ttl: 60 } })
    @HttpCode(HttpStatus.OK)
    async login(@Body() dto: LoginDto, @Req() req: Request) {
        const context = this.buildLogContext(req);

        const user = await this.authService.login(dto, context);

        await new Promise<void>((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isEmailVerified = user.isEmailVerified;

        this.logger.log('auth.login.success', {
            userId: user.id,
            requestId: context.requestId,
        });

        return {
            id: user.id,
            username: user.username,
        };
    }

    @Post('logout')
    async logout(@Req() req: Request, @Res() res: Response) {
        const userId = req.session?.userId;

        if (!req.session) {
            return res.status(200).json({ message: 'Logged out' });
        }

        req.session.destroy((err) => {
            if (err) {
                this.logger.error('Error destroying session', err.stack);
                return res.status(200).json({ message: 'Logged out' });
            }

            res.clearCookie('relocateia.sid');
            this.logger.log('auth.logout.success', { userId });
            return res.status(200).json({ message: 'Logged out' });
        });
    }

    @UseGuards(IsAuthenticatedGuard)
    @Get('me')
    getMe(@Req() req: Request) {
        return { userId: req.session.userId };
    }

    @Get('verify-email')
    @Throttle({ default: { limit: 10, ttl: 60 } })
    async verifyEmail(@Query() dto: VerifyEmailDto, @Req() req: Request) {
        const context = this.buildLogContext(req);

        await this.emailVerificationService.verifyEmail(dto);

        this.logger.log('Email verified', {
            requestId: context.requestId ?? randomUUID(),
        });

        return { message: 'Email verification processed' };
    }

    @Post('resend-verification')
    @Throttle({ default: { limit: 3, ttl: 15 * 60 } })
    @HttpCode(HttpStatus.OK)
    async resendVerification(@Body() dto: ResendVerificationDto) {
        await this.emailVerificationService.resendVerification(dto);

        return {
            message: 'If the email exists, a verification link was sent',
        };
    }

    @Post('password-reset/request')
    @Throttle({ default: { limit: 3, ttl: 15 * 60 } })
    @HttpCode(HttpStatus.OK)
    async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
        await this.authService.requestPasswordReset(dto.email);

        return {
            message: 'If the email exists, reset instructions were sent',
        };
    }

    @Post('password-reset/confirm')
    @Throttle({ default: { limit: 5, ttl: 10 * 60 } })
    @HttpCode(HttpStatus.OK)
    async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
        await this.authService.confirmPasswordReset(dto.token, dto.newPassword);

        return {
            message: 'Password reset processed'
        };
    }
}
