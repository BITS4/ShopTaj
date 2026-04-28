import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import slugify from 'slugify';

export class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() imageUrl?: string;
}

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: { include: { children: true } } },
    });
  }

  async findBySlug(slug: string) {
    const cat = await this.prisma.category.findUnique({
      where: { slug },
      include: { children: true, parent: true },
    });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    return this.prisma.category.create({ data: { ...dto, slug } });
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
