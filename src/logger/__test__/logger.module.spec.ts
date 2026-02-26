import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '../app-logger.service';
import { LOGGER_CONFIG_TOKEN } from '../logger.config';
import { LoggerModule } from '../logger.module';

describe('LoggerModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [LoggerModule],
    }).compile();
  });

  it('should provide logger service and config token', () => {
    const logger = moduleRef.get<AppLoggerService>(AppLoggerService);
    const config = moduleRef.get(LOGGER_CONFIG_TOKEN);

    expect(logger).toBeDefined();
    expect(config).toBeDefined();
  });
});
