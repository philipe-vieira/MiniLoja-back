import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('CategoryModule (e2e)', () => {
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

  it('POST /category should create a category', async () => {
    const response = await request(app.getHttpServer())
      .post('/category')
      .send({ name: 'Electronics' })
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Electronics',
    });
    expect(response.body.id).toBeGreaterThan(0);
    expect(Date.parse(response.body.createdAt)).not.toBeNaN();
    expect(Date.parse(response.body.updatedAt)).not.toBeNaN();
  });

  it('POST /category should return 400 when name is missing', () => {
    return request(app.getHttpServer())
      .post('/category')
      .send({ name: '   ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Category name is required');
      });
  });

  it('GET /category should return all categories', async () => {
    const categoryId = await createCategory();

    await request(app.getHttpServer())
      .get('/category')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: categoryId,
          name: 'Electronics',
        });
      });
  });

  it('GET /category/:id should return one category', async () => {
    const categoryId = await createCategory();

    await request(app.getHttpServer())
      .get(`/category/${categoryId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: categoryId,
          name: 'Electronics',
        });
      });
  });

  it('GET /category/:id should return 400 for invalid id', () => {
    return request(app.getHttpServer()).get('/category/abc').expect(400);
  });

  it('GET /category/:id should return 404 for missing category', () => {
    return request(app.getHttpServer())
      .get('/category/999999999')
      .expect(404)
      .expect(({ body }) => {
        expect(body.message).toBe('Category #999999999 not found');
      });
  });

  it('PATCH /category/:id should update category', async () => {
    const categoryId = await createCategory();

    await request(app.getHttpServer())
      .patch(`/category/${categoryId}`)
      .send({ name: 'Home Office' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: categoryId,
          name: 'Home Office',
        });
      });
  });

  it('PATCH /category/:id should return 400 with empty name', async () => {
    const categoryId = await createCategory();

    await request(app.getHttpServer())
      .patch(`/category/${categoryId}`)
      .send({ name: '   ' })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Category name is required');
      });
  });

  it('PATCH /category/:id should return 404 for missing category', () => {
    return request(app.getHttpServer())
      .patch('/category/999999999')
      .send({ name: 'X' })
      .expect(404);
  });

  it('DELETE /category/:id should remove category', async () => {
    const categoryId = await createCategory();

    await request(app.getHttpServer())
      .delete(`/category/${categoryId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(categoryId);
      });
  });

  it('DELETE /category/:id should return 404 when already removed', async () => {
    const categoryId = await createCategory();

    await request(app.getHttpServer())
      .delete(`/category/${categoryId}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/category/${categoryId}`)
      .expect(404);
  });

  it('GET /category should return empty list when no categories exist', () => {
    return request(app.getHttpServer()).get('/category').expect(200).expect([]);
  });
});
