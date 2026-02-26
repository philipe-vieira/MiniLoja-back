import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../product.controller';
import { ProductService } from '../product.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { ListProductQueryDto } from '../dto/list-product-query.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

describe('ProductController', () => {
  let controller: ProductController;
  let productService: jest.Mocked<ProductService>;

  beforeEach(async () => {
    const mockProductService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    productService = module.get(ProductService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate create to service', async () => {
    const createDto: CreateProductDto = {
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId: 1,
    };
    const createdProduct = { id: 1, ...createDto };

    productService.create.mockResolvedValue(createdProduct as never);

    const result = await controller.create(createDto);

    expect(productService.create).toHaveBeenCalledWith(createDto);
    expect(result).toEqual(createdProduct);
  });

  it('should delegate findAll to service', async () => {
    const query: ListProductQueryDto = {
      page: '2',
      limit: '5',
      name: 'Key',
    };
    const paginatedResult = {
      data: [{ id: 1, name: 'Keyboard' }],
      meta: {
        page: 2,
        limit: 5,
        total: 7,
        totalPages: 2,
        hasPreviousPage: true,
        hasNextPage: false,
      },
    };
    productService.findAll.mockResolvedValue(paginatedResult as never);

    const result = await controller.findAll(query);

    expect(productService.findAll).toHaveBeenCalledWith(query);
    expect(result).toEqual(paginatedResult);
  });

  it('should delegate findOne to service', async () => {
    const product = { id: 7, name: 'Mouse' };
    productService.findOne.mockResolvedValue(product as never);

    const result = await controller.findOne(7);

    expect(productService.findOne).toHaveBeenCalledWith(7);
    expect(result).toEqual(product);
  });

  it('should delegate update to service', async () => {
    const updateDto: UpdateProductDto = { name: 'Keyboard Pro' };
    const updatedProduct = { id: 3, name: 'Keyboard Pro' };

    productService.update.mockResolvedValue(updatedProduct as never);

    const result = await controller.update(3, updateDto);

    expect(productService.update).toHaveBeenCalledWith(3, updateDto);
    expect(result).toEqual(updatedProduct);
  });

  it('should delegate remove to service', async () => {
    const removedProduct = { id: 9, name: 'Deleted' };
    productService.remove.mockResolvedValue(removedProduct as never);

    const result = await controller.remove(9);

    expect(productService.remove).toHaveBeenCalledWith(9);
    expect(result).toEqual(removedProduct);
  });
});
