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

    @Post('register')
    @HttpCode(HttpStatus.OK)
    async register(@Body() dto: RegisterDto) {
        try {
            const user = await this.authService.register(dto)
            return user
        } catch (error) {
            throw error
        }
        
    }
}
