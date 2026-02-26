import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Home Office',
    description: 'Novo nome da categoria',
  })
  name?: string;
}
