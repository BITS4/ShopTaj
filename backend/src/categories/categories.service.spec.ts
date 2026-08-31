import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  const prisma = {
    category: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: CategoriesService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('returns the root category tree', async () => {
    const categories = [
      {
        id: 'category-1',
        name: 'Groceries',
        children: [{ id: 'category-2', children: [] }],
      },
    ];
    prisma.category.findMany.mockResolvedValue(categories);

    await expect(service.findAll()).resolves.toBe(categories);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { parentId: null },
      include: { children: { include: { children: true } } },
    });
  });

  it('returns a category by slug with its immediate family', async () => {
    const category = {
      id: 'category-1',
      slug: 'green-tea',
      children: [],
      parent: null,
    };
    prisma.category.findUnique.mockResolvedValue(category);

    await expect(service.findBySlug('green-tea')).resolves.toBe(category);
    expect(prisma.category.findUnique).toHaveBeenCalledWith({
      where: { slug: 'green-tea' },
      include: { children: true, parent: true },
    });
  });

  it('rejects an unknown category slug', async () => {
    prisma.category.findUnique.mockResolvedValue(null);

    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a strict lowercase slug while preserving translated fields', async () => {
    const dto = {
      name: 'Tea & Coffee Gifts',
      nameRu: 'Чай и кофе',
      parentId: 'category-parent',
      imageUrl: 'https://cdn.example/category.jpg',
    };
    const created = { id: 'category-1', ...dto, slug: 'tea-and-coffee-gifts' };
    prisma.category.create.mockResolvedValue(created);

    await expect(service.create(dto)).resolves.toBe(created);
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { ...dto, slug: 'tea-and-coffee-gifts' },
    });
  });

  it('updates only the supplied category fields', async () => {
    const updated = { id: 'category-1', nameTg: 'Чой' };
    prisma.category.update.mockResolvedValue(updated);

    await expect(
      service.update('category-1', { nameTg: 'Чой' }),
    ).resolves.toBe(updated);
    expect(prisma.category.update).toHaveBeenCalledWith({
      where: { id: 'category-1' },
      data: { nameTg: 'Чой' },
    });
  });

  it('deletes a category and returns a stable confirmation', async () => {
    prisma.category.delete.mockResolvedValue({ id: 'category-1' });

    await expect(service.delete('category-1')).resolves.toEqual({
      message: 'Category deleted',
    });
    expect(prisma.category.delete).toHaveBeenCalledWith({
      where: { id: 'category-1' },
    });
  });
});
