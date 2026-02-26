import { Category } from '../../category/entities/category.entity';

export class Product {
  id!: number;
  name!: string;
  description!: string | null;
  price!: number;
  categoryId!: number;
  category?: Category;
  createdAt!: Date;
  updatedAt!: Date;
}
