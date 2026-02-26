import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { LOGGER_CONFIG_TOKEN, LogLevel } from './logger.config';
import type { LoggerConfig } from './logger.config';

type LogPayload = {
  timestamp?: string;
  level: LogLevel;
  context?: string;
  message: string;
  trace?: string;
  metadata?: unknown;
};

const PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  log: 2,
  debug: 3,
  verbose: 4,
};

@Injectable()
export class AppLoggerService implements LoggerService {
  constructor(
    @Inject(LOGGER_CONFIG_TOKEN) private readonly config: LoggerConfig,
  ) {
    if (this.config.fileEnabled) {
      mkdirSync(dirname(this.config.filePath), { recursive: true });
    }
  }

  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
    metadata?: unknown,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const payload: LogPayload = {
      timestamp: this.config.timestampEnabled
        ? new Date().toISOString()
        : undefined,
      level,
      context,
      message: this.formatMessage(message),
      trace,
      metadata,
    };

    const line = this.formatLine(payload);

    if (this.config.consoleEnabled) {
      this.writeConsole(level, line);
    }

    if (this.config.fileEnabled) {
      this.writeFile(line);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.config.enabledLevels) {
      return this.config.enabledLevels.has(level);
    }

    return PRIORITY[level] <= PRIORITY[this.config.level];
  }

  private formatLine(payload: LogPayload): string {
    if (this.config.jsonEnabled) {
      return `${JSON.stringify(payload)}\n`;
    }

    const sections: string[] = [];
    if (payload.timestamp) {
      sections.push(payload.timestamp);
    }
    sections.push(`[${payload.level.toUpperCase()}]`);
    if (payload.context) {
      sections.push(`[${payload.context}]`);
    }
    sections.push(payload.message);
    if (payload.metadata !== undefined) {
      sections.push(this.formatMessage(payload.metadata));
    }
    if (payload.trace) {
      sections.push(`\n${payload.trace}`);
    }

    return `${sections.join(' ')}\n`;
  }

  private formatMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private writeConsole(level: LogLevel, line: string): void {
    if (level === 'error') {
      process.stderr.write(line);
      return;
    }

    process.stdout.write(line);
  }

  private writeFile(line: string): void {
    try {
      appendFileSync(this.config.filePath, line, 'utf8');
    } catch (error) {
      process.stderr.write(
        `[LOGGER] Failed writing log file "${this.config.filePath}": ${String(error)}\n`,
      );
    }
  }
}
