import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCategoryQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Pagina atual (inicia em 1)',
  })
  page?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Quantidade de itens por pagina (maximo 100)',
  })
  limit?: string;

  @ApiPropertyOptional({
    example: 'Electronics',
    description: 'Filtro por nome (busca parcial, case-insensitive)',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filtro por ID exato',
  })
  id?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Quando true, ignora paginação e retorna todos os dados',
  })
  get_all?: string;

  @ApiPropertyOptional({
    example: 'createdAt:desc',
    description:
      'Ordenação no formato campo:direcao. Campos: id,name,createdAt,updatedAt. Direção: asc|desc',
  })
  sort_by?: string;

  @ApiPropertyOptional({
    example: '2026-02-26T00:00:00.000Z',
    description: 'Filtro createdAt gte',
  })
  createdAt_gte?: string;

  @ApiPropertyOptional({
    example: '2026-02-26T23:59:59.999Z',
    description: 'Filtro createdAt lte',
  })
  createdAt_lte?: string;

  @ApiPropertyOptional({
    example: '2026-02-26T00:00:00.000Z,2026-02-26T23:59:59.999Z',
    description: 'Filtro createdAt between (inicio,fim)',
  })
  createdAt_between?: string;

  @ApiPropertyOptional({
    example: '2026-02-26T00:00:00.000Z',
    description: 'Filtro updatedAt gte',
  })
  updatedAt_gte?: string;

  @ApiPropertyOptional({
    example: '2026-02-26T23:59:59.999Z',
    description: 'Filtro updatedAt lte',
  })
  updatedAt_lte?: string;

  @ApiPropertyOptional({
    example: '2026-02-26T00:00:00.000Z,2026-02-26T23:59:59.999Z',
    description: 'Filtro updatedAt between (inicio,fim)',
  })
  updatedAt_between?: string;
}
