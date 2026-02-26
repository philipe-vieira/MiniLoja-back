import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryFilters,
  CategoryRepository,
  CategorySort,
} from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoryQueryDto } from './dto/list-category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name?.trim();

    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    return this.categoryRepository.create(name);
  }

  async findAll(query: ListCategoryQueryDto) {
    const getAll = this.parseBoolean(query.get_all, false, 'get_all');
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const limit = this.parsePositiveInt(query.limit, 10, 'limit', 100);
    const sort = this.parseSortBy(query.sort_by);

    const filters: CategoryFilters = {};

    if (query.id !== undefined) {
      filters.id = this.parsePositiveInt(query.id, 1, 'id');
    }

    if (query.name !== undefined) {
      const name = query.name.trim();
      if (!name) {
        throw new BadRequestException('name filter cannot be empty');
      }
      filters.name = name;
    }

    const createdAtFilter = this.parseDateRange({
      gte: query.createdAt_gte,
      lte: query.createdAt_lte,
      between: query.createdAt_between,
      fieldName: 'createdAt',
    });
    if (createdAtFilter) {
      filters.createdAt = createdAtFilter;
    }

    const updatedAtFilter = this.parseDateRange({
      gte: query.updatedAt_gte,
      lte: query.updatedAt_lte,
      between: query.updatedAt_between,
      fieldName: 'updatedAt',
    });
    if (updatedAtFilter) {
      filters.updatedAt = updatedAtFilter;
    }

    const skip = getAll ? undefined : (page - 1) * limit;
    const take = getAll ? undefined : limit;

    const [data, total] = await Promise.all([
      this.categoryRepository.findAll({ skip, take, filters, sort }),
      this.categoryRepository.count(filters),
    ]);

    const effectiveLimit = getAll ? (total === 0 ? 0 : total) : limit;
    const totalPages =
      effectiveLimit === 0 ? 0 : Math.ceil(total / effectiveLimit);

    return {
      data,
      meta: {
        page: getAll ? 1 : page,
        limit: effectiveLimit,
        total,
        totalPages,
        hasPreviousPage: getAll ? false : page > 1,
        hasNextPage: getAll ? false : page < totalPages,
        getAll,
        sortBy: `${sort.field}:${sort.direction}`,
      },
    };
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (updateCategoryDto.name !== undefined) {
      const name = updateCategoryDto.name.trim();

      if (!name) {
        throw new BadRequestException('Category name is required');
      }

      return this.categoryRepository.update(id, name);
    }

    return category;
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.categoryRepository.remove(id);
  }

  private parsePositiveInt(
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

  private parseBoolean(
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

  private parseSortBy(sortBy: string | undefined): CategorySort {
    if (!sortBy) {
      return { field: 'id', direction: 'asc' };
    }

    const [rawField, rawDirection] = sortBy.split(':');
    const field = rawField?.trim() as CategorySort['field'] | undefined;
    const direction = (rawDirection?.trim() || 'asc') as
      | CategorySort['direction']
      | undefined;

    const validFields: CategorySort['field'][] = [
      'id',
      'name',
      'createdAt',
      'updatedAt',
    ];

    if (!field || !validFields.includes(field)) {
      throw new BadRequestException(
        `sort_by field must be one of: ${validFields.join(',')}`,
      );
    }

    if (!direction || !['asc', 'desc'].includes(direction)) {
      throw new BadRequestException('sort_by direction must be asc or desc');
    }

    return { field, direction };
  }

  private parseDateRange(params: {
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

      const start = this.parseIsoDate(values[0], `${fieldName}_between start`);
      const end = this.parseIsoDate(values[1], `${fieldName}_between end`);

      if (start > end) {
        throw new BadRequestException(
          `${fieldName}_between start must be <= end`,
        );
      }

      return { gte: start, lte: end };
    }

    const result: { gte?: Date; lte?: Date } = {};

    if (gte !== undefined) {
      result.gte = this.parseIsoDate(gte, `${fieldName}_gte`);
    }

    if (lte !== undefined) {
      result.lte = this.parseIsoDate(lte, `${fieldName}_lte`);
    }

    if (result.gte && result.lte && result.gte > result.lte) {
      throw new BadRequestException(
        `${fieldName}_gte must be <= ${fieldName}_lte`,
      );
    }

    return result.gte || result.lte ? result : undefined;
  }

  private parseIsoDate(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return date;
  }
}
