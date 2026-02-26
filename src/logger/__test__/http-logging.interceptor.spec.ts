import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AppLoggerService } from '../app-logger.service';
import { HttpLoggingInterceptor } from '../http-logging.interceptor';

describe('HttpLoggingInterceptor', () => {
  let interceptor: HttpLoggingInterceptor;
  let logger: jest.Mocked<AppLoggerService>;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as unknown as jest.Mocked<AppLoggerService>;

    interceptor = new HttpLoggingInterceptor(logger);
  });

  function createContext(statusCode = 200): ExecutionContext {
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          originalUrl: '/category',
        }),
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should bypass non-http context', async () => {
    const context = {
      getType: () => 'rpc',
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of('ok') };

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBe(
      'ok',
    );
    expect(logger.log).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should log success as log', async () => {
    const next: CallHandler = { handle: () => of('ok') };
    await lastValueFrom(interceptor.intercept(createContext(200), next));

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('GET /category 200'),
      'HTTP',
    );
  });

  it('should log client error as warn', async () => {
    const next: CallHandler = { handle: () => of('ok') };
    await lastValueFrom(interceptor.intercept(createContext(404), next));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('GET /category 404'),
      'HTTP',
    );
  });

  it('should log thrown error as error', async () => {
    const next: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };

    await expect(
      lastValueFrom(interceptor.intercept(createContext(500), next)),
    ).rejects.toThrow('boom');

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('GET /category 500'),
      expect.any(String),
      'HTTP',
    );
  });
});
