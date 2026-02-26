import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductQueryDto } from './dto/list-product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Product')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Criar produto' })
  @ApiBody({
    type: CreateProductDto,
    examples: {
      createProduct: {
        summary: 'Criacao de produto',
        value: {
          name: 'Keyboard Mecânico',
          description: 'Teclado com switches táteis e RGB',
          price: 299.9,
          categoryId: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso',
    schema: {
      example: {
        id: 1,
        name: 'Keyboard Mecânico',
        description: 'Teclado com switches táteis e RGB',
        price: 299.9,
        categoryId: 1,
        createdAt: '2026-02-26T12:00:00.000Z',
        updatedAt: '2026-02-26T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payload invalido',
    schema: {
      example: {
        statusCode: 400,
        message: 'Product name is required',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria nao encontrada',
    schema: {
      example: {
        statusCode: 404,
        message: 'Category #999 not found',
        error: 'Not Found',
      },
    },
  })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'get_all',
    required: false,
    description: 'Quando true, ignora paginação e retorna todos os registros',
    example: false,
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    description:
      'Ordenação no formato campo:direção. Campos: id,name,price,categoryId,createdAt,updatedAt. Direção: asc|desc',
    example: 'createdAt:desc',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'Filtro por ID exato',
    example: 1,
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filtro por nome parcial',
    example: 'Keyboard',
  })
  @ApiQuery({
    name: 'description',
    required: false,
    description: 'Filtro por descrição parcial',
    example: 'RGB',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filtro por ID da categoria',
    example: 1,
  })
  @ApiQuery({
    name: 'price',
    required: false,
    description: 'Filtro por preço exato',
    example: 299.9,
  })
  @ApiQuery({
    name: 'price_gte',
    required: false,
    description: 'Filtro por preço >=',
    example: 100,
  })
  @ApiQuery({
    name: 'price_lte',
    required: false,
    description: 'Filtro por preço <=',
    example: 500,
  })
  @ApiQuery({
    name: 'price_between',
    required: false,
    description: 'Filtro por preço between no formato minimo,maximo',
    example: '100,500',
  })
  @ApiQuery({
    name: 'createdAt_gte',
    required: false,
    description: 'Filtro createdAt >= data ISO',
    example: '2026-02-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'createdAt_lte',
    required: false,
    description: 'Filtro createdAt <= data ISO',
    example: '2026-02-28T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'createdAt_between',
    required: false,
    description: 'Filtro createdAt between no formato inicio,fim',
    example: '2026-02-01T00:00:00.000Z,2026-02-28T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'updatedAt_gte',
    required: false,
    description: 'Filtro updatedAt >= data ISO',
    example: '2026-02-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'updatedAt_lte',
    required: false,
    description: 'Filtro updatedAt <= data ISO',
    example: '2026-02-28T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'updatedAt_between',
    required: false,
    description: 'Filtro updatedAt between no formato inicio,fim',
    example: '2026-02-01T00:00:00.000Z,2026-02-28T23:59:59.999Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de produtos',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Keyboard Mecânico',
            description: 'Teclado com switches táteis e RGB',
            price: 299.9,
            categoryId: 1,
            createdAt: '2026-02-26T12:00:00.000Z',
            updatedAt: '2026-02-26T12:00:00.000Z',
          },
        ],
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
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Query params invalidos',
    schema: {
      example: {
        statusCode: 400,
        message: 'page must be a positive integer',
        error: 'Bad Request',
      },
    },
  })
  findAll(@Query() query: ListProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado',
    schema: {
      example: {
        id: 1,
        name: 'Keyboard Mecânico',
        description: 'Teclado com switches táteis e RGB',
        price: 299.9,
        categoryId: 1,
        createdAt: '2026-02-26T12:00:00.000Z',
        updatedAt: '2026-02-26T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Produto nao encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Product #999 not found',
        error: 'Not Found',
      },
    },
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto por ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    type: UpdateProductDto,
    examples: {
      updateProduct: {
        summary: 'Atualizacao de produto',
        value: { name: 'Keyboard Slim', price: 249.9, categoryId: 2 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado',
    schema: {
      example: {
        id: 1,
        name: 'Keyboard Slim',
        description: 'Teclado com switches táteis e RGB',
        price: 249.9,
        categoryId: 2,
        createdAt: '2026-02-26T12:00:00.000Z',
        updatedAt: '2026-02-26T12:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Payload invalido',
    schema: {
      example: {
        statusCode: 400,
        message: 'price must be a positive number',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Produto ou categoria nao encontrados',
    schema: {
      example: {
        statusCode: 404,
        message: 'Product #999 not found',
        error: 'Not Found',
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover produto por ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Produto removido',
    schema: {
      example: {
        id: 1,
        name: 'Keyboard Mecânico',
        description: 'Teclado com switches táteis e RGB',
        price: 299.9,
        categoryId: 1,
        createdAt: '2026-02-26T12:00:00.000Z',
        updatedAt: '2026-02-26T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Produto nao encontrado',
    schema: {
      example: {
        statusCode: 404,
        message: 'Product #999 not found',
        error: 'Not Found',
      },
    },
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }
}
