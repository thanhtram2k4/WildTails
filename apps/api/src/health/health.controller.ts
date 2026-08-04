import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  /**
   * GET /health
   * Public — must bypass the global JWT guard so load-balancer health checks work
   * without supplying an Authorization header.
   */
  @Public()
  @Get()
  check() {
    return { status: 'ok', service: 'wildtails-api' };
  }
}
