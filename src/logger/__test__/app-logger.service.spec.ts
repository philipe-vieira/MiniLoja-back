import { appendFileSync, mkdirSync } from 'node:fs';
import { AppLoggerService } from '../app-logger.service';
import { LoggerConfig } from '../logger.config';

jest.mock('node:fs', () => ({
  appendFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('AppLoggerService', () => {
  const stdoutWriteSpy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation(() => true);
  const stderrWriteSpy = jest
    .spyOn(process.stderr, 'write')
    .mockImplementation(() => true);

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    stdoutWriteSpy.mockRestore();
    stderrWriteSpy.mockRestore();
  });

  function createService(partial: Partial<LoggerConfig> = {}) {
    const config: LoggerConfig = {
      level: 'log',
      enabledLevels: null,
      consoleEnabled: true,
      fileEnabled: true,
      filePath: 'logs/test.log',
      timestampEnabled: false,
      jsonEnabled: false,
      ...partial,
    };

    return new AppLoggerService(config);
  }

  it('should create log directory when file logging is enabled', () => {
    createService({ fileEnabled: true, filePath: 'logs/test.log' });

    expect(mkdirSync).toHaveBeenCalledWith('logs', { recursive: true });
  });

  it('should write to stdout and file for log level', () => {
    const logger = createService();
    logger.log('hello', 'Test');

    expect(process.stdout.write).toHaveBeenCalled();
    expect(appendFileSync).toHaveBeenCalledWith(
      'logs/test.log',
      expect.stringContaining('[LOG] [Test] hello'),
      'utf8',
    );
  });

  it('should write errors to stderr', () => {
    const logger = createService();
    logger.error('boom', 'trace', 'Test');

    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] [Test] boom'),
    );
  });

  it('should respect minimum log level', () => {
    const logger = createService({ level: 'warn' });
    logger.debug('hidden');
    logger.log('hidden');
    logger.warn('visible');

    expect(process.stdout.write).toHaveBeenCalledTimes(1);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] visible'),
    );
  });

  it('should respect enabledLevels list over level threshold', () => {
    const logger = createService({
      level: 'verbose',
      enabledLevels: new Set(['error']),
    });

    logger.warn('hidden');
    logger.error('visible');

    expect(process.stdout.write).not.toHaveBeenCalled();
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] visible'),
    );
  });

  it('should print json when configured', () => {
    const logger = createService({ jsonEnabled: true });
    logger.log({ event: 'x' }, 'Ctx');

    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringMatching(/"level":"log"/),
    );
  });
});
