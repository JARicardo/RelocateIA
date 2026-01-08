import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as Joi from 'joi';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [    
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        SESSION_SECRET: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        NODE_ENV: Joi.string().valid('development', 'production').default('development'),
      })
    }),
    AuthModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
