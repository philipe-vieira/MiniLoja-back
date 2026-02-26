import { Global, Module } from '@nestjs/common';
import { AuditContextService } from './audit-context.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, AuditContextService],
  exports: [PrismaService, AuditContextService],
})
export class PrismaModule {}
