import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Prisma + AuditLog (e2e)', () => {
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
    await prisma.auditLog.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create AuditLog on category creation and keep requestId header', async () => {
    const requestId = 'req-e2e-create-001';
    const response = await request(app.getHttpServer())
      .post('/category')
      .set('x-request-id', requestId)
      .send({ name: 'Electronics' })
      .expect(201);

    const log = await prisma.auditLog.findFirst({
      where: {
        action: 'CREATE',
        entity: 'Category',
        entityId: String(response.body.id),
      },
      orderBy: { id: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log?.changedFields).toContain('name');
    expect(log?.requestId).toBe(requestId);
    expect(log?.newValues).toBeTruthy();
  });

  it('should create AuditLog on category update', async () => {
    const created = await request(app.getHttpServer())
      .post('/category')
      .send({ name: 'Home' })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/category/${created.body.id}`)
      .send({ name: 'Home Office' })
      .expect(200);

    const log = await prisma.auditLog.findFirst({
      where: {
        action: 'UPDATE',
        entity: 'Category',
        entityId: String(created.body.id),
      },
      orderBy: { id: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log?.changedFields).toContain('name');
    expect(log?.oldValues).toBeTruthy();
    expect(log?.newValues).toBeTruthy();
  });

  it('should create AuditLog on category deletion', async () => {
    const created = await request(app.getHttpServer())
      .post('/category')
      .send({ name: 'Books' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/category/${created.body.id}`)
      .expect(200);

    const log = await prisma.auditLog.findFirst({
      where: {
        action: 'DELETE',
        entity: 'Category',
        entityId: String(created.body.id),
      },
      orderBy: { id: 'desc' },
    });

    expect(log).toBeDefined();
    expect(log?.oldValues).toBeTruthy();
    expect(log?.newValues).toBeNull();
  });
});
