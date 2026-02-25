import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryRepository } from '../category.repository';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let prismaService: {
    category: {
      create: jest.Mock;
      findMany: jest.Mock;
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

    const result = await repository.findAll();

    expect(prismaService.category.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
    });
    expect(result).toEqual(categories);
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
