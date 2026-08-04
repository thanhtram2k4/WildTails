import { createPrismaClient } from '../src/client.js';

const prisma = createPrismaClient();

/**
 * Default planets — stable slugs, approved in Phase 02.
 * Descriptions are temporary product copy pending content approval.
 */
const DEFAULT_PLANETS = [
  {
    slug: 'learning',
    name: 'Learning',
    description: 'Share knowledge, courses, and educational discoveries.',
  },
  {
    slug: 'sports',
    name: 'Sports',
    description: 'Track workouts, games, and athletic achievements.',
  },
  {
    slug: 'finance',
    name: 'Finance',
    description: 'Discuss budgeting, investing, and financial goals.',
  },
  {
    slug: 'work',
    name: 'Work',
    description: 'Reflect on career growth, projects, and professional development.',
  },
  {
    slug: 'travel',
    name: 'Travel',
    description: 'Document trips, destinations, and travel experiences.',
  },
  {
    slug: 'health',
    name: 'Health',
    description: 'Journal about wellness, nutrition, and mental health.',
  },
  { slug: 'pets', name: 'Pets', description: 'Celebrate companions, care tips, and pet stories.' },
  {
    slug: 'art',
    name: 'Art',
    description: 'Explore creativity, projects, and artistic inspiration.',
  },
] as const;

async function main() {
  console.log('Seeding default planets...');

  for (const planet of DEFAULT_PLANETS) {
    await prisma.planet.upsert({
      where: { slug: planet.slug },
      update: {},
      create: {
        name: planet.name,
        slug: planet.slug,
        description: planet.description,
        isDefault: true,
      },
    });
  }

  const count = await prisma.planet.count({ where: { isDefault: true } });
  console.log(`Seed complete. Default planets: ${count}`);

  if (count !== 8) {
    throw new Error(`Expected exactly 8 default planets, found ${count}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
