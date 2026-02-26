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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoryQueryDto } from './dto/list-category-query.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Criar categoria' })
  @ApiBody({
    type: CreateCategoryDto,
    examples: {
      createCategory: {
        summary: 'Criacao de categoria',
        value: { name: 'Electronics' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Categoria criada com sucesso',
    schema: {
      example: {
        id: 1,
        name: 'Electronics',
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
        message: 'Category name is required',
        error: 'Bad Request',
      },
    },
  })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorias' })
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
      'Ordenação no formato campo:direção. Campos: id,name,createdAt,updatedAt. Direção: asc|desc',
    example: 'createdAt:desc',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Filtro por nome parcial',
    example: 'Elect',
  })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'Filtro por ID exato',
    example: 1,
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
    description: 'Lista paginada de categorias',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'Electronics',
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
  findAll(@Query() query: ListCategoryQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Categoria encontrada',
    schema: {
      example: {
        id: 1,
        name: 'Electronics',
        createdAt: '2026-02-26T12:00:00.000Z',
        updatedAt: '2026-02-26T12:00:00.000Z',
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar categoria por ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({
    type: UpdateCategoryDto,
    examples: {
      updateCategory: {
        summary: 'Atualizacao de categoria',
        value: { name: 'Home Office' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Categoria atualizada',
    schema: {
      example: {
        id: 1,
        name: 'Home Office',
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
        message: 'Category name is required',
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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover categoria por ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Categoria removida',
    schema: {
      example: {
        id: 1,
        name: 'Electronics',
        createdAt: '2026-02-26T12:00:00.000Z',
        updatedAt: '2026-02-26T12:00:00.000Z',
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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
