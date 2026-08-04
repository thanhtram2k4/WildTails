import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { IdentityModule } from './identity/identity.module';
import { PlanetModule } from './planet/planet.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    IdentityModule,
    PlanetModule,
  ],
  controllers: [HealthController],
  providers: [
    /**
     * Global default-deny auth — every route requires a valid JWT unless
     * decorated with @Public().
     */
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    /**
     * Platform-level role enforcement — checked after JWT validation.
     * Routes without @Roles() are permitted for any authenticated user.
     */
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
