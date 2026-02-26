import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Keyboard Mecânico',
    description: 'Nome do produto',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Teclado com switches táteis e RGB',
    description: 'Descrição do produto',
  })
  description?: string;

  @ApiProperty({
    example: 299.9,
    description: 'Preço do produto',
  })
  price!: number;

  @ApiProperty({
    example: 1,
    description: 'ID da categoria do produto',
  })
  categoryId!: number;
}
