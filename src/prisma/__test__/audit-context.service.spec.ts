import { AuditContextService } from '../audit-context.service';

describe('AuditContextService', () => {
  it('should return context inside run scope', () => {
    const service = new AuditContextService();

    const value = service.run({ requestId: 'req-1' }, () => {
      return service.get();
    });

    expect(value).toEqual({ requestId: 'req-1' });
  });

  it('should return undefined outside run scope', () => {
    const service = new AuditContextService();
    expect(service.get()).toBeUndefined();
  });
});
