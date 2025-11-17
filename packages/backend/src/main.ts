// packages/server/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET no está definida en el entorno');
  }

  app.use(helmet());
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  app.use(cookieParser(process.env.SESSION_SECRET));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const PgStore = (connectPgSimple as any)(session);

  app.use(
    session({
      store: new PgStore({
        conObject: {
          connectionString: process.env.DATABASE_URL,
        },
        tableName: 'session',
      }),
      name: 'relocateia.sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7 // One week
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
