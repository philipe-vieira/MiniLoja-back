import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ProductModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createCategory(name = 'Electronics'): Promise<number> {
    const response = await request(app.getHttpServer())
      .post('/category')
      .send({ name })
      .expect(201);

    return response.body.id as number;
  }

  async function createProduct(
    payload: {
      name?: string;
      description?: string;
      price?: number;
      categoryId?: number;
    } = {},
  ): Promise<number> {
    const categoryId = payload.categoryId ?? (await createCategory());

    const response = await request(app.getHttpServer())
      .post('/product')
      .send({
        name: payload.name ?? 'Keyboard',
        description: payload.description ?? 'RGB',
        price: payload.price ?? 299.9,
        categoryId,
      })
      .expect(201);

    return response.body.id as number;
  }

  it('POST /product should create a product', async () => {
    const categoryId = await createCategory();

    const response = await request(app.getHttpServer())
      .post('/product')
      .send({
        name: 'Keyboard',
        description: 'RGB',
        price: 299.9,
        categoryId,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId,
    });
    expect(response.body.id).toBeGreaterThan(0);
    expect(Date.parse(response.body.createdAt)).not.toBeNaN();
    expect(Date.parse(response.body.updatedAt)).not.toBeNaN();
  });

  it('POST /product should return 400 for invalid payload', async () => {
    const categoryId = await createCategory();

    await request(app.getHttpServer())
      .post('/product')
      .send({
        name: '   ',
        price: 299.9,
        categoryId,
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Product name is required');
      });

    await request(app.getHttpServer())
      .post('/product')
      .send({
        name: 'Keyboard',
        price: -1,
        categoryId,
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('price must be a positive number');
      });
  });

  it('POST /product should return 404 when category does not exist', () => {
    return request(app.getHttpServer())
      .post('/product')
      .send({
        name: 'Keyboard',
        price: 299.9,
        categoryId: 999999,
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Category #999999 not found');
      });
  });

  it('GET /product should return all products', async () => {
    const categoryId = await createCategory();
    const productId = await createProduct({ categoryId });

    await request(app.getHttpServer())
      .get('/product')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({
          id: productId,
          name: 'Keyboard',
          price: 299.9,
          categoryId,
        });
        expect(body.meta).toMatchObject({
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
          getAll: false,
          sortBy: 'id:asc',
        });
      });
  });

  it('GET /product should apply pagination and filters', async () => {
    const categoryId = await createCategory();
    await createProduct({
      name: 'Keyboard',
      description: 'RGB',
      price: 299.9,
      categoryId,
    });
    await createProduct({
      name: 'Keyboard Pro',
      description: 'RGB Premium',
      price: 499.9,
      categoryId,
    });
    await createProduct({
      name: 'Mouse',
      description: 'Wireless',
      price: 99.9,
      categoryId,
    });

    await request(app.getHttpServer())
      .get('/product')
      .query({
        page: 1,
        limit: 1,
        name: 'key',
        price_between: '100,600',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0].name.toLowerCase()).toContain('key');
        expect(body.meta).toMatchObject({
          page: 1,
          limit: 1,
          total: 2,
          totalPages: 2,
          hasPreviousPage: false,
          hasNextPage: true,
          getAll: false,
          sortBy: 'id:asc',
        });
      });
  });

  it('GET /product should return all data when get_all=true', async () => {
    const categoryId = await createCategory();
    await createProduct({ name: 'A', price: 10, categoryId });
    await createProduct({ name: 'B', price: 20, categoryId });
    await createProduct({ name: 'C', price: 30, categoryId });

    await request(app.getHttpServer())
      .get('/product')
      .query({ get_all: 'true' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(3);
        expect(body.meta).toMatchObject({
          page: 1,
          total: 3,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
          getAll: true,
          sortBy: 'id:asc',
        });
      });
  });

  it('GET /product should sort using sort_by', async () => {
    const categoryId = await createCategory();
    await createProduct({ name: 'A', price: 10, categoryId });
    await createProduct({ name: 'B', price: 30, categoryId });
    await createProduct({ name: 'C', price: 20, categoryId });

    await request(app.getHttpServer())
      .get('/product')
      .query({ sort_by: 'price:desc', get_all: 'true' })
      .expect(200)
      .expect(({ body }) => {
        const prices = body.data.map((item: { price: number }) => item.price);
        expect(prices).toEqual([30, 20, 10]);
        expect(body.meta.sortBy).toBe('price:desc');
      });
  });

  it('GET /product should filter using createdAt_between', async () => {
    const categoryId = await createCategory();
    const createdResponse = await request(app.getHttpServer())
      .post('/product')
      .send({
        name: 'Keyboard',
        description: 'RGB',
        price: 299.9,
        categoryId,
      })
      .expect(201);

    const createdAt = new Date(createdResponse.body.createdAt).getTime();
    const start = new Date(createdAt - 1000).toISOString();
    const end = new Date(createdAt + 1000).toISOString();

    await request(app.getHttpServer())
      .get('/product')
      .query({ createdAt_between: `${start},${end}` })
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe(createdResponse.body.id);
      });
  });

  it('GET /product should return 400 for invalid params', async () => {
    await request(app.getHttpServer())
      .get('/product')
      .query({ page: 0 })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('page must be a positive integer');
      });

    await request(app.getHttpServer())
      .get('/product')
      .query({ sort_by: 'stock:asc' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'sort_by field must be one of: id,name,price,categoryId,createdAt,updatedAt',
        );
      });
  });

  it('GET /product/:id should return one product', async () => {
    const categoryId = await createCategory();
    const productId = await createProduct({ categoryId });

    await request(app.getHttpServer())
      .get(`/product/${productId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: productId,
          name: 'Keyboard',
          categoryId,
        });
      });
  });

  it('GET /product/:id should return 404 for missing product', () => {
    return request(app.getHttpServer())
      .get('/product/999999999')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Product #999999999 not found');
      });
  });

  it('PATCH /product/:id should update product', async () => {
    const oldCategoryId = await createCategory('Old');
    const newCategoryId = await createCategory('New');
    const productId = await createProduct({ categoryId: oldCategoryId });

    await request(app.getHttpServer())
      .patch(`/product/${productId}`)
      .send({
        name: 'Keyboard Pro',
        price: 399.9,
        categoryId: newCategoryId,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: productId,
          name: 'Keyboard Pro',
          price: 399.9,
          categoryId: newCategoryId,
        });
      });
  });

  it('PATCH /product/:id should return 400 for invalid payload', async () => {
    const categoryId = await createCategory();
    const productId = await createProduct({ categoryId });

    await request(app.getHttpServer())
      .patch(`/product/${productId}`)
      .send({ price: 0 })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('price must be a positive number');
      });
  });

  it('PATCH /product/:id should return 404 for missing product', () => {
    return request(app.getHttpServer())
      .patch('/product/999999999')
      .send({ name: 'X' })
      .expect(404);
  });

  it('DELETE /product/:id should remove product', async () => {
    const categoryId = await createCategory();
    const productId = await createProduct({ categoryId });

    await request(app.getHttpServer())
      .delete(`/product/${productId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(productId);
      });
  });

  it('DELETE /product/:id should return 404 when already removed', async () => {
    const categoryId = await createCategory();
    const productId = await createProduct({ categoryId });

    await request(app.getHttpServer())
      .delete(`/product/${productId}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/product/${productId}`)
      .expect(404);
  });
});
