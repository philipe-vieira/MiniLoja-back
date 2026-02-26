import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Product } from './entities/product.entity';

export type ProductFilters = {
  id?: number;
  name?: string;
  description?: string;
  price?: {
    equals?: number;
    gte?: number;
    lte?: number;
  };
  categoryId?: number;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  updatedAt?: {
    gte?: Date;
    lte?: Date;
  };
};

export type ProductSort = {
  field: 'id' | 'name' | 'price' | 'categoryId' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
};

export type FindProductsParams = {
  skip?: number;
  take?: number;
  filters: ProductFilters;
  sort: ProductSort;
};

export type CreateProductData = {
  name: string;
  description?: string | null;
  price: number;
  categoryId: number;
};

export type UpdateProductData = Partial<CreateProductData>;

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateProductData): Promise<Product> {
    return this.prisma.product.create({
      data,
      include: { category: true },
    });
  }

  findAll(params: FindProductsParams): Promise<Product[]> {
    const where = this.buildWhere(params.filters);

    return this.prisma.product.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { [params.sort.field]: params.sort.direction },
      include: { category: true },
    });
  }

  count(filters: ProductFilters): Promise<number> {
    const where = this.buildWhere(filters);
    return this.prisma.product.count({ where });
  }

  findById(id: number): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  update(id: number, data: UpdateProductData): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  remove(id: number): Promise<Product> {
    return this.prisma.product.delete({
      where: { id },
      include: { category: true },
    });
  }

  async categoryExists(id: number): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    return Boolean(category);
  }

  private buildWhere(filters: ProductFilters): Record<string, unknown> {
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

    if (filters.description !== undefined) {
      where.description = {
        contains: filters.description,
        mode: 'insensitive',
      };
    }

    if (filters.price !== undefined) {
      where.price = {
        ...(filters.price.equals !== undefined
          ? { equals: filters.price.equals }
          : {}),
        ...(filters.price.gte !== undefined ? { gte: filters.price.gte } : {}),
        ...(filters.price.lte !== undefined ? { lte: filters.price.lte } : {}),
      };
    }

    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
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
