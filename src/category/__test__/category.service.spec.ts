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

  it('should return all categories', async () => {
    const categories = [
      { id: 1, name: 'Electronics', createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'Books', createdAt: new Date(), updatedAt: new Date() },
    ];
    categoryRepository.findAll.mockResolvedValue(categories);

    const result = await service.findAll();

    expect(categoryRepository.findAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual(categories);
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
    await expect(service.findOne(999)).rejects.toThrow('Category #999 not found');
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
