import type { PrismaClient } from '@prisma/client';

interface CategoryFixture {
  name: string;
  nameRu: string;
  nameTg: string;
  slug: string;
}

const topLevelCategories = [
  {
    name: 'Electronics',
    nameRu: 'Электроника',
    nameTg: 'Электроника',
    slug: 'electronics',
  },
  { name: 'Clothing', nameRu: 'Одежда', nameTg: 'Либос', slug: 'clothing' },
  {
    name: 'Home & Garden',
    nameRu: 'Дом и сад',
    nameTg: 'Хона ва боғ',
    slug: 'home-garden',
  },
  { name: 'Books', nameRu: 'Книги', nameTg: 'Китобҳо', slug: 'books' },
  {
    name: 'Beauty & Cosmetics',
    nameRu: 'Косметика',
    nameTg: 'Косметика',
    slug: 'cosmetics',
  },
  { name: 'Sports & Fitness', nameRu: 'Спорт', nameTg: 'Варзиш', slug: 'sports' },
  {
    name: 'Food & Groceries',
    nameRu: 'Продукты',
    nameTg: 'Хӯрокворӣ',
    slug: 'food',
  },
  { name: 'Toys & Kids', nameRu: 'Игрушки', nameTg: 'Бозичаҳо', slug: 'toys' },
  { name: 'Decoration & Art', nameRu: 'Декор', nameTg: 'Декор', slug: 'decoration' },
  { name: 'Automotive', nameRu: 'Авто', nameTg: 'Автомобил', slug: 'automotive' },
  {
    name: 'Health & Pharmacy',
    nameRu: 'Здоровье',
    nameTg: 'Саломатӣ',
    slug: 'health',
  },
  {
    name: 'Stationery & Office',
    nameRu: 'Канцтовары',
    nameTg: 'Қиртосворӣ',
    slug: 'stationery',
  },
  { name: 'Pets & Animals', nameRu: 'Животные', nameTg: 'Ҳайвонот', slug: 'pets' },
  { name: 'Furniture', nameRu: 'Мебель', nameTg: 'Мебел', slug: 'furniture' },
] as const satisfies readonly CategoryFixture[];

type TopLevelCategorySlug = (typeof topLevelCategories)[number]['slug'];
type SubcategoryFixture = CategoryFixture & { parentSlug: TopLevelCategorySlug };

const subcategories = [
  {
    name: 'Phones',
    nameRu: 'Телефоны',
    nameTg: 'Телефонҳо',
    slug: 'phones',
    parentSlug: 'electronics',
  },
  {
    name: 'Laptops & Computers',
    nameRu: 'Ноутбуки',
    nameTg: 'Ноутбукҳо',
    slug: 'laptops',
    parentSlug: 'electronics',
  },
  {
    name: 'Audio & Headphones',
    nameRu: 'Аудио',
    nameTg: 'Аудио',
    slug: 'audio',
    parentSlug: 'electronics',
  },
  {
    name: 'Wearables',
    nameRu: 'Носимые устройства',
    nameTg: 'Дастгоҳҳои пӯшиданӣ',
    slug: 'wearables',
    parentSlug: 'electronics',
  },
  {
    name: 'Cameras',
    nameRu: 'Камеры',
    nameTg: 'Камераҳо',
    slug: 'cameras',
    parentSlug: 'electronics',
  },
  {
    name: "Men's Clothing",
    nameRu: 'Мужская одежда',
    nameTg: 'Либоси мардона',
    slug: 'mens-clothing',
    parentSlug: 'clothing',
  },
  {
    name: "Women's Clothing",
    nameRu: 'Женская одежда',
    nameTg: 'Либоси занона',
    slug: 'womens-clothing',
    parentSlug: 'clothing',
  },
  {
    name: 'Shoes & Footwear',
    nameRu: 'Обувь',
    nameTg: 'Пойафзол',
    slug: 'shoes',
    parentSlug: 'clothing',
  },
  {
    name: "Kids' Clothing",
    nameRu: 'Детская одежда',
    nameTg: 'Либоси кӯдакон',
    slug: 'kids-clothing',
    parentSlug: 'clothing',
  },
  {
    name: 'Skincare',
    nameRu: 'Уход за кожей',
    nameTg: 'Нигоҳубини пӯст',
    slug: 'skincare',
    parentSlug: 'cosmetics',
  },
  {
    name: 'Makeup',
    nameRu: 'Макияж',
    nameTg: 'Макияж',
    slug: 'makeup',
    parentSlug: 'cosmetics',
  },
  {
    name: 'Perfumes',
    nameRu: 'Духи',
    nameTg: 'Атр',
    slug: 'perfumes',
    parentSlug: 'cosmetics',
  },
  {
    name: 'Gym Equipment',
    nameRu: 'Тренажёры',
    nameTg: 'Тренажёрҳо',
    slug: 'gym',
    parentSlug: 'sports',
  },
  {
    name: 'Outdoor & Hiking',
    nameRu: 'Туризм',
    nameTg: 'Туризм',
    slug: 'outdoor',
    parentSlug: 'sports',
  },
  {
    name: 'Kitchen & Dining',
    nameRu: 'Кухня',
    nameTg: 'Ошхона',
    slug: 'kitchen',
    parentSlug: 'home-garden',
  },
  {
    name: 'Lighting',
    nameRu: 'Освещение',
    nameTg: 'Равшанӣ',
    slug: 'lighting',
    parentSlug: 'decoration',
  },
  {
    name: 'Wall Art & Frames',
    nameRu: 'Декор стен',
    nameTg: 'Декори девор',
    slug: 'wall-art',
    parentSlug: 'decoration',
  },
] as const satisfies readonly SubcategoryFixture[];

export interface ProductCategoryIds {
  electronics: string;
  clothing: string;
  homeGarden: string;
  books: string;
}

function requireCategoryId(
  categoryIds: ReadonlyMap<TopLevelCategorySlug, string>,
  slug: TopLevelCategorySlug,
): string {
  const categoryId = categoryIds.get(slug);
  if (!categoryId) {
    throw new Error(`Missing seeded category: ${slug}`);
  }
  return categoryId;
}

export async function seedCategories(prisma: PrismaClient): Promise<ProductCategoryIds> {
  const categoryIds = new Map<TopLevelCategorySlug, string>();

  for (const fixture of topLevelCategories) {
    const category = await prisma.category.upsert({
      where: { slug: fixture.slug },
      update: { nameRu: fixture.nameRu, nameTg: fixture.nameTg },
      create: { ...fixture },
    });
    categoryIds.set(fixture.slug, category.id);
  }

  for (const { parentSlug, ...fixture } of subcategories) {
    await prisma.category.upsert({
      where: { slug: fixture.slug },
      update: { nameRu: fixture.nameRu, nameTg: fixture.nameTg },
      create: {
        ...fixture,
        parentId: requireCategoryId(categoryIds, parentSlug),
      },
    });
  }

  console.log('✅ Categories created (14 top-level + 17 sub-categories)');

  return {
    electronics: requireCategoryId(categoryIds, 'electronics'),
    clothing: requireCategoryId(categoryIds, 'clothing'),
    homeGarden: requireCategoryId(categoryIds, 'home-garden'),
    books: requireCategoryId(categoryIds, 'books'),
  };
}
