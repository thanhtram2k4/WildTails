import { Controller, Get, Post, Param } from '@nestjs/common';
import type { Principal } from '@wildtails/contracts';
import { PlanetService } from './planet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('planets')
export class PlanetController {
  constructor(private readonly planetService: PlanetService) {}

  /**
   * GET /planets
   * Returns all planets with active member counts.
   * Authentication required (global guard) — no @Public().
   */
  @Get()
  async listPlanets() {
    const data = await this.planetService.listPlanets();
    return { success: true, data };
  }

  /**
   * GET /planets/:id
   * Returns a single planet by ID.
   */
  @Get(':id')
  async getPlanet(@Param('id') id: string) {
    const data = await this.planetService.getPlanet(id);
    return { success: true, data };
  }

  /**
   * POST /planets/:id/join
   * Joins the planet as MEMBER.
   * If the user previously left (D15), reactivates the existing membership row.
   * The user's planetId is derived from the URL param — not from the request body.
   */
  @Post(':id/join')
  async join(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.planetService.join(id, user.userId);
    return { success: true, data };
  }

  /**
   * POST /planets/:id/leave
   * Leaves the planet by setting leftAt. Returns 404 if not an active member.
   */
  @Post(':id/leave')
  async leave(@Param('id') id: string, @CurrentUser() user: Principal) {
    const data = await this.planetService.leave(id, user.userId);
    return { success: true, data };
  }
}
