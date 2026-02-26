import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
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
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias',
    schema: {
      example: [
        {
          id: 1,
          name: 'Electronics',
          createdAt: '2026-02-26T12:00:00.000Z',
          updatedAt: '2026-02-26T12:00:00.000Z',
        },
      ],
    },
  })
  findAll() {
    return this.categoryService.findAll();
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
