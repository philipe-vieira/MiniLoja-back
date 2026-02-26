import { BadRequestException } from '@nestjs/common';

export type SortDirection = 'asc' | 'desc';

export type ParsedSort<TField extends string> = {
  field: TField;
  direction: SortDirection;
};

/**
 * Converte string para inteiro positivo com fallback e limite opcional.
 */
export function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  fieldName: string,
  max?: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new BadRequestException(`${fieldName} must be a positive integer`);
  }

  if (max !== undefined && parsed > max) {
    throw new BadRequestException(`${fieldName} must be <= ${max}`);
  }

  return parsed;
}

/**
 * Converte string para boolean aceitando aliases comuns.
 */
export function parseBoolean(
  value: string | undefined,
  fallback: boolean,
  fieldName: string,
): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }

  throw new BadRequestException(`${fieldName} must be a boolean`);
}

/**
 * Interpreta `sort_by` no formato `campo:direcao`.
 */
export function parseSortBy<TField extends string>(
  sortBy: string | undefined,
  params: {
    validFields: readonly TField[];
    defaultField: TField;
    defaultDirection?: SortDirection;
  },
): ParsedSort<TField> {
  const defaultDirection = params.defaultDirection ?? 'asc';

  if (!sortBy) {
    return { field: params.defaultField, direction: defaultDirection };
  }

  const [rawField, rawDirection] = sortBy.split(':');
  const field = rawField?.trim() as TField | undefined;
  const direction = (rawDirection?.trim() || defaultDirection) as
    | SortDirection
    | undefined;

  if (!field || !params.validFields.includes(field)) {
    throw new BadRequestException(
      `sort_by field must be one of: ${params.validFields.join(',')}`,
    );
  }

  if (!direction || !['asc', 'desc'].includes(direction)) {
    throw new BadRequestException('sort_by direction must be asc or desc');
  }

  return { field, direction };
}

/**
 * Monta range de datas com `gte/lte` ou `between`.
 */
export function parseDateRange(params: {
  gte?: string;
  lte?: string;
  between?: string;
  fieldName: string;
}): { gte?: Date; lte?: Date } | undefined {
  const { gte, lte, between, fieldName } = params;

  if (between !== undefined && (gte !== undefined || lte !== undefined)) {
    throw new BadRequestException(
      `${fieldName} between cannot be combined with gte/lte`,
    );
  }

  if (between !== undefined) {
    const values = between.split(',').map((item) => item.trim());
    if (values.length !== 2 || !values[0] || !values[1]) {
      throw new BadRequestException(
        `${fieldName}_between must be in format start,end`,
      );
    }

    const start = parseIsoDate(values[0], `${fieldName}_between start`);
    const end = parseIsoDate(values[1], `${fieldName}_between end`);

    if (start > end) {
      throw new BadRequestException(
        `${fieldName}_between start must be <= end`,
      );
    }

    return { gte: start, lte: end };
  }

  const result: { gte?: Date; lte?: Date } = {};

  if (gte !== undefined) {
    result.gte = parseIsoDate(gte, `${fieldName}_gte`);
  }

  if (lte !== undefined) {
    result.lte = parseIsoDate(lte, `${fieldName}_lte`);
  }

  if (result.gte && result.lte && result.gte > result.lte) {
    throw new BadRequestException(
      `${fieldName}_gte must be <= ${fieldName}_lte`,
    );
  }

  return result.gte || result.lte ? result : undefined;
}

/**
 * Converte string para Date validando formato.
 */
export function parseIsoDate(value: string, fieldName: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid ISO date`);
  }

  return date;
}
