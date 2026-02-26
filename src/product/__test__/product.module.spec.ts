import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductController } from '../product.controller';
import { ProductModule } from '../product.module';
import { ProductRepository } from '../product.repository';
import { ProductService } from '../product.service';

describe('ProductModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [ProductModule],
    });

    moduleRef = await moduleBuilder
      .overrideProvider(PrismaService)
      .useValue({
        product: {},
        category: {},
      })
      .compile();
  });

  it('should wire ProductController, ProductService and ProductRepository', () => {
    const controller = moduleRef.get<ProductController>(ProductController);
    const service = moduleRef.get<ProductService>(ProductService);
    const repository = moduleRef.get<ProductRepository>(ProductRepository);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });
});
