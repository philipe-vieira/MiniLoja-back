import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '../../logger/app-logger.service';
import { ProductRepository } from '../product.repository';
import { ProductService } from '../product.service';

describe('ProductService', () => {
  let service: ProductService;
  let productRepository: jest.Mocked<ProductRepository>;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };
  let logger: {
    log: jest.Mock;
    debug: jest.Mock;
  };

  beforeEach(async () => {
    const mockProductRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      categoryExists: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useValue: mockProductRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: AppLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    productRepository = module.get(ProductRepository);
    cacheManager = module.get(CACHE_MANAGER);
    logger = module.get(AppLoggerService);
  });

  it('should create product with normalized values', async () => {
    const createdProduct = {
      id: 1,
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    productRepository.categoryExists.mockResolvedValue(true);
    productRepository.create.mockResolvedValue(createdProduct);

    const result = await service.create({
      name: ' Keyboard ',
      description: ' RGB ',
      price: 299.9,
      categoryId: 1,
    });

    expect(productRepository.categoryExists).toHaveBeenCalledWith(1);
    expect(productRepository.create).toHaveBeenCalledWith({
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId: 1,
    });
    expect(cacheManager.get).toHaveBeenCalledTimes(2);
    expect(cacheManager.del).toHaveBeenCalledWith('product:list:keys');
    expect(cacheManager.del).toHaveBeenCalledWith('product:item:keys');
    expect(logger.log).toHaveBeenCalledWith(
      'Invalidating product cache after create',
      'ProductCache',
    );
    expect(result).toEqual(createdProduct);
  });

  it('should throw BadRequestException when creating with invalid payload', async () => {
    await expect(
      service.create({
        name: '   ',
        price: 299.9,
        categoryId: 1,
      }),
    ).rejects.toThrow('Product name is required');

    await expect(
      service.create({
        name: 'Keyboard',
        categoryId: 1,
      } as never),
    ).rejects.toThrow('Product price is required');

    await expect(
      service.create({
        name: 'Keyboard',
        price: -1,
        categoryId: 1,
      }),
    ).rejects.toThrow('price must be a positive number');

    await expect(
      service.create({
        name: 'Keyboard',
        price: 100,
      } as never),
    ).rejects.toThrow('Product categoryId is required');

    await expect(
      service.create({
        name: 'Keyboard',
        price: 100,
        categoryId: 0,
      }),
    ).rejects.toThrow('categoryId must be a positive integer');

    expect(productRepository.create).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when category does not exist on create', async () => {
    productRepository.categoryExists.mockResolvedValue(false);

    await expect(
      service.create({
        name: 'Keyboard',
        price: 299.9,
        categoryId: 999,
      }),
    ).rejects.toThrow(NotFoundException);

    await expect(
      service.create({
        name: 'Keyboard',
        price: 299.9,
        categoryId: 999,
      }),
    ).rejects.toThrow('Category #999 not found');

    expect(productRepository.create).not.toHaveBeenCalled();
  });

  it('should return paginated products with default values', async () => {
    const products = [
      {
        id: 1,
        name: 'Keyboard',
        description: null,
        price: 299.9,
        categoryId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    productRepository.findAll.mockResolvedValue(products);
    productRepository.count.mockResolvedValue(1);

    const result = (await service.findAll({})) as any;

    expect(cacheManager.get).toHaveBeenCalledWith('product:list:default');
    expect(productRepository.findAll).toHaveBeenCalledWith({
      skip: 0,
      take: 10,
      filters: {},
      sort: { field: 'id', direction: 'asc' },
    });
    expect(productRepository.count).toHaveBeenCalledWith({});
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      getAll: false,
      sortBy: 'id:asc',
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'product:list:default',
      result,
    );
  });

  it('should return cached list when available', async () => {
    const cachedResult = {
      data: [{ id: 1, name: 'Keyboard' }],
      meta: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        getAll: false,
        sortBy: 'id:asc',
      },
    };
    cacheManager.get.mockResolvedValue(cachedResult);

    const result = await service.findAll({});

    expect(cacheManager.get).toHaveBeenCalledWith('product:list:default');
    expect(productRepository.findAll).not.toHaveBeenCalled();
    expect(result).toEqual(cachedResult);
  });

  it('should apply pagination and filters when listing products', async () => {
    const products = [
      {
        id: 8,
        name: 'Keyboard',
        description: 'RGB',
        price: 299.9,
        categoryId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    productRepository.findAll.mockResolvedValue(products);
    productRepository.count.mockResolvedValue(21);

    const result = (await service.findAll({
      page: '2',
      limit: '10',
      id: '8',
      name: 'Key',
      description: 'rgb',
      categoryId: '2',
      price_between: '100,500',
    })) as any;

    expect(productRepository.findAll).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      filters: {
        id: 8,
        name: 'Key',
        description: 'rgb',
        categoryId: 2,
        price: {
          gte: 100,
          lte: 500,
        },
      },
      sort: { field: 'id', direction: 'asc' },
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
    const products = [
      {
        id: 2,
        name: 'B',
        description: null,
        price: 20,
        categoryId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 1,
        name: 'A',
        description: null,
        price: 10,
        categoryId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    productRepository.findAll.mockResolvedValue(products);
    productRepository.count.mockResolvedValue(2);

    const result = (await service.findAll({
      get_all: 'true',
      sort_by: 'price:desc',
    })) as any;

    expect(productRepository.findAll).toHaveBeenCalledWith({
      skip: undefined,
      take: undefined,
      filters: {},
      sort: { field: 'price', direction: 'desc' },
    });
    expect(result.meta).toMatchObject({
      page: 1,
      limit: 2,
      total: 2,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      getAll: true,
      sortBy: 'price:desc',
    });
  });

  it('should apply createdAt and updatedAt date filters', async () => {
    productRepository.findAll.mockResolvedValue([]);
    productRepository.count.mockResolvedValue(0);

    await service.findAll({
      createdAt_gte: '2026-02-01T00:00:00.000Z',
      createdAt_lte: '2026-02-28T23:59:59.999Z',
      updatedAt_between: '2026-02-01T00:00:00.000Z,2026-02-28T23:59:59.999Z',
    });

    expect(productRepository.findAll).toHaveBeenCalledWith({
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

  it('should throw BadRequestException when list params are invalid', async () => {
    await expect(service.findAll({ page: '0' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.findAll({ limit: '101' })).rejects.toThrow(
      'limit must be <= 100',
    );
    await expect(service.findAll({ name: '   ' })).rejects.toThrow(
      'name filter cannot be empty',
    );
    await expect(service.findAll({ description: '   ' })).rejects.toThrow(
      'description filter cannot be empty',
    );
    await expect(service.findAll({ sort_by: 'stock:asc' })).rejects.toThrow(
      'sort_by field must be one of: id,name,price,categoryId,createdAt,updatedAt',
    );
    await expect(service.findAll({ price: '-10' })).rejects.toThrow(
      'price must be a positive number',
    );
    await expect(
      service.findAll({ price: '100', price_gte: '10' }),
    ).rejects.toThrow(
      'price cannot be combined with price_gte/price_lte/price_between',
    );
    await expect(service.findAll({ price_between: '10,5' })).rejects.toThrow(
      'price_between min must be <= max',
    );
    await expect(
      service.findAll({ price_gte: '100', price_lte: '10' }),
    ).rejects.toThrow('price_gte must be <= price_lte');
    expect(productRepository.findAll).not.toHaveBeenCalled();
  });

  it('should return one product by id', async () => {
    const product = {
      id: 7,
      name: 'Mouse',
      description: null,
      price: 99.9,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    productRepository.findById.mockResolvedValue(product);

    const result = await service.findOne(7);

    expect(cacheManager.get).toHaveBeenCalledWith('product:item:7');
    expect(productRepository.findById).toHaveBeenCalledWith(7);
    expect(cacheManager.set).toHaveBeenCalledWith('product:item:7', product);
    expect(result).toEqual(product);
  });

  it('should return cached product by id when available', async () => {
    const cachedProduct = {
      id: 7,
      name: 'Mouse',
    };
    cacheManager.get.mockResolvedValue(cachedProduct);

    const result = await service.findOne(7);

    expect(cacheManager.get).toHaveBeenCalledWith('product:item:7');
    expect(productRepository.findById).not.toHaveBeenCalled();
    expect(result).toEqual(cachedProduct);
  });

  it('should throw NotFoundException when product does not exist', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    await expect(service.findOne(999)).rejects.toThrow(
      'Product #999 not found',
    );
  });

  it('should update product with normalized fields', async () => {
    const currentProduct = {
      id: 3,
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedProduct = {
      ...currentProduct,
      name: 'Keyboard Pro',
      description: null,
      price: 399.9,
      categoryId: 2,
      updatedAt: new Date(),
    };

    productRepository.findById.mockResolvedValue(currentProduct);
    productRepository.categoryExists.mockResolvedValue(true);
    productRepository.update.mockResolvedValue(updatedProduct);

    const result = await service.update(3, {
      name: ' Keyboard Pro ',
      description: '   ',
      price: 399.9,
      categoryId: 2,
    });

    expect(productRepository.update).toHaveBeenCalledWith(3, {
      name: 'Keyboard Pro',
      description: null,
      price: 399.9,
      categoryId: 2,
    });
    expect(result).toEqual(updatedProduct);
  });

  it('should return current entity when update payload has no fields', async () => {
    const currentProduct = {
      id: 8,
      name: 'Mouse',
      description: null,
      price: 89.9,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    productRepository.findById.mockResolvedValue(currentProduct);

    const result = await service.update(8, {});

    expect(productRepository.update).not.toHaveBeenCalled();
    expect(result).toEqual(currentProduct);
  });

  it('should throw validation errors while updating', async () => {
    productRepository.findById.mockResolvedValue({
      id: 5,
      name: 'Games',
      description: null,
      price: 10,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(service.update(5, { name: '   ' })).rejects.toThrow(
      'Product name is required',
    );
    await expect(service.update(5, { price: 0 })).rejects.toThrow(
      'price must be a positive number',
    );
    await expect(service.update(5, { categoryId: 0 })).rejects.toThrow(
      'categoryId must be a positive integer',
    );

    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when category does not exist while updating', async () => {
    productRepository.findById.mockResolvedValue({
      id: 5,
      name: 'Keyboard',
      description: null,
      price: 20,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    productRepository.categoryExists.mockResolvedValue(false);

    await expect(service.update(5, { categoryId: 999 })).rejects.toThrow(
      'Category #999 not found',
    );
    expect(productRepository.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when updating unknown product', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(service.update(999, { name: 'Unknown' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should remove product and return removed entity', async () => {
    const product = {
      id: 10,
      name: 'Headset',
      description: null,
      price: 199.9,
      categoryId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    productRepository.findById.mockResolvedValue(product);
    productRepository.remove.mockResolvedValue(product);

    const result = await service.remove(10);

    expect(productRepository.remove).toHaveBeenCalledWith(10);
    expect(result).toEqual(product);
  });

  it('should throw NotFoundException when removing unknown product', async () => {
    productRepository.findById.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    expect(productRepository.remove).not.toHaveBeenCalled();
  });
});
