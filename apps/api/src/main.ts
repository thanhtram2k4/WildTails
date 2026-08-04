import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global exception filter — converts all errors to ApiErrorEnvelope.
  // Stack traces and internal structure are never forwarded to the client.
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3100').split(','),
    credentials: true,
  });

  // No global prefix — routes are /auth/*, /users/*, /planets/*, /health
  const port = process.env['API_PORT'] ?? 3000;
  await app.listen(port);
}

bootstrap();
