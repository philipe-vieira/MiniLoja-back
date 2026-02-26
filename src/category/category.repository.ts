import { Injectable } from '@nestjs/common';
import { Category } from './entities/category.entity';
import { PrismaService } from '../prisma/prisma.service';

export type CategoryFilters = {
  id?: number;
  name?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  updatedAt?: {
    gte?: Date;
    lte?: Date;
  };
};

export type CategorySort = {
  field: 'id' | 'name' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
};

export type FindCategoriesParams = {
  skip?: number;
  take?: number;
  filters: CategoryFilters;
  sort: CategorySort;
};

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(name: string): Promise<Category> {
    return this.prisma.category.create({
      data: { name },
    });
  }

  findAll(params: FindCategoriesParams): Promise<Category[]> {
    const where = this.buildWhere(params.filters);

    return this.prisma.category.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { [params.sort.field]: params.sort.direction },
    });
  }

  count(filters: CategoryFilters): Promise<number> {
    const where = this.buildWhere(filters);
    return this.prisma.category.count({ where });
  }

  findById(id: number): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  update(id: number, name: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { name },
    });
  }

  remove(id: number): Promise<Category> {
    return this.prisma.category.delete({
      where: { id },
    });
  }

  private buildWhere(filters: CategoryFilters): Record<string, unknown> {
    const where: Record<string, unknown> = {};

    if (filters.id !== undefined) {
      where.id = filters.id;
    }

    if (filters.name !== undefined) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }

    if (filters.createdAt !== undefined) {
      where.createdAt = {
        ...(filters.createdAt.gte ? { gte: filters.createdAt.gte } : {}),
        ...(filters.createdAt.lte ? { lte: filters.createdAt.lte } : {}),
      };
    }

    if (filters.updatedAt !== undefined) {
      where.updatedAt = {
        ...(filters.updatedAt.gte ? { gte: filters.updatedAt.gte } : {}),
        ...(filters.updatedAt.lte ? { lte: filters.updatedAt.lte } : {}),
      };
    }

    return where;
  }
}
