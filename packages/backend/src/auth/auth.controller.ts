import {
    Body,
    Controller,
    Post,
    HttpCode,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from 'src/auth/dto/register.dto';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    /**
     * POST /auth/exists
     * Body: { email }
     * Respuesta: { exists: boolean }
     * Status: 200
     */
    @Post('register')
    @HttpCode(HttpStatus.OK)
    async checkUserExists(@Body() dto: RegisterDto) {
        return { "hey": true };
    }
}
