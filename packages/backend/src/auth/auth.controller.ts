import {
    Body,
    Controller,
    Post,
    HttpCode,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

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
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }
}
