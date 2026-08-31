import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApplySellerDto, SellerService } from './seller.service';

describe('SellerService', () => {
  const approvedProfile = {
    id: 'seller-1',
    userId: 'user-1',
    status: 'APPROVED',
  };
  const prisma = {
    product: {
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    sellerProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const cloudinary = {
    uploadDocument: jest.fn(),
    uploadImage: jest.fn(),
  };

  let service: SellerService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellerService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinary },
      ],
    }).compile();

    service = module.get(SellerService);
  });

  describe('onboarding', () => {
    it('creates the first seller application', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);
      prisma.sellerProfile.create.mockResolvedValue({
        ...approvedProfile,
        status: 'PENDING',
        shopName: 'Pamir Goods',
      });

      await service.apply('user-1', {
        shopName: 'Pamir Goods',
        description: 'Local products',
      });

      expect(prisma.sellerProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          shopName: 'Pamir Goods',
          description: 'Local products',
        },
      });
    });

    it('rejects a duplicate seller application without mutating data', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue({
        ...approvedProfile,
        status: 'PENDING',
      });

      await expect(
        service.apply('user-1', { shopName: 'Second Shop' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.sellerProfile.create).not.toHaveBeenCalled();
    });

    it('enforces seller application length constraints', async () => {
      const invalid = Object.assign(new ApplySellerDto(), {
        shopName: 'x',
        description: 'd'.repeat(501),
      });

      const errors = await validate(invalid);

      expect(errors.map((error) => error.property)).toEqual(
        expect.arrayContaining(['shopName', 'description']),
      );

      const valid = Object.assign(new ApplySellerDto(), {
        shopName: 'Pamir Goods',
      });
      await expect(validate(valid)).resolves.toHaveLength(0);
    });

    it('returns null for a user without a seller profile', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('user-1')).resolves.toBeNull();
      expect(prisma.sellerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
        },
      });
    });
  });

  describe('document uploads', () => {
    const files = [
      { originalname: 'passport.pdf' },
      { originalname: 'license.png' },
    ] as Express.Multer.File[];

    it('requires an existing seller profile', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadDocuments('user-1', files),
      ).rejects.toThrow('Seller profile not found');
      expect(cloudinary.uploadDocument).not.toHaveBeenCalled();
      expect(prisma.sellerProfile.update).not.toHaveBeenCalled();
    });

    it('uploads every document and atomically appends the returned URLs', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      cloudinary.uploadDocument
        .mockResolvedValueOnce({
          secure_url: 'https://cdn.test/passport.pdf',
          public_id: 'passport',
        })
        .mockResolvedValueOnce({
          secure_url: 'https://cdn.test/license.png',
          public_id: 'license',
        });
      prisma.sellerProfile.update.mockResolvedValue({ id: 'seller-1' });

      await service.uploadDocuments('user-1', files);

      expect(cloudinary.uploadDocument).toHaveBeenNthCalledWith(
        1,
        files[0],
        'seller-docs',
      );
      expect(cloudinary.uploadDocument).toHaveBeenNthCalledWith(
        2,
        files[1],
        'seller-docs',
      );
      expect(prisma.sellerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: {
          documents: {
            push: [
              'https://cdn.test/passport.pdf',
              'https://cdn.test/license.png',
            ],
          },
        },
      });
    });
  });

  describe('approval policy and product listing', () => {
    it('rejects users who have not completed seller onboarding', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProducts('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('gives pending and rejected sellers distinct authorization failures', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValueOnce({
        ...approvedProfile,
        status: 'PENDING',
      });
      await expect(service.getProducts('user-1')).rejects.toThrow(
        'Your seller account is pending approval',
      );

      prisma.sellerProfile.findUnique.mockResolvedValueOnce({
        ...approvedProfile,
        status: 'REJECTED',
      });
      await expect(service.getProducts('user-1')).rejects.toThrow(
        'Your seller account has been rejected',
      );
    });

    it('scopes paginated products to the approved seller', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      prisma.product.findMany.mockResolvedValue([{ id: 'product-1' }]);
      prisma.product.count.mockResolvedValue(6);

      await expect(service.getProducts('user-1', 3, 2)).resolves.toEqual({
        data: [{ id: 'product-1' }],
        meta: { total: 6, page: 3, limit: 2 },
      });
      expect(prisma.product.findMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1' },
        include: { images: true, category: true },
        skip: 4,
        take: 2,
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { sellerId: 'seller-1' },
      });
    });
  });

  describe('seller product mutations', () => {
    it('generates a unique slug and nests variants under the seller product', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: 'existing-1' })
        .mockResolvedValueOnce({ id: 'existing-2' })
        .mockResolvedValueOnce(null);
      prisma.product.create.mockResolvedValue({ id: 'product-1' });
      const dto = {
        name: 'Summer Shirt!',
        description: 'Cotton',
        price: 30,
        stock: 8,
        categoryId: '8d3bce57-5e13-4d71-8942-72d6b7a49324',
        variants: [{ sku: 'SHIRT-S', size: 'S', stock: 3 }],
      };

      await service.createProduct('user-1', dto);

      expect(prisma.product.findUnique).toHaveBeenNthCalledWith(1, {
        where: { slug: 'summer-shirt' },
      });
      expect(prisma.product.findUnique).toHaveBeenNthCalledWith(2, {
        where: { slug: 'summer-shirt-1' },
      });
      expect(prisma.product.findUnique).toHaveBeenNthCalledWith(3, {
        where: { slug: 'summer-shirt-2' },
      });
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: {
          name: 'Summer Shirt!',
          description: 'Cotton',
          price: 30,
          stock: 8,
          categoryId: '8d3bce57-5e13-4d71-8942-72d6b7a49324',
          slug: 'summer-shirt-2',
          sellerId: 'seller-1',
          variants: {
            create: [{ sku: 'SHIRT-S', size: 'S', stock: 3 }],
          },
        },
      });
    });

    it('omits nested variant creation for an empty variant list', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: 'product-1' });

      await service.createProduct('user-1', {
        name: 'Tea',
        price: 12,
        stock: 5,
        categoryId: '8d3bce57-5e13-4d71-8942-72d6b7a49324',
        variants: [],
      });

      expect(prisma.product.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ variants: undefined }),
      });
    });

    it('rejects mutation of another seller\'s product before uploading', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-2',
        sellerId: 'seller-2',
      });

      await expect(
        service.addProductImages('user-1', 'product-2', [
          { originalname: 'image.png' } as Express.Multer.File,
        ]),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(cloudinary.uploadImage).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('rejects mutation of a missing product', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteProduct('user-1', 'missing-product'),
      ).rejects.toThrow('Product not found');
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it('uploads owned product images with deterministic main-image ordering', async () => {
      const files = [
        { originalname: 'front.png' },
        { originalname: 'back.png' },
      ] as Express.Multer.File[];
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        sellerId: 'seller-1',
      });
      cloudinary.uploadImage
        .mockResolvedValueOnce({
          secure_url: 'https://cdn.test/front.png',
          public_id: 'front',
        })
        .mockResolvedValueOnce({
          secure_url: 'https://cdn.test/back.png',
          public_id: 'back',
        });
      prisma.product.update.mockResolvedValue({ id: 'product-1' });

      await service.addProductImages('user-1', 'product-1', files);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: {
          images: {
            create: [
              {
                url: 'https://cdn.test/front.png',
                publicId: 'front',
                isMain: true,
                sortOrder: 0,
              },
              {
                url: 'https://cdn.test/back.png',
                publicId: 'back',
                isMain: false,
                sortOrder: 1,
              },
            ],
          },
        },
        include: { images: true },
      });
    });

    it('strips variants from scalar updates and deletes only owned products', async () => {
      prisma.sellerProfile.findUnique.mockResolvedValue(approvedProfile);
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-1',
        sellerId: 'seller-1',
      });
      prisma.product.update.mockResolvedValue({ id: 'product-1', stock: 4 });
      prisma.product.delete.mockResolvedValue({ id: 'product-1' });

      await service.updateProduct('user-1', 'product-1', {
        stock: 4,
        variants: [{ sku: 'IGNORED', stock: 1 }],
      });
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        data: { stock: 4 },
      });

      await service.deleteProduct('user-1', 'product-1');
      expect(prisma.product.delete).toHaveBeenCalledWith({
        where: { id: 'product-1' },
      });
    });
  });
});
