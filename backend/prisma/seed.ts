import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@shoptaj.com' } });
  if (existing) { console.log('✅ Already seeded — skipping'); return; }
  console.log('🌱 Seeding database...')

  const adminHash = await bcrypt.hash('Admin123!', 12)
  await prisma.user.upsert({
    where: { email: 'admin@shoptaj.com' },
    update: {},
    create: {
      email: 'admin@shoptaj.com', passwordHash: adminHash,
      fullName: 'Admin User', role: 'ADMIN', isEmailVerified: true,
      cart: { create: {} },
    },
  })
  console.log('✅ Admin user: admin@shoptaj.com')

  const userHash = await bcrypt.hash('User1234!', 12)
  await prisma.user.upsert({
    where: { email: 'user@shoptaj.com' },
    update: {},
    create: {
      email: 'user@shoptaj.com', passwordHash: userHash,
      fullName: 'John Doe', role: 'USER', isEmailVerified: true,
      cart: { create: {} },
    },
  })
  console.log('✅ Test user: user@shoptaj.com')

  // ── Top-level categories ──────────────────────────────────────────────────
  const electronics = await prisma.category.upsert({ where: { slug: 'electronics' }, update: { nameRu: 'Электроника', nameTg: 'Электроника' }, create: { name: 'Electronics', nameRu: 'Электроника', nameTg: 'Электроника', slug: 'electronics' } })
  const clothing    = await prisma.category.upsert({ where: { slug: 'clothing' }, update: { nameRu: 'Одежда', nameTg: 'Либос' }, create: { name: 'Clothing', nameRu: 'Одежда', nameTg: 'Либос', slug: 'clothing' } })
  const homeGarden  = await prisma.category.upsert({ where: { slug: 'home-garden' }, update: { nameRu: 'Дом и сад', nameTg: 'Хона ва боғ' }, create: { name: 'Home & Garden', nameRu: 'Дом и сад', nameTg: 'Хона ва боғ', slug: 'home-garden' } })
  const books       = await prisma.category.upsert({ where: { slug: 'books' }, update: { nameRu: 'Книги', nameTg: 'Китобҳо' }, create: { name: 'Books', nameRu: 'Книги', nameTg: 'Китобҳо', slug: 'books' } })
  const cosmetics   = await prisma.category.upsert({ where: { slug: 'cosmetics' }, update: { nameRu: 'Косметика', nameTg: 'Косметика' }, create: { name: 'Beauty & Cosmetics', nameRu: 'Косметика', nameTg: 'Косметика', slug: 'cosmetics' } })
  const sports      = await prisma.category.upsert({ where: { slug: 'sports' }, update: { nameRu: 'Спорт', nameTg: 'Варзиш' }, create: { name: 'Sports & Fitness', nameRu: 'Спорт', nameTg: 'Варзиш', slug: 'sports' } })
  const food        = await prisma.category.upsert({ where: { slug: 'food' }, update: { nameRu: 'Продукты', nameTg: 'Хӯрокворӣ' }, create: { name: 'Food & Groceries', nameRu: 'Продукты', nameTg: 'Хӯрокворӣ', slug: 'food' } })
  const toys        = await prisma.category.upsert({ where: { slug: 'toys' }, update: { nameRu: 'Игрушки', nameTg: 'Бозичаҳо' }, create: { name: 'Toys & Kids', nameRu: 'Игрушки', nameTg: 'Бозичаҳо', slug: 'toys' } })
  const decoration  = await prisma.category.upsert({ where: { slug: 'decoration' }, update: { nameRu: 'Декор', nameTg: 'Декор' }, create: { name: 'Decoration & Art', nameRu: 'Декор', nameTg: 'Декор', slug: 'decoration' } })
  const automotive  = await prisma.category.upsert({ where: { slug: 'automotive' }, update: { nameRu: 'Авто', nameTg: 'Автомобил' }, create: { name: 'Automotive', nameRu: 'Авто', nameTg: 'Автомобил', slug: 'automotive' } })
  const health      = await prisma.category.upsert({ where: { slug: 'health' }, update: { nameRu: 'Здоровье', nameTg: 'Саломатӣ' }, create: { name: 'Health & Pharmacy', nameRu: 'Здоровье', nameTg: 'Саломатӣ', slug: 'health' } })
  const stationery  = await prisma.category.upsert({ where: { slug: 'stationery' }, update: { nameRu: 'Канцтовары', nameTg: 'Қиртосворӣ' }, create: { name: 'Stationery & Office', nameRu: 'Канцтовары', nameTg: 'Қиртосворӣ', slug: 'stationery' } })
  const pets        = await prisma.category.upsert({ where: { slug: 'pets' }, update: { nameRu: 'Животные', nameTg: 'Ҳайвонот' }, create: { name: 'Pets & Animals', nameRu: 'Животные', nameTg: 'Ҳайвонот', slug: 'pets' } })
  const furniture   = await prisma.category.upsert({ where: { slug: 'furniture' }, update: { nameRu: 'Мебель', nameTg: 'Мебел' }, create: { name: 'Furniture', nameRu: 'Мебель', nameTg: 'Мебел', slug: 'furniture' } })

  // ── Sub-categories ────────────────────────────────────────────────────────
  await prisma.category.upsert({ where: { slug: 'phones' }, update: { nameRu: 'Телефоны', nameTg: 'Телефонҳо' }, create: { name: 'Phones', nameRu: 'Телефоны', nameTg: 'Телефонҳо', slug: 'phones', parentId: electronics.id } })
  await prisma.category.upsert({ where: { slug: 'laptops' }, update: { nameRu: 'Ноутбуки', nameTg: 'Ноутбукҳо' }, create: { name: 'Laptops & Computers', nameRu: 'Ноутбуки', nameTg: 'Ноутбукҳо', slug: 'laptops', parentId: electronics.id } })
  await prisma.category.upsert({ where: { slug: 'audio' }, update: { nameRu: 'Аудио', nameTg: 'Аудио' }, create: { name: 'Audio & Headphones', nameRu: 'Аудио', nameTg: 'Аудио', slug: 'audio', parentId: electronics.id } })
  await prisma.category.upsert({ where: { slug: 'wearables' }, update: { nameRu: 'Носимые устройства', nameTg: 'Дастгоҳҳои пӯшиданӣ' }, create: { name: 'Wearables', nameRu: 'Носимые устройства', nameTg: 'Дастгоҳҳои пӯшиданӣ', slug: 'wearables', parentId: electronics.id } })
  await prisma.category.upsert({ where: { slug: 'cameras' }, update: { nameRu: 'Камеры', nameTg: 'Камераҳо' }, create: { name: 'Cameras', nameRu: 'Камеры', nameTg: 'Камераҳо', slug: 'cameras', parentId: electronics.id } })
  await prisma.category.upsert({ where: { slug: 'mens-clothing' }, update: { nameRu: 'Мужская одежда', nameTg: 'Либоси мардона' }, create: { name: "Men's Clothing", nameRu: 'Мужская одежда', nameTg: 'Либоси мардона', slug: 'mens-clothing', parentId: clothing.id } })
  await prisma.category.upsert({ where: { slug: 'womens-clothing' }, update: { nameRu: 'Женская одежда', nameTg: 'Либоси занона' }, create: { name: "Women's Clothing", nameRu: 'Женская одежда', nameTg: 'Либоси занона', slug: 'womens-clothing', parentId: clothing.id } })
  await prisma.category.upsert({ where: { slug: 'shoes' }, update: { nameRu: 'Обувь', nameTg: 'Пойафзол' }, create: { name: 'Shoes & Footwear', nameRu: 'Обувь', nameTg: 'Пойафзол', slug: 'shoes', parentId: clothing.id } })
  await prisma.category.upsert({ where: { slug: 'kids-clothing' }, update: { nameRu: 'Детская одежда', nameTg: 'Либоси кӯдакон' }, create: { name: "Kids' Clothing", nameRu: 'Детская одежда', nameTg: 'Либоси кӯдакон', slug: 'kids-clothing', parentId: clothing.id } })
  await prisma.category.upsert({ where: { slug: 'skincare' }, update: { nameRu: 'Уход за кожей', nameTg: 'Нигоҳубини пӯст' }, create: { name: 'Skincare', nameRu: 'Уход за кожей', nameTg: 'Нигоҳубини пӯст', slug: 'skincare', parentId: cosmetics.id } })
  await prisma.category.upsert({ where: { slug: 'makeup' }, update: { nameRu: 'Макияж', nameTg: 'Макияж' }, create: { name: 'Makeup', nameRu: 'Макияж', nameTg: 'Макияж', slug: 'makeup', parentId: cosmetics.id } })
  await prisma.category.upsert({ where: { slug: 'perfumes' }, update: { nameRu: 'Духи', nameTg: 'Атр' }, create: { name: 'Perfumes', nameRu: 'Духи', nameTg: 'Атр', slug: 'perfumes', parentId: cosmetics.id } })
  await prisma.category.upsert({ where: { slug: 'gym' }, update: { nameRu: 'Тренажёры', nameTg: 'Тренажёрҳо' }, create: { name: 'Gym Equipment', nameRu: 'Тренажёры', nameTg: 'Тренажёрҳо', slug: 'gym', parentId: sports.id } })
  await prisma.category.upsert({ where: { slug: 'outdoor' }, update: { nameRu: 'Туризм', nameTg: 'Туризм' }, create: { name: 'Outdoor & Hiking', nameRu: 'Туризм', nameTg: 'Туризм', slug: 'outdoor', parentId: sports.id } })
  await prisma.category.upsert({ where: { slug: 'kitchen' }, update: { nameRu: 'Кухня', nameTg: 'Ошхона' }, create: { name: 'Kitchen & Dining', nameRu: 'Кухня', nameTg: 'Ошхона', slug: 'kitchen', parentId: homeGarden.id } })
  await prisma.category.upsert({ where: { slug: 'lighting' }, update: { nameRu: 'Освещение', nameTg: 'Равшанӣ' }, create: { name: 'Lighting', nameRu: 'Освещение', nameTg: 'Равшанӣ', slug: 'lighting', parentId: decoration.id } })
  await prisma.category.upsert({ where: { slug: 'wall-art' }, update: { nameRu: 'Декор стен', nameTg: 'Декори девор' }, create: { name: 'Wall Art & Frames', nameRu: 'Декор стен', nameTg: 'Декори девор', slug: 'wall-art', parentId: decoration.id } })

  console.log('✅ Categories created (14 top-level + 17 sub-categories)')

  const products = [
    {
      name: 'Wireless Headphones Pro',
      nameRu: 'Беспроводные наушники Pro',
      nameTg: 'Гӯшмонакҳои беим Pro',
      slug: 'wireless-headphones-pro',
      description: 'Premium wireless headphones with active noise cancellation and 30-hour battery life.',
      descriptionRu: 'Беспроводные наушники с активным шумоподавлением и аккумулятором на 30 часов.',
      descriptionTg: 'Гӯшмонакҳои беими дараҷаи баланд бо хомӯшсозии фаъоли садо ва батареяи 30-соата.',
      price: 149.99, discountPrice: 119.99, stock: 50,
      categoryId: electronics.id, brand: 'SoundMax', isFeatured: true,
      tags: ['audio', 'wireless', 'bluetooth'],
    },
    {
      name: 'Smart Watch Series X',
      nameRu: 'Смарт-часы серии X',
      nameTg: 'Соати зирак силсилаи X',
      slug: 'smart-watch-series-x',
      description: 'Advanced smartwatch with health tracking, GPS, and 7-day battery.',
      descriptionRu: 'Умные часы с мониторингом здоровья, GPS и аккумулятором на 7 дней.',
      descriptionTg: 'Соати зираки пешрафта бо пайгирии саломатӣ, GPS ва батареяи 7-рӯза.',
      price: 299.99, discountPrice: 249.99, stock: 30,
      categoryId: electronics.id, brand: 'TechWear', isFeatured: true,
      tags: ['wearable', 'health', 'smartwatch'],
    },
    {
      name: 'Mechanical Keyboard',
      nameRu: 'Механическая клавиатура',
      nameTg: 'Клавиатураи механикӣ',
      slug: 'mechanical-keyboard',
      description: 'Tactile mechanical keyboard with RGB lighting and programmable keys.',
      descriptionRu: 'Механическая клавиатура с тактильной отдачей, RGB-подсветкой и программируемыми клавишами.',
      descriptionTg: 'Клавиатураи механикии тактилӣ бо равшании RGB ва тугмаҳои барномарезишаванда.',
      price: 89.99, stock: 100,
      categoryId: electronics.id, brand: 'TypeMaster', isFeatured: false,
      tags: ['keyboard', 'gaming', 'mechanical'],
    },
    {
      name: 'Classic White T-Shirt',
      nameRu: 'Классическая белая футболка',
      nameTg: 'Пероҳани сафеди классикӣ',
      slug: 'classic-white-t-shirt',
      description: '100% organic cotton t-shirt. Soft, breathable, and perfect for everyday wear.',
      descriptionRu: 'Футболка из 100% органического хлопка. Мягкая, дышащая, для повседневной носки.',
      descriptionTg: 'Пероҳан аз 100% пахтаи органикӣ. Нарм, нафасгир ва барои пӯшидани ҳаррӯза мувофиқ.',
      price: 29.99, stock: 200,
      categoryId: clothing.id, brand: 'BasicWear', isFeatured: true,
      tags: ['basic', 'casual', 'cotton'],
    },
    {
      name: 'Slim Fit Jeans',
      nameRu: 'Джинсы зауженного кроя',
      nameTg: 'Джинси борики дӯхташуда',
      slug: 'slim-fit-jeans',
      description: 'Modern slim-fit jeans made from premium stretch denim.',
      descriptionRu: 'Современные зауженные джинсы из эластичного денима премиум-класса.',
      descriptionTg: 'Джинси борики муосир аз деними кашшофпазири дараҷаи аъло.',
      price: 79.99, discountPrice: 59.99, stock: 75,
      categoryId: clothing.id, brand: 'DenimCo', isFeatured: true,
      tags: ['denim', 'casual', 'jeans'],
    },
    {
      name: 'Running Sneakers',
      nameRu: 'Беговые кроссовки',
      nameTg: 'Пойафзоли давидан',
      slug: 'running-sneakers',
      description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper.',
      descriptionRu: 'Лёгкие кроссовки с отзывчивой амортизацией и дышащей сетчатой поверхностью.',
      descriptionTg: 'Пойафзоли сабуки давидан бо ҷаббаи посухдиҳанда ва рӯяи тӯригии нафасгир.',
      price: 119.99, discountPrice: 99.99, stock: 45,
      categoryId: clothing.id, brand: 'StepUp', isFeatured: false,
      tags: ['shoes', 'running', 'sports'],
    },
    {
      name: 'Coffee Maker Deluxe',
      nameRu: 'Кофеварка Deluxe',
      nameTg: 'Кофепаз Deluxe',
      slug: 'coffee-maker-deluxe',
      description: 'Programmable 12-cup coffee maker with built-in grinder and thermal carafe.',
      descriptionRu: 'Программируемая кофеварка на 12 чашек со встроенной кофемолкой и термосом.',
      descriptionTg: 'Кофепази барномарезишавандаи 12-косагӣ бо осиёби дохилӣ ва термос.',
      price: 69.99, stock: 40,
      categoryId: homeGarden.id, brand: 'BrewMaster', isFeatured: true,
      tags: ['kitchen', 'coffee', 'appliance'],
    },
    {
      name: 'Indoor Plant Kit',
      nameRu: 'Набор комнатных растений',
      nameTg: 'Маҷмӯаи растаниҳои хонагӣ',
      slug: 'indoor-plant-kit',
      description: 'Complete starter kit with 5 low-maintenance indoor plants and care guide.',
      descriptionRu: 'Полный стартовый набор с 5 неприхотливыми комнатными растениями и руководством по уходу.',
      descriptionTg: 'Маҷмӯаи пурраи ибтидоӣ бо 5 растании хонагии беэҳтиёткор ва дастури нигоҳубин.',
      price: 34.99, stock: 80,
      categoryId: homeGarden.id, brand: 'GreenThumb', isFeatured: false,
      tags: ['plants', 'indoor', 'gardening'],
    },
    {
      // Book title kept in English — it's a globally known proper title
      name: 'Clean Code',
      nameRu: 'Clean Code',
      nameTg: 'Clean Code',
      slug: 'clean-code-robert-martin',
      description: 'A handbook of agile software craftsmanship by Robert C. Martin. Essential reading for every developer.',
      descriptionRu: 'Руководство по гибкому программированию от Роберта К. Мартина. Обязательное чтение для каждого разработчика.',
      descriptionTg: 'Дастури барномасозии чолоки Роберт К. Мартин. Хондани ҳатмӣ барои ҳар як барномасоз.',
      price: 44.99, stock: 60,
      categoryId: books.id, brand: 'Robert C. Martin', isFeatured: false,
      tags: ['programming', 'software', 'engineering'],
    },
    {
      // Book title kept in English — globally recognised
      name: 'Design Patterns',
      nameRu: 'Design Patterns',
      nameTg: 'Design Patterns',
      slug: 'design-patterns',
      description: 'The classic Gang of Four book on reusable object-oriented design patterns.',
      descriptionRu: 'Классическая книга «Банды четырёх» о паттернах объектно-ориентированного проектирования.',
      descriptionTg: 'Китоби классикии «Гурӯҳи чаҳор» дар бораи намунаҳои тарроҳии шайъгаро.',
      price: 54.99, stock: 35,
      categoryId: books.id, brand: 'Gang of Four', isFeatured: false,
      tags: ['programming', 'patterns', 'architecture'],
    },
  ]

  for (const p of products) {
    const { tags, ...rest } = p
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        nameRu: rest.nameRu, nameTg: rest.nameTg,
        descriptionRu: rest.descriptionRu, descriptionTg: rest.descriptionTg,
      },
      create: { ...rest, tags },
    })
  }
  console.log('✅ Products created with translations')

  await prisma.coupon.upsert({ where: { code: 'WELCOME10' }, update: {}, create: { code: 'WELCOME10', discountType: 'PERCENTAGE', discountValue: 10, minOrderValue: 20, isActive: true } })
  await prisma.coupon.upsert({ where: { code: 'SAVE20' }, update: {}, create: { code: 'SAVE20', discountType: 'FIXED', discountValue: 20, minOrderValue: 100, isActive: true } })
  console.log('✅ Coupons created')

  console.log('\n🎉 Seed complete!')
  console.log('Admin:     admin@shoptaj.com / Admin123!')
  console.log('Test user: user@shoptaj.com  / User1234!')
  console.log('Coupons:   WELCOME10 (10%), SAVE20 ($20 off)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
