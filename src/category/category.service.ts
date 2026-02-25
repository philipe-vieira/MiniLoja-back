import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name?.trim();

    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    return this.categoryRepository.create(name);
  }

  async findAll() {
    return this.categoryRepository.findAll();
  }

  async findOne(id: number) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.findOne(id);

    if (updateCategoryDto.name !== undefined) {
      const name = updateCategoryDto.name.trim();

      if (!name) {
        throw new BadRequestException('Category name is required');
      }

      return this.categoryRepository.update(id, name);
    }

    return category;
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.categoryRepository.remove(id);
  }
}
