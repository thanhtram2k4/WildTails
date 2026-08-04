import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { PlanetResponse, PlanetMembershipResponse } from '@wildtails/contracts';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PlanetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all planets with the count of active members.
   * Active = leftAt IS NULL.
   */
  async listPlanets(): Promise<PlanetResponse[]> {
    const planets = await this.prisma.db.planet.findMany({
      include: {
        _count: {
          select: { memberships: { where: { leftAt: null } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return planets.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description ?? undefined,
      iconUrl: p.iconUrl ?? undefined,
      isDefault: p.isDefault,
      memberCount: p._count.memberships,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  /**
   * Returns a single planet by ID with active member count.
   */
  async getPlanet(planetId: string): Promise<PlanetResponse> {
    const planet = await this.prisma.db.planet.findUnique({
      where: { id: planetId },
      include: {
        _count: {
          select: { memberships: { where: { leftAt: null } } },
        },
      },
    });

    if (!planet) {
      throw new NotFoundException('Planet not found');
    }

    return {
      id: planet.id,
      name: planet.name,
      slug: planet.slug,
      description: planet.description ?? undefined,
      iconUrl: planet.iconUrl ?? undefined,
      isDefault: planet.isDefault,
      memberCount: planet._count.memberships,
      createdAt: planet.createdAt.toISOString(),
    };
  }

  /**
   * Joins a planet.
   * - Active membership → 409 Conflict
   * - Previous membership (leftAt set) → Rejoin per D15: clear leftAt, reset role=MEMBER, set joinedAt=now
   * - No membership → create new row with role=MEMBER
   */
  async join(planetId: string, userId: string): Promise<PlanetMembershipResponse> {
    const planet = await this.prisma.db.planet.findUnique({
      where: { id: planetId },
      select: { id: true },
    });
    if (!planet) {
      throw new NotFoundException('Planet not found');
    }

    const existing = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId, userId } },
    });

    const now = new Date();

    if (existing) {
      if (existing.leftAt === null) {
        // Already an active member
        throw new ConflictException('Already a member of this planet');
      }

      // Rejoin (D15): reactivate existing row
      const updated = await this.prisma.db.planetMembership.update({
        where: { planetId_userId: { planetId, userId } },
        data: {
          leftAt: null,
          role: 'MEMBER',
          joinedAt: now,
        },
      });

      return {
        planetId: updated.planetId,
        userId: updated.userId,
        role: updated.role as PlanetMembershipResponse['role'],
        joinedAt: updated.joinedAt.toISOString(),
        leftAt: null,
      };
    }

    // New membership
    const created = await this.prisma.db.planetMembership.create({
      data: {
        planetId,
        userId,
        role: 'MEMBER',
        joinedAt: now,
      },
    });

    return {
      planetId: created.planetId,
      userId: created.userId,
      role: created.role as PlanetMembershipResponse['role'],
      joinedAt: created.joinedAt.toISOString(),
      leftAt: null,
    };
  }

  /**
   * Leaves a planet.
   * Sets leftAt to now. Idempotency: if already left, returns 404.
   * The membership row is retained for audit (D15).
   */
  async leave(planetId: string, userId: string): Promise<{ left: boolean }> {
    const existing = await this.prisma.db.planetMembership.findUnique({
      where: { planetId_userId: { planetId, userId } },
    });

    if (!existing || existing.leftAt !== null) {
      throw new NotFoundException('Active membership not found');
    }

    await this.prisma.db.planetMembership.update({
      where: { planetId_userId: { planetId, userId } },
      data: { leftAt: new Date() },
    });

    return { left: true };
  }
}
