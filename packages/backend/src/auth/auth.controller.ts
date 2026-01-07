import {
    Body,
    Controller,
    Post,
    HttpCode,
    HttpStatus,
    Logger,
    Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

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
}
