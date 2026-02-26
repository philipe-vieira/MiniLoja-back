import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryFilters, CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoryQueryDto } from './dto/list-category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  parseBoolean,
  parseDateRange,
  parsePositiveInt,
  parseSortBy,
} from '../utils/query-parser.util';

@Injectable()
/**
 * Camada de serviço do módulo Category.
 * Centraliza validações, regras de negócio e orquestração de repositório.
 */
export class CategoryService {
  /**
   * @param categoryRepository Repositório responsável pelo acesso aos dados de categoria.
   */
  constructor(private readonly categoryRepository: CategoryRepository) {}

  /**
   * Cria uma nova categoria após validar e normalizar o nome.
   *
   * @param createCategoryDto Payload de criação.
   * @returns Categoria criada.
   * @throws BadRequestException Quando o nome é vazio ou inválido.
   */
  async create(createCategoryDto: CreateCategoryDto) {
    const name = createCategoryDto.name?.trim();

    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    return this.categoryRepository.create(name);
  }

  /**
   * Lista categorias com suporte a paginação, filtros, ordenação e opção de retorno completo.
   *
   * @param query Query params da listagem.
   * @returns Resultado paginado com `data` e `meta`.
   * @throws BadRequestException Quando qualquer query param é inválido.
   */
  async findAll(query: ListCategoryQueryDto) {
    const getAll = parseBoolean(query.get_all, false, 'get_all');
    const page = parsePositiveInt(query.page, 1, 'page');
    const limit = parsePositiveInt(query.limit, 10, 'limit', 100);
    const sort = parseSortBy(query.sort_by, {
      validFields: ['id', 'name', 'createdAt', 'updatedAt'],
      defaultField: 'id',
      defaultDirection: 'asc',
    });

    const filters: CategoryFilters = {};

    if (query.id !== undefined) {
      filters.id = parsePositiveInt(query.id, 1, 'id');
    }

    if (query.name !== undefined) {
      const name = query.name.trim();
      if (!name) {
        throw new BadRequestException('name filter cannot be empty');
      }
      filters.name = name;
    }

    const createdAtFilter = parseDateRange({
      gte: query.createdAt_gte,
      lte: query.createdAt_lte,
      between: query.createdAt_between,
      fieldName: 'createdAt',
    });
    if (createdAtFilter) {
      filters.createdAt = createdAtFilter;
    }

    const updatedAtFilter = parseDateRange({
      gte: query.updatedAt_gte,
      lte: query.updatedAt_lte,
      between: query.updatedAt_between,
      fieldName: 'updatedAt',
    });
    if (updatedAtFilter) {
      filters.updatedAt = updatedAtFilter;
    }

    const skip = getAll ? undefined : (page - 1) * limit;
    const take = getAll ? undefined : limit;

    const [data, total] = await Promise.all([
      this.categoryRepository.findAll({ skip, take, filters, sort }),
      this.categoryRepository.count(filters),
    ]);

    const effectiveLimit = getAll ? (total === 0 ? 0 : total) : limit;
    const totalPages =
      effectiveLimit === 0 ? 0 : Math.ceil(total / effectiveLimit);

    return {
      data,
      meta: {
        page: getAll ? 1 : page,
        limit: effectiveLimit,
        total,
        totalPages,
        hasPreviousPage: getAll ? false : page > 1,
        hasNextPage: getAll ? false : page < totalPages,
        getAll,
        sortBy: `${sort.field}:${sort.direction}`,
      },
    };
  }

  /**
   * Busca uma categoria por ID.
   *
   * @param id Identificador da categoria.
   * @returns Categoria encontrada.
   * @throws NotFoundException Quando não existe categoria com o ID informado.
   */
  async findOne(id: number) {
    const category = await this.categoryRepository.findById(id);

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return category;
  }

  /**
   * Atualiza os dados da categoria.
   *
   * @param id Identificador da categoria.
   * @param updateCategoryDto Payload de atualização.
   * @returns Categoria atualizada (ou atual, quando não há campos no payload).
   * @throws NotFoundException Quando a categoria não existe.
   * @throws BadRequestException Quando o nome informado é inválido.
   */
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

  /**
   * Remove uma categoria existente.
   *
   * @param id Identificador da categoria.
   * @returns Categoria removida.
   * @throws NotFoundException Quando a categoria não existe.
   */
  async remove(id: number) {
    await this.findOne(id);
    return this.categoryRepository.remove(id);
  }
}
