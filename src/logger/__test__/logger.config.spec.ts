import { createLoggerConfigFromEnv } from '../logger.config';

describe('logger.config', () => {
  it('should load defaults when env is empty', () => {
    const config = createLoggerConfigFromEnv({});

    expect(config.level).toBe('log');
    expect(config.enabledLevels).toBeNull();
    expect(config.consoleEnabled).toBe(true);
    expect(config.fileEnabled).toBe(true);
    expect(config.filePath).toBe('logs/application.log');
    expect(config.timestampEnabled).toBe(true);
    expect(config.jsonEnabled).toBe(false);
  });

  it('should parse all env values', () => {
    const config = createLoggerConfigFromEnv({
      LOG_LEVEL: 'debug',
      LOG_ENABLED_LEVELS: 'error,warn',
      LOG_CONSOLE_ENABLED: 'false',
      LOG_FILE_ENABLED: 'true',
      LOG_FILE_PATH: 'logs/custom.log',
      LOG_TIMESTAMP_ENABLED: 'false',
      LOG_JSON_ENABLED: 'true',
    });

    expect(config.level).toBe('debug');
    expect(config.enabledLevels).toEqual(new Set(['error', 'warn']));
    expect(config.consoleEnabled).toBe(false);
    expect(config.fileEnabled).toBe(true);
    expect(config.filePath).toBe('logs/custom.log');
    expect(config.timestampEnabled).toBe(false);
    expect(config.jsonEnabled).toBe(true);
  });
});
