import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/address.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    address: {
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const addressDto: CreateAddressDto = {
    label: 'Home',
    street: 'Rudaki Avenue',
    houseNumber: '42',
    city: 'Dushanbe',
    country: 'Tajikistan',
    zip: '734000',
  };

  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('getProfile', () => {
    it('returns the public profile selected for the authenticated user', async () => {
      const profile = {
        id: 'user-1',
        email: 'buyer@example.com',
        fullName: 'Test Buyer',
        phone: '+992900000001',
        avatarUrl: null,
        role: 'USER',
        isEmailVerified: true,
        isPhoneVerified: false,
        createdAt: new Date('2026-08-31T10:00:00.000Z'),
      };
      prisma.user.findUnique.mockResolvedValue(profile);

      await expect(service.getProfile('user-1')).resolves.toBe(profile);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          role: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: true,
        },
      });
    });

    it('throws when the authenticated user no longer exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing-user')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('updates only the supplied profile fields and returns the public selection', async () => {
    const updated = {
      id: 'user-1',
      email: 'buyer@example.com',
      fullName: 'Updated Buyer',
      phone: '+992900000001',
      avatarUrl: null,
    };
    prisma.user.update.mockResolvedValue(updated);

    await expect(
      service.updateProfile('user-1', { fullName: 'Updated Buyer' }),
    ).resolves.toBe(updated);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { fullName: 'Updated Buyer' },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
      },
    });
  });

  it('updates an avatar without exposing unrelated user fields', async () => {
    const updated = { id: 'user-1', avatarUrl: 'https://cdn.example/avatar.jpg' };
    prisma.user.update.mockResolvedValue(updated);

    await expect(
      service.updateAvatar('user-1', updated.avatarUrl),
    ).resolves.toBe(updated);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { avatarUrl: updated.avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  });

  it('lists only the user addresses with the default address first', async () => {
    const addresses = [
      { id: 'address-1', userId: 'user-1', isDefault: true },
      { id: 'address-2', userId: 'user-1', isDefault: false },
    ];
    prisma.address.findMany.mockResolvedValue(addresses);

    await expect(service.getAddresses('user-1')).resolves.toBe(addresses);
    expect(prisma.address.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { isDefault: 'desc' },
    });
  });

  describe('createAddress', () => {
    it('clears the previous default before creating a new default address', async () => {
      const created = {
        id: 'address-new',
        userId: 'user-1',
        ...addressDto,
        isDefault: true,
      };
      prisma.address.updateMany.mockResolvedValue({ count: 1 });
      prisma.address.create.mockResolvedValue(created);

      await expect(
        service.createAddress('user-1', { ...addressDto, isDefault: true }),
      ).resolves.toBe(created);

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDefault: false },
      });
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: { ...addressDto, isDefault: true, userId: 'user-1' },
      });
      expect(prisma.address.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.address.create.mock.invocationCallOrder[0],
      );
    });

    it('creates a non-default address without changing existing defaults', async () => {
      prisma.address.create.mockResolvedValue({
        id: 'address-new',
        userId: 'user-1',
        ...addressDto,
      });

      await service.createAddress('user-1', addressDto);

      expect(prisma.address.updateMany).not.toHaveBeenCalled();
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: { ...addressDto, userId: 'user-1' },
      });
    });
  });

  describe('updateAddress', () => {
    it('rejects an address that is missing or owned by another user', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAddress('user-1', 'foreign-address', { city: 'Khujand' }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: 'foreign-address', userId: 'user-1' },
      });
      expect(prisma.address.update).not.toHaveBeenCalled();
    });

    it('changes the default atomically from the service perspective before updating', async () => {
      const updated = {
        id: 'address-1',
        userId: 'user-1',
        ...addressDto,
        isDefault: true,
      };
      prisma.address.findFirst.mockResolvedValue({
        id: 'address-1',
        userId: 'user-1',
      });
      prisma.address.updateMany.mockResolvedValue({ count: 1 });
      prisma.address.update.mockResolvedValue(updated);

      await expect(
        service.updateAddress('user-1', 'address-1', { isDefault: true }),
      ).resolves.toBe(updated);

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDefault: false },
      });
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'address-1' },
        data: { isDefault: true },
      });
    });

    it('updates a regular field without disturbing the current default', async () => {
      prisma.address.findFirst.mockResolvedValue({
        id: 'address-1',
        userId: 'user-1',
      });
      prisma.address.update.mockResolvedValue({
        id: 'address-1',
        city: 'Khujand',
      });

      await service.updateAddress('user-1', 'address-1', { city: 'Khujand' });

      expect(prisma.address.updateMany).not.toHaveBeenCalled();
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'address-1' },
        data: { city: 'Khujand' },
      });
    });
  });

  describe('deleteAddress', () => {
    it('rejects deletion when the scoped address lookup finds no match', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteAddress('user-1', 'foreign-address'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.address.delete).not.toHaveBeenCalled();
    });

    it('deletes an owned address and returns a stable confirmation', async () => {
      prisma.address.findFirst.mockResolvedValue({
        id: 'address-1',
        userId: 'user-1',
      });
      prisma.address.delete.mockResolvedValue({ id: 'address-1' });

      await expect(
        service.deleteAddress('user-1', 'address-1'),
      ).resolves.toEqual({ message: 'Address deleted' });
      expect(prisma.address.delete).toHaveBeenCalledWith({
        where: { id: 'address-1' },
      });
    });
  });
});
