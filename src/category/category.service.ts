import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CategoryFilters,
  CategoryRepository,
  CategorySort,
} from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoryQueryDto } from './dto/list-category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

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
    const getAll = this.parseBoolean(query.get_all, false, 'get_all');
    const page = this.parsePositiveInt(query.page, 1, 'page');
    const limit = this.parsePositiveInt(query.limit, 10, 'limit', 100);
    const sort = this.parseSortBy(query.sort_by);

    const filters: CategoryFilters = {};

    if (query.id !== undefined) {
      filters.id = this.parsePositiveInt(query.id, 1, 'id');
    }

    if (query.name !== undefined) {
      const name = query.name.trim();
      if (!name) {
        throw new BadRequestException('name filter cannot be empty');
      }
      filters.name = name;
    }

    const createdAtFilter = this.parseDateRange({
      gte: query.createdAt_gte,
      lte: query.createdAt_lte,
      between: query.createdAt_between,
      fieldName: 'createdAt',
    });
    if (createdAtFilter) {
      filters.createdAt = createdAtFilter;
    }

    const updatedAtFilter = this.parseDateRange({
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

  /**
   * Converte string para inteiro positivo com fallback e limite opcional.
   *
   * @param value Valor de entrada.
   * @param fallback Valor padrão quando não informado.
   * @param fieldName Nome lógico do campo para mensagens de erro.
   * @param max Valor máximo permitido.
   * @returns Inteiro positivo validado.
   * @throws BadRequestException Quando o valor é inválido.
   */
  private parsePositiveInt(
    value: string | undefined,
    fallback: number,
    fieldName: string,
    max?: number,
  ): number {
    if (value === undefined) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    if (max !== undefined && parsed > max) {
      throw new BadRequestException(`${fieldName} must be <= ${max}`);
    }

    return parsed;
  }

  /**
   * Converte string para boolean aceitando aliases comuns.
   *
   * Valores aceitos:
   * - true: `true`, `1`, `yes`
   * - false: `false`, `0`, `no`
   *
   * @param value Valor de entrada.
   * @param fallback Valor padrão quando não informado.
   * @param fieldName Nome lógico do campo para mensagens de erro.
   * @returns Boolean validado.
   * @throws BadRequestException Quando o valor não representa boolean.
   */
  private parseBoolean(
    value: string | undefined,
    fallback: boolean,
    fieldName: string,
  ): boolean {
    if (value === undefined) {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }

    throw new BadRequestException(`${fieldName} must be a boolean`);
  }

  /**
   * Interpreta o parâmetro `sort_by` no formato `campo:direcao`.
   *
   * @param sortBy Valor bruto de ordenação.
   * @returns Estrutura de ordenação normalizada.
   * @throws BadRequestException Quando campo ou direção são inválidos.
   */
  private parseSortBy(sortBy: string | undefined): CategorySort {
    if (!sortBy) {
      return { field: 'id', direction: 'asc' };
    }

    const [rawField, rawDirection] = sortBy.split(':');
    const field = rawField?.trim() as CategorySort['field'] | undefined;
    const direction = (rawDirection?.trim() || 'asc') as
      | CategorySort['direction']
      | undefined;

    const validFields: CategorySort['field'][] = [
      'id',
      'name',
      'createdAt',
      'updatedAt',
    ];

    if (!field || !validFields.includes(field)) {
      throw new BadRequestException(
        `sort_by field must be one of: ${validFields.join(',')}`,
      );
    }

    if (!direction || !['asc', 'desc'].includes(direction)) {
      throw new BadRequestException('sort_by direction must be asc or desc');
    }

    return { field, direction };
  }

  /**
   * Monta um range de datas a partir de `gte/lte` ou `between`.
   *
   * Regras:
   * - `between` não pode ser combinado com `gte/lte`
   * - `between` deve ter formato `start,end`
   * - início deve ser <= fim
   *
   * @param params Parâmetros de filtro de data.
   * @returns Range de datas ou `undefined` quando não informado.
   * @throws BadRequestException Quando os valores estão em formato inválido.
   */
  private parseDateRange(params: {
    gte?: string;
    lte?: string;
    between?: string;
    fieldName: string;
  }): { gte?: Date; lte?: Date } | undefined {
    const { gte, lte, between, fieldName } = params;

    if (between !== undefined && (gte !== undefined || lte !== undefined)) {
      throw new BadRequestException(
        `${fieldName} between cannot be combined with gte/lte`,
      );
    }

    if (between !== undefined) {
      const values = between.split(',').map((item) => item.trim());
      if (values.length !== 2 || !values[0] || !values[1]) {
        throw new BadRequestException(
          `${fieldName}_between must be in format start,end`,
        );
      }

      const start = this.parseIsoDate(values[0], `${fieldName}_between start`);
      const end = this.parseIsoDate(values[1], `${fieldName}_between end`);

      if (start > end) {
        throw new BadRequestException(
          `${fieldName}_between start must be <= end`,
        );
      }

      return { gte: start, lte: end };
    }

    const result: { gte?: Date; lte?: Date } = {};

    if (gte !== undefined) {
      result.gte = this.parseIsoDate(gte, `${fieldName}_gte`);
    }

    if (lte !== undefined) {
      result.lte = this.parseIsoDate(lte, `${fieldName}_lte`);
    }

    if (result.gte && result.lte && result.gte > result.lte) {
      throw new BadRequestException(
        `${fieldName}_gte must be <= ${fieldName}_lte`,
      );
    }

    return result.gte || result.lte ? result : undefined;
  }

  /**
   * Converte string para `Date` validando formato.
   *
   * @param value Data em formato string.
   * @param fieldName Nome lógico do campo para mensagens de erro.
   * @returns Instância de `Date` válida.
   * @throws BadRequestException Quando não é uma data válida.
   */
  private parseIsoDate(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid ISO date`);
    }

    return date;
  }
}
