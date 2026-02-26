import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { AuditContextService } from '../audit-context.service';
import { AuditLogInterceptor } from '../audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditContextService: jest.Mocked<AuditContextService>;

  beforeEach(() => {
    auditContextService = {
      run: jest.fn((_, callback) => callback()),
      get: jest.fn(),
    } as unknown as jest.Mocked<AuditContextService>;

    interceptor = new AuditLogInterceptor(auditContextService);
  });

  it('should bypass non-http context', async () => {
    const context = { getType: () => 'rpc' } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of('ok') };

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBe(
      'ok',
    );
    expect(auditContextService.run).not.toHaveBeenCalled();
  });

  it('should create audit context from request and run handler', async () => {
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-request-id': 'req-123',
            'x-forwarded-for': '10.0.0.1, 10.0.0.2',
            'user-agent': 'jest',
          },
          method: 'POST',
          originalUrl: '/category',
          params: { id: '1' },
          query: { page: '1' },
          user: { id: 7, role: 'admin' },
        }),
      }),
    } as unknown as ExecutionContext;
    const next: CallHandler = { handle: () => of('ok') };

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toBe(
      'ok',
    );

    expect(auditContextService.run).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
        actorId: '7',
        actorType: 'admin',
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
        metadata: expect.objectContaining({
          method: 'POST',
          path: '/category',
        }),
      }),
      expect.any(Function),
    );
  });
});
