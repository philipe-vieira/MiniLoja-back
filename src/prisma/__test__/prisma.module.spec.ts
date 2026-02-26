import { Test, TestingModule } from '@nestjs/testing';
import { AuditContextService } from '../audit-context.service';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';

describe('PrismaModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  it('should provide PrismaService and AuditContextService', () => {
    const prisma = moduleRef.get(PrismaService);
    const auditContextService = moduleRef.get(AuditContextService);

    expect(prisma).toBeDefined();
    expect(auditContextService).toBeDefined();
  });
});
