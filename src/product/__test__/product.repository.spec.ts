import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductRepository } from '../product.repository';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let prismaService: {
    product: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    category: {
      findUnique: jest.Mock;
    };
  };

  beforeEach(async () => {
    const mockPrismaService = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<ProductRepository>(ProductRepository);
    prismaService = module.get(PrismaService);
  });

  it('should create product using prisma create', async () => {
    const createdProduct = {
      id: 1,
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.product.create.mockResolvedValue(createdProduct);

    const result = await repository.create({
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId: 1,
    });

    expect(prismaService.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Keyboard',
        description: 'RGB',
        price: 299.9,
        categoryId: 1,
      },
      include: { category: true },
    });
    expect(result).toEqual(createdProduct);
  });

  it('should return products with filters and sorting', async () => {
    const products = [
      {
        id: 1,
        name: 'Keyboard',
        description: 'RGB',
        price: 299.9,
        categoryId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    prismaService.product.findMany.mockResolvedValue(products);

    const result = await repository.findAll({
      skip: 5,
      take: 5,
      filters: {
        id: 1,
        name: 'key',
        description: 'rgb',
        categoryId: 1,
        price: { gte: 100, lte: 500 },
      },
      sort: { field: 'price', direction: 'desc' },
    });

    expect(prismaService.product.findMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        name: {
          contains: 'key',
          mode: 'insensitive',
        },
        description: {
          contains: 'rgb',
          mode: 'insensitive',
        },
        categoryId: 1,
        price: {
          gte: 100,
          lte: 500,
        },
      },
      skip: 5,
      take: 5,
      orderBy: { price: 'desc' },
      include: { category: true },
    });
    expect(result).toEqual(products);
  });

  it('should count products using filters', async () => {
    prismaService.product.count.mockResolvedValue(3);

    const result = await repository.count({
      name: 'Key',
      price: { equals: 199.9 },
    });

    expect(prismaService.product.count).toHaveBeenCalledWith({
      where: {
        name: {
          contains: 'Key',
          mode: 'insensitive',
        },
        price: { equals: 199.9 },
      },
    });
    expect(result).toBe(3);
  });

  it('should return product by id using prisma findUnique', async () => {
    const product = {
      id: 10,
      name: 'Mouse',
      description: null,
      price: 99.9,
      categoryId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.product.findUnique.mockResolvedValue(product);

    const result = await repository.findById(10);

    expect(prismaService.product.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      include: { category: true },
    });
    expect(result).toEqual(product);
  });

  it('should update product using prisma update', async () => {
    const updatedProduct = {
      id: 7,
      name: 'Mouse Pro',
      description: 'Wireless',
      price: 149.9,
      categoryId: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.product.update.mockResolvedValue(updatedProduct);

    const result = await repository.update(7, {
      name: 'Mouse Pro',
      price: 149.9,
    });

    expect(prismaService.product.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        name: 'Mouse Pro',
        price: 149.9,
      },
      include: { category: true },
    });
    expect(result).toEqual(updatedProduct);
  });

  it('should remove product using prisma delete', async () => {
    const removedProduct = {
      id: 4,
      name: 'Headset',
      description: null,
      price: 199.9,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.product.delete.mockResolvedValue(removedProduct);

    const result = await repository.remove(4);

    expect(prismaService.product.delete).toHaveBeenCalledWith({
      where: { id: 4 },
      include: { category: true },
    });
    expect(result).toEqual(removedProduct);
  });

  it('should return true when category exists', async () => {
    prismaService.category.findUnique.mockResolvedValue({ id: 1 });

    const result = await repository.categoryExists(1);

    expect(prismaService.category.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true },
    });
    expect(result).toBe(true);
  });

  it('should return false when category does not exist', async () => {
    prismaService.category.findUnique.mockResolvedValue(null);

    const result = await repository.categoryExists(999);

    expect(prismaService.category.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      select: { id: true },
    });
    expect(result).toBe(false);
  });
});
