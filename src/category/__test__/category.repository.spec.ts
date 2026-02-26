import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryRepository } from '../category.repository';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let prismaService: {
    category: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    const mockPrismaService = {
      category: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<CategoryRepository>(CategoryRepository);
    prismaService = module.get(PrismaService);
  });

  it('should create category using prisma create', async () => {
    const createdCategory = {
      id: 1,
      name: 'Electronics',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.category.create.mockResolvedValue(createdCategory);

    const result = await repository.create('Electronics');

    expect(prismaService.category.create).toHaveBeenCalledWith({
      data: { name: 'Electronics' },
    });
    expect(result).toEqual(createdCategory);
  });

  it('should return all categories ordered by id asc', async () => {
    const categories = [
      { id: 1, name: 'Books', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'Games', createdAt: new Date(), updatedAt: new Date() },
    ];
    prismaService.category.findMany.mockResolvedValue(categories);

    const result = await repository.findAll({
      skip: 10,
      take: 5,
      filters: { id: 2, name: 'game' },
      sort: { field: 'id', direction: 'asc' },
    });

    expect(prismaService.category.findMany).toHaveBeenCalledWith({
      where: {
        id: 2,
        name: {
          contains: 'game',
          mode: 'insensitive',
        },
      },
      skip: 10,
      take: 5,
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual(categories);
  });

  it('should apply date filters and custom sorting', async () => {
    prismaService.category.findMany.mockResolvedValue([]);

    await repository.findAll({
      filters: {
        createdAt: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T23:59:59.999Z'),
        },
        updatedAt: {
          gte: new Date('2026-02-10T00:00:00.000Z'),
        },
      },
      sort: { field: 'updatedAt', direction: 'desc' },
    });

    expect(prismaService.category.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T23:59:59.999Z'),
        },
        updatedAt: {
          gte: new Date('2026-02-10T00:00:00.000Z'),
        },
      },
      skip: undefined,
      take: undefined,
      orderBy: { updatedAt: 'desc' },
    });
  });

  it('should count categories using filters', async () => {
    prismaService.category.count.mockResolvedValue(7);

    const result = await repository.count({ name: 'Elect' });

    expect(prismaService.category.count).toHaveBeenCalledWith({
      where: {
        name: {
          contains: 'Elect',
          mode: 'insensitive',
        },
      },
    });
    expect(result).toBe(7);
  });

  it('should return category by id using prisma findUnique', async () => {
    const category = {
      id: 10,
      name: 'Home',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.category.findUnique.mockResolvedValue(category);

    const result = await repository.findById(10);

    expect(prismaService.category.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
    });
    expect(result).toEqual(category);
  });

  it('should return null when category does not exist', async () => {
    prismaService.category.findUnique.mockResolvedValue(null);

    const result = await repository.findById(999);

    expect(prismaService.category.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
    });
    expect(result).toBeNull();
  });

  it('should update category using prisma update', async () => {
    const updatedCategory = {
      id: 7,
      name: 'Office',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.category.update.mockResolvedValue(updatedCategory);

    const result = await repository.update(7, 'Office');

    expect(prismaService.category.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { name: 'Office' },
    });
    expect(result).toEqual(updatedCategory);
  });

  it('should remove category using prisma delete', async () => {
    const removedCategory = {
      id: 4,
      name: 'Toys',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prismaService.category.delete.mockResolvedValue(removedCategory);

    const result = await repository.remove(4);

    expect(prismaService.category.delete).toHaveBeenCalledWith({
      where: { id: 4 },
    });
    expect(result).toEqual(removedCategory);
  });
});
