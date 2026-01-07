import {
    Body,
    Controller,
    Post,
    HttpCode,
    HttpStatus,
    Logger,
    Req,
    Res
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LoginDto } from 'src/auth/dto/login.dto';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

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
}
