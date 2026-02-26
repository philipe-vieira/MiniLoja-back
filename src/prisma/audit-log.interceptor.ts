import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable, defer } from 'rxjs';
import { AuditContext, AuditContextService } from './audit-context.service';

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  method?: string;
  originalUrl?: string;
  url?: string;
  params?: unknown;
  query?: unknown;
  user?: Record<string, unknown>;
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditContextService: AuditContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const requestId = this.getHeader(request, 'x-request-id') ?? randomUUID();
    const forwardedFor = this.getHeader(request, 'x-forwarded-for');
    const ipAddress =
      forwardedFor?.split(',')[0]?.trim() ??
      request.ip ??
      request.socket?.remoteAddress ??
      null;

    const auditContext: AuditContext = {
      requestId,
      actorId: this.extractActorId(request.user),
      actorType: this.extractActorType(request.user),
      ipAddress,
      userAgent: this.getHeader(request, 'user-agent') ?? null,
      metadata: {
        method: request.method ?? null,
        path: request.originalUrl ?? request.url ?? null,
        params: request.params ?? null,
        query: request.query ?? null,
      },
    };

    return defer(() =>
      this.auditContextService.run(auditContext, () => next.handle()),
    );
  }

  private getHeader(request: RequestLike, headerName: string): string | null {
    const rawValue = request.headers?.[headerName];

    if (Array.isArray(rawValue)) {
      return rawValue[0] ?? null;
    }

    return rawValue ?? null;
  }

  private extractActorId(user?: Record<string, unknown>): string | null {
    const rawId = user?.id;
    if (typeof rawId === 'string' || typeof rawId === 'number') {
      return String(rawId);
    }

    return null;
  }

  private extractActorType(user?: Record<string, unknown>): string | null {
    const rawActorType = user?.type ?? user?.role;
    if (typeof rawActorType === 'string') {
      return rawActorType;
    }

    return null;
  }
}
