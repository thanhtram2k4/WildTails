import { Injectable, NotFoundException } from '@nestjs/common';
import { AvatarConfigSchema } from '@wildtails/contracts';
import type {
  UserProfileResponse,
  PublicUserProfileResponse,
  UpdateUserProfileRequest,
  PlanetMembershipResponse,
  PlanetResponse,
} from '@wildtails/contracts';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the full profile including email — for the authenticated user only (GET /users/me).
   * Never returns passwordHash.
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        avatarConfig: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      bio: user.bio ?? undefined,
      joinedAt: user.createdAt.toISOString(),
      avatarConfig: user.avatarConfig ?? undefined,
    };
  }

  /**
   * Returns a public profile — email is intentionally omitted (GET /users/:id).
   * Soft-deleted users are not surfaced.
   */
  async getPublicProfile(userId: string): Promise<PublicUserProfileResponse> {
    const user = await this.prisma.db.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        avatarConfig: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      bio: user.bio ?? undefined,
      joinedAt: user.createdAt.toISOString(),
      avatarConfig: user.avatarConfig ?? undefined,
    };
  }

  /**
   * Updates the authenticated user's own profile.
   * Validates avatarConfig against AvatarConfigSchema before persisting.
   * Owner is always enforced by the caller passing their own userId from the JWT.
   */
  async updateProfile(userId: string, dto: UpdateUserProfileRequest): Promise<UserProfileResponse> {
    // Validate avatarConfig if provided — never trust client-supplied shape
    if (dto.avatarConfig !== undefined) {
      const result = AvatarConfigSchema.safeParse(dto.avatarConfig);
      if (!result.success) {
        const { BadRequestException } = await import('@nestjs/common');
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid avatarConfig',
          details: result.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
            code: i.code,
          })),
        });
      }
    }

    const user = await this.prisma.db.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
        ...(dto.avatarConfig !== undefined ? { avatarConfig: dto.avatarConfig } : {}),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        avatarConfig: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      bio: user.bio ?? undefined,
      joinedAt: user.createdAt.toISOString(),
      avatarConfig: user.avatarConfig ?? undefined,
    };
  }

  /**
   * Returns planets the user is currently a member of (leftAt IS NULL).
   * Joined planets include basic planet metadata and the membership details.
   */
  async getUserPlanets(
    userId: string,
  ): Promise<Array<{ membership: PlanetMembershipResponse; planet: PlanetResponse }>> {
    const memberships = await this.prisma.db.planetMembership.findMany({
      where: { userId, leftAt: null },
      include: {
        planet: {
          include: {
            _count: {
              select: { memberships: { where: { leftAt: null } } },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      membership: {
        planetId: m.planetId,
        userId: m.userId,
        role: m.role as PlanetMembershipResponse['role'],
        joinedAt: m.joinedAt.toISOString(),
        leftAt: m.leftAt ? m.leftAt.toISOString() : null,
      },
      planet: {
        id: m.planet.id,
        name: m.planet.name,
        slug: m.planet.slug,
        description: m.planet.description ?? undefined,
        iconUrl: m.planet.iconUrl ?? undefined,
        isDefault: m.planet.isDefault,
        memberCount: m.planet._count.memberships,
        createdAt: m.planet.createdAt.toISOString(),
      },
    }));
  }
}
