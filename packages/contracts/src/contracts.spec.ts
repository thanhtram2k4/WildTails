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
import {
  PostResponseSchema,
  PostAuthorEmbedSchema,
  CreatePostRequestSchema,
} from './social/post.js';
import {
  CreateReportRequestSchema,
  ReportResponseSchema,
  ReviewReportRequestSchema,
} from './social/report.js';
import { SavedPostEntrySchema } from './social/saved-post.js';
import { CreateCommentRequestSchema, CommentResponseSchema } from './social/comment.js';
import { ToggleReactionRequestSchema, ReactionResponseSchema } from './social/reaction.js';

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

// ═══════════════════════════════════════════════════════════════════════════
// Phase 05 — Social contracts
// ═══════════════════════════════════════════════════════════════════════════
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';
const VALID_DATE = '2026-01-01T00:00:00Z';

const validAuthor = {
  id: VALID_UUID,
  displayName: 'Cat Explorer',
  avatarUrl: null,
};

const validPost = {
  id: VALID_UUID,
  body: 'Hello planet!',
  authorId: VALID_UUID,
  author: validAuthor,
  planetId: VALID_UUID_2,
  type: 'ORIGINAL' as const,
  reactionCounts: { LIKE: 3, INSIGHTFUL: 1, SUPPORTIVE: 0, FUNNY: 0 },
  commentCount: 5,
  createdAt: VALID_DATE,
  updatedAt: VALID_DATE,
};

describe('PostResponse (D24, D27)', () => {
  it('accepts valid PostResponse with author embed', () => {
    const result = PostResponseSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it('does not expose journalId (D24)', () => {
    const shape = PostResponseSchema.shape;
    expect('journalId' in shape).toBe(false);
  });

  it('requires author embed (D27)', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { author: _, ...noAuthor } = validPost;
    const result = PostResponseSchema.safeParse(noAuthor);
    expect(result.success).toBe(false);
  });
});

describe('PostAuthorEmbed (D27)', () => {
  it('does not expose email', () => {
    const shape = PostAuthorEmbedSchema.shape;
    expect('email' in shape).toBe(false);
  });

  it('does not expose role', () => {
    const shape = PostAuthorEmbedSchema.shape;
    expect('role' in shape).toBe(false);
  });

  it('does not expose avatarConfig', () => {
    const shape = PostAuthorEmbedSchema.shape;
    expect('avatarConfig' in shape).toBe(false);
  });

  it('allows null avatarUrl', () => {
    const result = PostAuthorEmbedSchema.safeParse({
      id: VALID_UUID,
      displayName: 'Test',
      avatarUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('CreatePostRequest', () => {
  it('rejects empty body', () => {
    const result = CreatePostRequestSchema.safeParse({
      body: '',
      planetId: VALID_UUID,
      type: 'ORIGINAL',
    });
    expect(result.success).toBe(false);
  });

  it('rejects body exceeding 5000 characters', () => {
    const result = CreatePostRequestSchema.safeParse({
      body: 'x'.repeat(5001),
      planetId: VALID_UUID,
      type: 'ORIGINAL',
    });
    expect(result.success).toBe(false);
  });

  it('accepts JOURNAL_SHARE with journalId', () => {
    const result = CreatePostRequestSchema.safeParse({
      body: 'Check out my journal entry!',
      planetId: VALID_UUID,
      type: 'JOURNAL_SHARE',
      journalId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('accepts GOAL_UPDATE with goalId', () => {
    const result = CreatePostRequestSchema.safeParse({
      body: 'Made progress on my goal!',
      planetId: VALID_UUID,
      type: 'GOAL_UPDATE',
      goalId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });
});

describe('CommentRequest/Response', () => {
  it('rejects empty comment body', () => {
    const result = CreateCommentRequestSchema.safeParse({
      body: '',
      postId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('rejects comment body exceeding 2000 characters', () => {
    const result = CreateCommentRequestSchema.safeParse({
      body: 'x'.repeat(2001),
      postId: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });

  it('accepts top-level comment', () => {
    const result = CreateCommentRequestSchema.safeParse({
      body: 'Great post!',
      postId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('accepts reply with parentId', () => {
    const result = CreateCommentRequestSchema.safeParse({
      body: 'I agree!',
      postId: VALID_UUID,
      parentId: VALID_UUID_2,
    });
    expect(result.success).toBe(true);
  });

  it('parses valid CommentResponse with author embed (D33)', () => {
    const result = CommentResponseSchema.safeParse({
      id: VALID_UUID,
      body: 'A comment',
      authorId: VALID_UUID,
      author: validAuthor,
      postId: VALID_UUID_2,
      createdAt: VALID_DATE,
    });
    expect(result.success).toBe(true);
  });

  it('rejects CommentResponse without author embed', () => {
    const result = CommentResponseSchema.safeParse({
      id: VALID_UUID,
      body: 'A comment',
      authorId: VALID_UUID,
      postId: VALID_UUID_2,
      createdAt: VALID_DATE,
    });
    expect(result.success).toBe(false);
  });

  it('CommentResponse author does not expose email', () => {
    const shape = CommentResponseSchema.shape.author.shape;
    expect('email' in shape).toBe(false);
  });
});

describe('Reaction contracts', () => {
  it('accepts valid ToggleReactionRequest', () => {
    const result = ToggleReactionRequestSchema.safeParse({
      postId: VALID_UUID,
      type: 'LIKE',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid reaction type', () => {
    const result = ToggleReactionRequestSchema.safeParse({
      postId: VALID_UUID,
      type: 'LOVE',
    });
    expect(result.success).toBe(false);
  });

  it('parses valid ReactionResponse', () => {
    const result = ReactionResponseSchema.safeParse({
      postId: VALID_UUID,
      counts: { LIKE: 1, INSIGHTFUL: 0, SUPPORTIVE: 0, FUNNY: 0 },
    });
    expect(result.success).toBe(true);
  });

  it('parses ReactionResponse with userReaction', () => {
    const result = ReactionResponseSchema.safeParse({
      postId: VALID_UUID,
      counts: { LIKE: 1, INSIGHTFUL: 0, SUPPORTIVE: 0, FUNNY: 0 },
      userReaction: 'LIKE',
    });
    expect(result.success).toBe(true);
  });
});

describe('ReportResponse (gap-fill)', () => {
  it('parses valid ReportResponse', () => {
    const result = ReportResponseSchema.safeParse({
      id: VALID_UUID,
      targetType: 'POST',
      targetId: VALID_UUID_2,
      reason: 'Spam',
      status: 'PENDING',
      createdAt: VALID_DATE,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid target type', () => {
    const result = CreateReportRequestSchema.safeParse({
      targetType: 'PLANET',
      targetId: VALID_UUID,
      reason: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reason exceeding 100 characters', () => {
    const result = CreateReportRequestSchema.safeParse({
      targetType: 'POST',
      targetId: VALID_UUID,
      reason: 'x'.repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

describe('ReviewReportRequest (D19)', () => {
  it('accepts ACTIONED status', () => {
    const result = ReviewReportRequestSchema.safeParse({
      status: 'ACTIONED',
    });
    expect(result.success).toBe(true);
  });

  it('accepts DISMISSED with note', () => {
    const result = ReviewReportRequestSchema.safeParse({
      status: 'DISMISSED',
      note: 'Not a violation',
    });
    expect(result.success).toBe(true);
  });

  it('rejects PENDING as review status', () => {
    const result = ReviewReportRequestSchema.safeParse({
      status: 'PENDING',
    });
    expect(result.success).toBe(false);
  });

  it('rejects note exceeding 500 characters', () => {
    const result = ReviewReportRequestSchema.safeParse({
      status: 'DISMISSED',
      note: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('SavedPostEntry (gap-fill)', () => {
  it('parses minimal SavedPostEntry', () => {
    const result = SavedPostEntrySchema.safeParse({
      postId: VALID_UUID,
      savedAt: VALID_DATE,
    });
    expect(result.success).toBe(true);
  });

  it('parses SavedPostEntry with embedded post', () => {
    const result = SavedPostEntrySchema.safeParse({
      postId: VALID_UUID,
      savedAt: VALID_DATE,
      post: validPost,
    });
    expect(result.success).toBe(true);
  });
});
