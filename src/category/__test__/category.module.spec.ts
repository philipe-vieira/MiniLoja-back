import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoryController } from '../category.controller';
import { CategoryModule } from '../category.module';
import { CategoryRepository } from '../category.repository';
import { CategoryService } from '../category.service';

describe('CategoryModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [CategoryModule],
    });

    moduleRef = await moduleBuilder
      .overrideProvider(PrismaService)
      .useValue({
        category: {},
      })
      .compile();
  });

  it('should wire CategoryController, CategoryService and CategoryRepository', () => {
    const controller = moduleRef.get<CategoryController>(CategoryController);
    const service = moduleRef.get<CategoryService>(CategoryService);
    const repository = moduleRef.get<CategoryRepository>(CategoryRepository);

    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(repository).toBeDefined();
  });
});
