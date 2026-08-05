import { describe, it, expect } from 'vitest';
import { PublicUserProfileResponseSchema, UserProfileResponseSchema } from './identity/user.js';
import { CreateAiJobRequestSchema } from './ai/ai-job.js';
import {
  CreateJournalRequestSchema,
  JOURNAL_BODY_MAX_LENGTH,
  JOURNAL_MAX_TAGS,
} from './knowledge/journal.js';
import { CreateTagRequestSchema, TagResponseSchema } from './knowledge/tag.js';
import { LogoutRequestSchema } from './auth/tokens.js';
import { PlanetMembershipResponseSchema } from './planet/membership.js';

describe('PublicUserProfileResponse', () => {
  it('does not expose email', () => {
    const result = PublicUserProfileResponseSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      displayName: 'Test User',
      joinedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);

    // Verify the schema shape has no email key
    const shape = PublicUserProfileResponseSchema.shape;
    expect('email' in shape).toBe(false);
  });

  it('UserProfileResponse includes email for /users/me', () => {
    const result = UserProfileResponseSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      displayName: 'Test User',
      joinedAt: '2026-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

describe('CreateAiJobRequest', () => {
  it('rejects empty body (neither sourceUrl nor manualTranscript)', () => {
    const result = CreateAiJobRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects both sourceUrl and manualTranscript', () => {
    const result = CreateAiJobRequestSchema.safeParse({
      sourceUrl: 'https://example.com/video',
      manualTranscript: 'Some transcript text',
    });
    expect(result.success).toBe(false);
  });

  it('accepts sourceUrl only', () => {
    const result = CreateAiJobRequestSchema.safeParse({
      sourceUrl: 'https://example.com/video',
    });
    expect(result.success).toBe(true);
  });

  it('accepts manualTranscript only', () => {
    const result = CreateAiJobRequestSchema.safeParse({
      manualTranscript: 'Some transcript text',
    });
    expect(result.success).toBe(true);
  });

  it('accepts sourceUrl with optional promptVersion', () => {
    const result = CreateAiJobRequestSchema.safeParse({
      sourceUrl: 'https://example.com/video',
      promptVersion: 'v1.0',
    });
    expect(result.success).toBe(true);
  });
});

describe('CreateJournalRequest', () => {
  it('defaults visibility to PRIVATE', () => {
    const result = CreateJournalRequestSchema.parse({
      title: 'My Journal',
    });
    expect(result.visibility).toBe('PRIVATE');
  });

  it('allows explicit visibility override', () => {
    const result = CreateJournalRequestSchema.parse({
      title: 'My Journal',
      visibility: 'PUBLIC',
    });
    expect(result.visibility).toBe('PUBLIC');
  });
});

describe('LogoutRequest', () => {
  it('requires refreshToken', () => {
    const result = LogoutRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts valid refreshToken', () => {
    const result = LogoutRequestSchema.safeParse({
      refreshToken: 'example-placeholder-token',
    });
    expect(result.success).toBe(true);
  });
});

describe('PlanetMembershipResponse', () => {
  it('includes leftAt as nullable for rejoin lifecycle', () => {
    const activeMember = PlanetMembershipResponseSchema.safeParse({
      planetId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '660e8400-e29b-41d4-a716-446655440001',
      role: 'MEMBER',
      joinedAt: '2026-01-01T00:00:00Z',
      leftAt: null,
    });
    expect(activeMember.success).toBe(true);

    const leftMember = PlanetMembershipResponseSchema.safeParse({
      planetId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '660e8400-e29b-41d4-a716-446655440001',
      role: 'MEMBER',
      joinedAt: '2026-01-01T00:00:00Z',
      leftAt: '2026-06-01T00:00:00Z',
    });
    expect(leftMember.success).toBe(true);
  });

  it('rejects membership without leftAt field', () => {
    const result = PlanetMembershipResponseSchema.safeParse({
      planetId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '660e8400-e29b-41d4-a716-446655440001',
      role: 'MEMBER',
      joinedAt: '2026-01-01T00:00:00Z',
      // leftAt omitted — should fail since it's required (nullable, not optional)
    });
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 04 — Tag contracts
// ═══════════════════════════════════════════════════════════════════════════
describe('CreateTagRequest', () => {
  it('accepts valid tag name', () => {
    const result = CreateTagRequestSchema.safeParse({ name: 'study notes' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = CreateTagRequestSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 50 characters', () => {
    const result = CreateTagRequestSchema.safeParse({ name: 'x'.repeat(51) });
    expect(result.success).toBe(false);
  });
});

describe('TagResponse', () => {
  it('accepts valid tag response', () => {
    const result = TagResponseSchema.safeParse({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'study',
      ownerId: '550e8400-e29b-41d4-a716-446655440001',
    });
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 04 — Journal body and tag limits
// ═══════════════════════════════════════════════════════════════════════════
describe('Journal limits', () => {
  it('exports JOURNAL_BODY_MAX_LENGTH as 50000', () => {
    expect(JOURNAL_BODY_MAX_LENGTH).toBe(50_000);
  });

  it('exports JOURNAL_MAX_TAGS as 20', () => {
    expect(JOURNAL_MAX_TAGS).toBe(20);
  });

  it('rejects body exceeding 50000 characters', () => {
    const result = CreateJournalRequestSchema.safeParse({
      title: 'Test',
      body: 'x'.repeat(50_001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts body at exactly 50000 characters', () => {
    const result = CreateJournalRequestSchema.safeParse({
      title: 'Test',
      body: 'x'.repeat(50_000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects more than 20 tagIds', () => {
    const tagIds = Array.from(
      { length: 21 },
      (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
    );
    const result = CreateJournalRequestSchema.safeParse({
      title: 'Test',
      tagIds,
    });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 20 tagIds', () => {
    const tagIds = Array.from(
      { length: 20 },
      (_, i) => `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
    );
    const result = CreateJournalRequestSchema.safeParse({
      title: 'Test',
      tagIds,
    });
    expect(result.success).toBe(true);
  });
});
