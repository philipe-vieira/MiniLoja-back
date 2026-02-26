import { Global, Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import {
  createLoggerConfigFromEnv,
  LOGGER_CONFIG_TOKEN,
} from './logger.config';

@Global()
@Module({
  providers: [
    {
      provide: LOGGER_CONFIG_TOKEN,
      useFactory: () => createLoggerConfigFromEnv(process.env),
    },
    AppLoggerService,
  ],
  exports: [AppLoggerService, LOGGER_CONFIG_TOKEN],
})
export class LoggerModule {}
