import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from '../category.controller';
import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { ListCategoryQueryDto } from '../dto/list-category-query.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

describe('CategoryController', () => {
  let controller: CategoryController;
  let categoryService: jest.Mocked<CategoryService>;

  beforeEach(async () => {
    const mockCategoryService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    categoryService = module.get(CategoryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to service', async () => {
    const createDto: CreateCategoryDto = { name: 'Games' };
    const createdCategory = { id: 1, ...createDto };

    categoryService.create.mockResolvedValue(createdCategory as never);

    const result = await controller.create(createDto);

    expect(categoryService.create).toHaveBeenCalledWith(createDto);
    expect(result).toEqual(createdCategory);
  });

  it('should delegate findAll to service', async () => {
    const query: ListCategoryQueryDto = {
      page: '2',
      limit: '5',
      name: 'Elect',
    };
    const paginatedResult = {
      data: [{ id: 1, name: 'Electronics' }],
      meta: {
        page: 2,
        limit: 5,
        total: 7,
        totalPages: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      },
    };
    categoryService.findAll.mockResolvedValue(paginatedResult as never);

    const result = await controller.findAll(query);

    expect(categoryService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(paginatedResult);
  });

  it('should delegate findOne to service', async () => {
    const category = { id: 7, name: 'Sports' };
    categoryService.findOne.mockResolvedValue(category as never);

    const result = await controller.findOne(7);

    expect(categoryService.findOne).toHaveBeenCalledWith(7);
    expect(result).toEqual(category);
  });

  it('should delegate update to service', async () => {
    const updateDto: UpdateCategoryDto = { name: 'Books' };
    const updatedCategory = { id: 3, name: 'Books' };

    categoryService.update.mockResolvedValue(updatedCategory as never);

    const result = await controller.update(3, updateDto);

    expect(categoryService.update).toHaveBeenCalledWith(3, updateDto);
    expect(result).toEqual(updatedCategory);
  });

  it('should delegate remove to service', async () => {
    const removedCategory = { id: 9, name: 'Deleted' };
    categoryService.remove.mockResolvedValue(removedCategory as never);

    const result = await controller.remove(9);

    expect(categoryService.remove).toHaveBeenCalledWith(9);
    expect(result).toEqual(removedCategory);
  });
});
