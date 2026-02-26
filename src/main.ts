import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLoggerService } from './logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);
  await app.listen(process.env.PORT ?? 3000);
  logger.log(
    `Server listening on port ${process.env.PORT ?? 3000}`,
    'Bootstrap',
  );
}
void bootstrap();
