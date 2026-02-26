import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLoggerService } from './logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  if (isEnabled(process.env.SWAGGER_ENABLED, true)) {
    const swaggerTitle = process.env.SWAGGER_TITLE ?? 'Miniloja API';
    const swaggerDescription =
      process.env.SWAGGER_DESCRIPTION ??
      'Documentacao das rotas da API da Miniloja';
    const swaggerVersion = process.env.SWAGGER_VERSION ?? '1.0.0';
    const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';
    const swaggerServers = parseSwaggerServers(process.env.SWAGGER_SERVERS);

    const builder = new DocumentBuilder()
      .setTitle(swaggerTitle)
      .setDescription(swaggerDescription)
      .setVersion(swaggerVersion);

    for (const server of swaggerServers) {
      builder.addServer(server);
    }

    const config = builder.build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(swaggerPath, app, document);

    logger.log(
      `Swagger available at /${swaggerPath.replace(/^\/+/, '')}`,
      'Swagger',
    );
  }

  await app.listen(process.env.PORT ?? 3000);
  logger.log(
    `Server listening on port ${process.env.PORT ?? 3000}`,
    'Bootstrap',
  );
}

function isEnabled(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}

function parseSwaggerServers(value: string | undefined): string[] {
  if (!value) {
    return ['/api'];
  }

  const servers = value
    .split(',')
    .map((server) => server.trim())
    .filter((server) => server.length > 0);

  return servers.length > 0 ? servers : ['/api'];
}

void bootstrap();
