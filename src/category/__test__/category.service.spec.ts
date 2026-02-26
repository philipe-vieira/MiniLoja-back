import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryRepository } from '../category.repository';
import { CategoryService } from '../category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(async () => {
    const mockCategoryRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryRepository = module.get(CategoryRepository);
  });

  it('should create category with trimmed name', async () => {
    const createdCategory = {
      id: 1,
      name: 'Electronics',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    categoryRepository.create.mockResolvedValue(createdCategory);

    const result = await service.create({ name: ' Electronics ' });

    expect(categoryRepository.create).toHaveBeenCalledWith('Electronics');
    expect(result).toEqual(createdCategory);
  });

  it('should throw BadRequestException when creating without valid name', async () => {
    await expect(service.create({ name: '   ' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.create({ name: '' })).rejects.toThrow(
      'Category name is required',
    );
    expect(categoryRepository.create).not.toHaveBeenCalled();
  });

  it('should return paginated categories with default values', async () => {
    const categories = [
      {
        id: 1,
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { id: 2, name: 'Books', createdAt: new Date(), updatedAt: new Date() },
    ];
    categoryRepository.findAll.mockResolvedValue(categories);
    categoryRepository.count.mockResolvedValue(2);

    const result = await service.findAll({});

    expect(categoryRepository.findAll).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      filters: {},
      sort: { field: 'id', direction: 'asc' },
    });
    expect(categoryRepository.count).toHaveBeenCalledWith({});
    expect(result).toEqual({
      data: categories,
      meta: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        getAll: false,
        sortBy: 'id:asc',
      },
    });
  });

  it('should apply pagination and filters when listing categories', async () => {
    const categories = [
      {
        id: 8,
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    categoryRepository.findAll.mockResolvedValue(categories);
    categoryRepository.count.mockResolvedValue(21);

    const result = await service.findAll({
      page: '2',
      limit: '10',
      name: 'Elect',
      id: '8',
    });

    expect(categoryRepository.findAll).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      filters: { id: 8, name: 'Elect' },
      sort: { field: 'id', direction: 'asc' },
    });
    expect(categoryRepository.count).toHaveBeenCalledWith({
      id: 8,
      name: 'Elect',
    });
    expect(result.meta).toMatchObject({
      page: 2,
      limit: 10,
      total: 21,
      totalPages: 3,
      hasPreviousPage: true,
      hasNextPage: true,
      getAll: false,
      sortBy: 'id:asc',
    });
  });

  it('should apply get_all and custom sort', async () => {
    const categories = [
      { id: 2, name: 'B', createdAt: new Date(), updatedAt: new Date() },
      { id: 1, name: 'A', createdAt: new Date(), updatedAt: new Date() },
    ];
    categoryRepository.findAll.mockResolvedValue(categories);
    categoryRepository.count.mockResolvedValue(2);

    const result = await service.findAll({
      get_all: 'true',
      sort_by: 'name:desc',
    });

    expect(categoryRepository.findAll).toHaveBeenCalledWith({
      skip: undefined,
      take: undefined,
      filters: {},
      sort: { field: 'name', direction: 'desc' },
    });
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      getAll: true,
      sortBy: 'name:desc',
    });
  });

  it('should apply createdAt and updatedAt date filters', async () => {
    categoryRepository.findAll.mockResolvedValue([]);
    categoryRepository.count.mockResolvedValue(0);

    await service.findAll({
      createdAt_gte: '2026-02-01T00:00:00.000Z',
      createdAt_lte: '2026-02-28T23:59:59.999Z',
      updatedAt_between: '2026-02-01T00:00:00.000Z,2026-02-28T23:59:59.999Z',
    });

    expect(categoryRepository.findAll).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      filters: {
        createdAt: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T23:59:59.999Z'),
        },
        updatedAt: {
          gte: new Date('2026-02-01T00:00:00.000Z'),
          lte: new Date('2026-02-28T23:59:59.999Z'),
        },
      },
      sort: { field: 'id', direction: 'asc' },
    });
  });

  it('should throw BadRequestException when pagination params are invalid', async () => {
    await expect(service.findAll({ page: '0' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.findAll({ limit: '-1' })).rejects.toThrow(
      'limit must be a positive integer',
    );
    await expect(service.findAll({ limit: '101' })).rejects.toThrow(
      'limit must be <= 100',
    );
    await expect(service.findAll({ id: 'abc' })).rejects.toThrow(
      'id must be a positive integer',
    );
    await expect(service.findAll({ name: '   ' })).rejects.toThrow(
      'name filter cannot be empty',
    );
    await expect(service.findAll({ get_all: 'nope' })).rejects.toThrow(
      'get_all must be a boolean',
    );
    await expect(service.findAll({ sort_by: 'price:asc' })).rejects.toThrow(
      'sort_by field must be one of: id,name,createdAt,updatedAt',
    );
    await expect(service.findAll({ sort_by: 'name:up' })).rejects.toThrow(
      'sort_by direction must be asc or desc',
    );
    await expect(
      service.findAll({ createdAt_between: '2026-02-01T00:00:00.000Z' }),
    ).rejects.toThrow('createdAt_between must be in format start,end');
    await expect(
      service.findAll({
        createdAt_between: '2026-02-10T00:00:00.000Z,2026-02-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('createdAt_between start must be <= end');
    await expect(
      service.findAll({
        updatedAt_between: '2026-02-01T00:00:00.000Z,2026-02-10T00:00:00.000Z',
        updatedAt_gte: '2026-02-01T00:00:00.000Z',
      }),
    ).rejects.toThrow('updatedAt between cannot be combined with gte/lte');
    expect(categoryRepository.findAll).not.toHaveBeenCalled();
  });

  it('should return one category by id', async () => {
    const category = {
      id: 7,
      name: 'Sports',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    categoryRepository.findById.mockResolvedValue(category);

    const result = await service.findOne(7);

    expect(categoryRepository.findById).toHaveBeenCalledWith(7);
    expect(result).toEqual(category);
  });

  it('should throw NotFoundException when category does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    await expect(service.findOne(999)).rejects.toThrow(
      'Category #999 not found',
    );
  });

  it('should update category with trimmed name', async () => {
    const currentCategory = {
      id: 3,
      name: 'Home',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedCategory = {
      ...currentCategory,
      name: 'Home & Decor',
      updatedAt: new Date(),
    };

    categoryRepository.findById.mockResolvedValue(currentCategory);
    categoryRepository.update.mockResolvedValue(updatedCategory);

    const result = await service.update(3, { name: ' Home & Decor ' });

    expect(categoryRepository.update).toHaveBeenCalledWith(3, 'Home & Decor');
    expect(result).toEqual(updatedCategory);
  });

  it('should return current entity when update payload has no fields', async () => {
    const currentCategory = {
      id: 8,
      name: 'Kitchen',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    categoryRepository.findById.mockResolvedValue(currentCategory);

    const result = await service.update(8, {});

    expect(categoryRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual(currentCategory);
  });

  it('should throw BadRequestException when updating with empty name', async () => {
    categoryRepository.findById.mockResolvedValue({
      id: 5,
      name: 'Games',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.update(5, { name: '   ' })).rejects.toThrow(
      BadRequestException,
    );
    expect(categoryRepository.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when updating unknown category', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.update(999, { name: 'Unknown' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should remove category and return removed entity', async () => {
    const category = {
      id: 10,
      name: 'Beauty',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    categoryRepository.findById.mockResolvedValue(category);
    categoryRepository.remove.mockResolvedValue(category);

    const result = await service.remove(10);

    expect(categoryRepository.remove).toHaveBeenCalledWith(10);
    expect(result).toEqual(category);
  });

  it('should throw NotFoundException when removing unknown category', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    expect(categoryRepository.remove).not.toHaveBeenCalled();
  });
});
