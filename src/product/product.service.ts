import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProductFilters,
  ProductRepository,
  UpdateProductData,
} from './product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductQueryDto } from './dto/list-product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  parseBoolean,
  parseDateRange,
  parsePositiveInt,
  parseSortBy,
} from '../utils/query-parser.util';

@Injectable()
/**
 * Camada de serviço do módulo Product.
 * Centraliza validações, regras de negócio e orquestração de repositório.
 */
export class ProductService {
  /**
   * @param productRepository Repositório responsável pelo acesso aos dados de produto.
   */
  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * Cria um novo produto após validar e normalizar os campos.
   *
   * @param createProductDto Payload de criação.
   * @returns Produto criado.
   * @throws BadRequestException Quando payload contém valores inválidos.
   * @throws NotFoundException Quando a categoria informada não existe.
   */
  async create(createProductDto: CreateProductDto) {
    const name = createProductDto.name?.trim();
    if (!name) {
      throw new BadRequestException('Product name is required');
    }

    const price = this.parseRequiredPositiveNumber(
      createProductDto.price,
      'price',
      'Product price is required',
    );
    const categoryId = this.parseRequiredPositiveInt(
      createProductDto.categoryId,
      'categoryId',
      'Product categoryId is required',
    );
    const description = this.normalizeDescription(createProductDto.description);

    await this.ensureCategoryExists(categoryId);

    return this.productRepository.create({
      name,
      description,
      price,
      categoryId,
    });
  }

  /**
   * Lista produtos com suporte a paginação, filtros, ordenação e opção de retorno completo.
   *
   * @param query Query params da listagem.
   * @returns Resultado paginado com `data` e `meta`.
   * @throws BadRequestException Quando qualquer query param é inválido.
   */
  async findAll(query: ListProductQueryDto) {
    const getAll = parseBoolean(query.get_all, false, 'get_all');
    const page = parsePositiveInt(query.page, 1, 'page');
    const limit = parsePositiveInt(query.limit, 10, 'limit', 100);
    const sort = parseSortBy(query.sort_by, {
      validFields: [
        'id',
        'name',
        'price',
        'categoryId',
        'createdAt',
        'updatedAt',
      ],
      defaultField: 'id',
      defaultDirection: 'asc',
    });

    const filters: ProductFilters = {};

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

    if (query.description !== undefined) {
      const description = query.description.trim();
      if (!description) {
        throw new BadRequestException('description filter cannot be empty');
      }
      filters.description = description;
    }

    if (query.categoryId !== undefined) {
      filters.categoryId = parsePositiveInt(query.categoryId, 1, 'categoryId');
    }

    const priceFilter = this.parsePriceFilter(query);
    if (priceFilter) {
      filters.price = priceFilter;
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
      this.productRepository.findAll({ skip, take, filters, sort }),
      this.productRepository.count(filters),
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
   * Busca um produto por ID.
   *
   * @param id Identificador do produto.
   * @returns Produto encontrado.
   * @throws NotFoundException Quando não existe produto com o ID informado.
   */
  async findOne(id: number) {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }

    return product;
  }

  /**
   * Atualiza os dados do produto.
   *
   * @param id Identificador do produto.
   * @param updateProductDto Payload de atualização.
   * @returns Produto atualizado (ou atual, quando não há campos no payload).
   * @throws NotFoundException Quando o produto não existe.
   * @throws BadRequestException Quando algum campo informado é inválido.
   */
  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);
    const data: UpdateProductData = {};

    if (updateProductDto.name !== undefined) {
      const name = updateProductDto.name.trim();
      if (!name) {
        throw new BadRequestException('Product name is required');
      }

      data.name = name;
    }

    if (updateProductDto.description !== undefined) {
      data.description = this.normalizeDescription(
        updateProductDto.description,
      );
    }

    if (updateProductDto.price !== undefined) {
      data.price = this.parsePositiveNumber(updateProductDto.price, 'price');
    }

    if (updateProductDto.categoryId !== undefined) {
      const categoryId = this.parsePositiveIntValue(
        updateProductDto.categoryId,
        'categoryId',
      );

      await this.ensureCategoryExists(categoryId);
      data.categoryId = categoryId;
    }

    if (Object.keys(data).length === 0) {
      return product;
    }

    return this.productRepository.update(id, data);
  }

  /**
   * Remove um produto existente.
   *
   * @param id Identificador do produto.
   * @returns Produto removido.
   * @throws NotFoundException Quando o produto não existe.
   */
  async remove(id: number) {
    await this.findOne(id);
    return this.productRepository.remove(id);
  }

  private normalizeDescription(description: string | undefined): string | null {
    if (description === undefined) {
      return null;
    }

    const normalized = description.trim();
    return normalized.length === 0 ? null : normalized;
  }

  private parsePriceFilter(query: ListProductQueryDto) {
    const hasExact = query.price !== undefined;
    const hasRange =
      query.price_gte !== undefined ||
      query.price_lte !== undefined ||
      query.price_between !== undefined;

    if (hasExact && hasRange) {
      throw new BadRequestException(
        'price cannot be combined with price_gte/price_lte/price_between',
      );
    }

    if (
      query.price_between !== undefined &&
      (query.price_gte !== undefined || query.price_lte !== undefined)
    ) {
      throw new BadRequestException(
        'price_between cannot be combined with price_gte/price_lte',
      );
    }

    if (query.price !== undefined) {
      return {
        equals: this.parsePositiveNumber(query.price, 'price'),
      };
    }

    if (query.price_between !== undefined) {
      const values = query.price_between.split(',').map((item) => item.trim());
      if (values.length !== 2 || !values[0] || !values[1]) {
        throw new BadRequestException(
          'price_between must be in format min,max',
        );
      }

      const min = this.parsePositiveNumber(values[0], 'price_between min');
      const max = this.parsePositiveNumber(values[1], 'price_between max');

      if (min > max) {
        throw new BadRequestException('price_between min must be <= max');
      }

      return { gte: min, lte: max };
    }

    const range: { gte?: number; lte?: number } = {};

    if (query.price_gte !== undefined) {
      range.gte = this.parsePositiveNumber(query.price_gte, 'price_gte');
    }

    if (query.price_lte !== undefined) {
      range.lte = this.parsePositiveNumber(query.price_lte, 'price_lte');
    }

    if (
      range.gte !== undefined &&
      range.lte !== undefined &&
      range.gte > range.lte
    ) {
      throw new BadRequestException('price_gte must be <= price_lte');
    }

    return range.gte !== undefined || range.lte !== undefined
      ? range
      : undefined;
  }

  private parseRequiredPositiveInt(
    value: number | undefined,
    fieldName: string,
    requiredMessage: string,
  ) {
    if (value === undefined || value === null) {
      throw new BadRequestException(requiredMessage);
    }

    return this.parsePositiveIntValue(value, fieldName);
  }

  private parsePositiveIntValue(value: number | string, fieldName: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }

    return parsed;
  }

  private parseRequiredPositiveNumber(
    value: number | undefined,
    fieldName: string,
    requiredMessage: string,
  ) {
    if (value === undefined || value === null) {
      throw new BadRequestException(requiredMessage);
    }

    return this.parsePositiveNumber(value, fieldName);
  }

  private parsePositiveNumber(value: number | string, fieldName: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number`);
    }

    return parsed;
  }

  private async ensureCategoryExists(categoryId: number) {
    const categoryExists =
      await this.productRepository.categoryExists(categoryId);

    if (!categoryExists) {
      throw new NotFoundException(`Category #${categoryId} not found`);
    }
  }
}
