import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const adminHash = await bcrypt.hash('Admin123!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shoptaj.com' },
    update: {},
    create: {
      email: 'admin@shoptaj.com',
      passwordHash: adminHash,
      fullName: 'Admin User',
      role: 'ADMIN',
      isEmailVerified: true,
      cart: { create: {} },
    },
  })
  console.log('✅ Admin user:', admin.email)

  // Test user
  const userHash = await bcrypt.hash('User1234!', 12)
  const user = await prisma.user.upsert({
    where: { email: 'user@shoptaj.com' },
    update: {},
    create: {
      email: 'user@shoptaj.com',
      passwordHash: userHash,
      fullName: 'John Doe',
      role: 'USER',
      isEmailVerified: true,
      cart: { create: {} },
    },
  })
  console.log('✅ Test user:', user.email)

  // Categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  })

  const clothing = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: { name: 'Clothing', slug: 'clothing' },
  })

  const homeGarden = await prisma.category.upsert({
    where: { slug: 'home-garden' },
    update: {},
    create: { name: 'Home & Garden', slug: 'home-garden' },
  })

  const books = await prisma.category.upsert({
    where: { slug: 'books' },
    update: {},
    create: { name: 'Books', slug: 'books' },
  })
  console.log('✅ Categories created')

  // Products
  const products = [
    { name: 'Wireless Headphones Pro', price: 149.99, discountPrice: 119.99, stock: 50, categoryId: electronics.id, brand: 'SoundMax', isFeatured: true, tags: ['audio', 'wireless', 'bluetooth'], description: 'Premium wireless headphones with active noise cancellation and 30-hour battery life.' },
    { name: 'Smart Watch Series X', price: 299.99, discountPrice: 249.99, stock: 30, categoryId: electronics.id, brand: 'TechWear', isFeatured: true, tags: ['wearable', 'health', 'smartwatch'], description: 'Advanced smartwatch with health tracking, GPS, and 7-day battery.' },
    { name: 'Mechanical Keyboard', price: 89.99, stock: 100, categoryId: electronics.id, brand: 'TypeMaster', isFeatured: false, tags: ['keyboard', 'gaming', 'mechanical'], description: 'Tactile mechanical keyboard with RGB lighting and programmable keys.' },
    { name: 'Classic White T-Shirt', price: 29.99, stock: 200, categoryId: clothing.id, brand: 'BasicWear', isFeatured: true, tags: ['basic', 'casual', 'cotton'], description: '100% organic cotton t-shirt. Soft, breathable, and perfect for everyday wear.' },
    { name: 'Slim Fit Jeans', price: 79.99, discountPrice: 59.99, stock: 75, categoryId: clothing.id, brand: 'DenimCo', isFeatured: true, tags: ['denim', 'casual', 'jeans'], description: 'Modern slim-fit jeans made from premium stretch denim.' },
    { name: 'Running Sneakers', price: 119.99, discountPrice: 99.99, stock: 45, categoryId: clothing.id, brand: 'StepUp', isFeatured: false, tags: ['shoes', 'running', 'sports'], description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper.' },
    { name: 'Coffee Maker Deluxe', price: 69.99, stock: 40, categoryId: homeGarden.id, brand: 'BrewMaster', isFeatured: true, tags: ['kitchen', 'coffee', 'appliance'], description: 'Programmable 12-cup coffee maker with built-in grinder and thermal carafe.' },
    { name: 'Indoor Plant Kit', price: 34.99, stock: 80, categoryId: homeGarden.id, brand: 'GreenThumb', isFeatured: false, tags: ['plants', 'indoor', 'gardening'], description: 'Complete starter kit with 5 low-maintenance indoor plants and care guide.' },
    { name: 'Clean Code - Robert Martin', price: 44.99, stock: 60, categoryId: books.id, brand: 'TechBooks', isFeatured: false, tags: ['programming', 'software', 'engineering'], description: 'A handbook of agile software craftsmanship. Essential reading for developers.' },
    { name: 'Design Patterns', price: 54.99, stock: 35, categoryId: books.id, brand: 'TechBooks', isFeatured: false, tags: ['programming', 'patterns', 'architecture'], description: 'The classic Gang of Four book on reusable object-oriented design patterns.' },
  ]

  for (const p of products) {
    const { tags, ...rest } = p
    await prisma.product.upsert({
      where: { slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
      update: {},
      create: {
        ...rest,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        tags,
      },
    })
  }
  console.log('✅ Products created')

  // Coupon
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minOrderValue: 20,
      isActive: true,
    },
  })

  await prisma.coupon.upsert({
    where: { code: 'SAVE20' },
    update: {},
    create: {
      code: 'SAVE20',
      discountType: 'FIXED',
      discountValue: 20,
      minOrderValue: 100,
      isActive: true,
    },
  })
  console.log('✅ Coupons created')

  console.log('\n🎉 Seed complete!')
  console.log('Admin:     admin@shoptaj.com / Admin123!')
  console.log('Test user: user@shoptaj.com  / User1234!')
  console.log('Coupons:   WELCOME10 (10%), SAVE20 ($20 off)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
