export type LogLevel = 'error' | 'warn' | 'log' | 'debug' | 'verbose';

export type LoggerConfig = {
  level: LogLevel;
  enabledLevels: Set<LogLevel> | null;
  consoleEnabled: boolean;
  fileEnabled: boolean;
  filePath: string;
  timestampEnabled: boolean;
  jsonEnabled: boolean;
};

const LOG_LEVELS: ReadonlyArray<LogLevel> = [
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

export const LOGGER_CONFIG_TOKEN = Symbol('LOGGER_CONFIG_TOKEN');

export function createLoggerConfigFromEnv(
  env: NodeJS.ProcessEnv,
): LoggerConfig {
  return {
    level: parseLogLevel(env.LOG_LEVEL, 'log'),
    enabledLevels: parseEnabledLevels(env.LOG_ENABLED_LEVELS),
    consoleEnabled: parseBoolean(env.LOG_CONSOLE_ENABLED, true),
    fileEnabled: parseBoolean(env.LOG_FILE_ENABLED, true),
    filePath: env.LOG_FILE_PATH?.trim() || 'logs/application.log',
    timestampEnabled: parseBoolean(env.LOG_TIMESTAMP_ENABLED, true),
    jsonEnabled: parseBoolean(env.LOG_JSON_ENABLED, false),
  };
}

function parseLogLevel(
  value: string | undefined,
  fallback: LogLevel,
): LogLevel {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return LOG_LEVELS.includes(normalized as LogLevel)
    ? (normalized as LogLevel)
    : fallback;
}

function parseEnabledLevels(value: string | undefined): Set<LogLevel> | null {
  if (!value) {
    return null;
  }

  const levels = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is LogLevel => LOG_LEVELS.includes(item as LogLevel));

  return levels.length > 0 ? new Set(levels) : null;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
}
