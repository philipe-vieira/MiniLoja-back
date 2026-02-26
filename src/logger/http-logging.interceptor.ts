import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { AppLoggerService } from './app-logger.service';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logRequest(request, response, startedAt),
        error: (error: unknown) =>
          this.logError(request, response, startedAt, error),
      }),
    );
  }

  private logRequest(
    request: Request,
    response: Response,
    startedAt: number,
  ): void {
    const durationMs = Date.now() - startedAt;
    const statusCode = response.statusCode ?? 200;
    const message = `${request.method} ${request.originalUrl} ${statusCode} ${durationMs}ms`;

    if (statusCode >= 500) {
      this.logger.error(message, undefined, 'HTTP');
      return;
    }

    if (statusCode >= 400) {
      this.logger.warn(message, 'HTTP');
      return;
    }

    this.logger.log(message, 'HTTP');
  }

  private logError(
    request: Request,
    response: Response,
    startedAt: number,
    error: unknown,
  ): void {
    const durationMs = Date.now() - startedAt;
    const statusCode = response.statusCode ?? 500;
    const message = `${request.method} ${request.originalUrl} ${statusCode} ${durationMs}ms`;
    const trace = error instanceof Error ? error.stack : undefined;

    this.logger.error(message, trace, 'HTTP');
  }
}
