import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'Mouse Gamer',
    description: 'Novo nome do produto',
  })
  name?: string;

  @ApiPropertyOptional({
    example: 'Mouse sem fio com 6 botões',
    description: 'Nova descrição do produto',
  })
  description?: string;

  @ApiPropertyOptional({
    example: 149.9,
    description: 'Novo preço do produto',
  })
  price?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Novo ID de categoria do produto',
  })
  categoryId?: number;
}
