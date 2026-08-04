import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient } from '@wildtails/database';
import type { PrismaClient } from '@wildtails/database';

/**
 * Wraps the adapter-configured PrismaClient using composition.
 * Services access `prisma.db` — never instantiate their own client.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly db: PrismaClient = createPrismaClient();

  async onModuleInit(): Promise<void> {
    await this.db.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.$disconnect();
  }
}
