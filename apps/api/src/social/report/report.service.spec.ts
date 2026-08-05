import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReportService } from './report.service';
import type { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@wildtails/database';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    post: {
      findFirst: vi.fn(),
    },
    comment: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    report: {
      create: vi.fn(),
    },
  };
}

function makePrisma(db: ReturnType<typeof makeDb>): PrismaService {
  return { db } as unknown as PrismaService;
}

const PLANET_ID = 'planet-aaaa-aaaa-aaaa-000000000001';
const USER_ID = 'user-aaaa-aaaa-aaaa-000000000001';
const AUTHOR_ID = 'user-aaaa-aaaa-aaaa-000000000002';
const POST_ID = 'post-aaaa-aaaa-aaaa-000000000001';
const COMMENT_ID = 'comment-aaa-aaaa-aaaa-000000000001';
const REPORT_ID = 'report-aaaa-aaaa-aaaa-000000000001';
const NOW = new Date('2025-06-01T12:00:00Z');

const baseReport = {
  id: REPORT_ID,
  targetType: 'POST',
  targetId: POST_ID,
  reason: 'Spam',
  status: 'PENDING',
  createdAt: NOW,
};

// ---------------------------------------------------------------------------
// ReportService.create
// ---------------------------------------------------------------------------

describe('ReportService.create — POST report', () => {
  let db: ReturnType<typeof makeDb>;
  let service: ReportService;

  beforeEach(() => {
    db = makeDb();
    service = new ReportService(makePrisma(db));
  });

  it('creates a POST report successfully', async () => {
    db.post.findFirst.mockResolvedValue({ id: POST_ID, authorId: AUTHOR_ID, planetId: PLANET_ID });
    db.report.create.mockResolvedValue(baseReport);

    const result = await service.create(USER_ID, {
      targetType: 'POST',
      targetId: POST_ID,
      reason: 'Spam',
    });

    expect(result.id).toBe(REPORT_ID);
    expect(result.status).toBe('PENDING');
  });

  it('derives planetId from post (server-side, not from client)', async () => {
    db.post.findFirst.mockResolvedValue({ id: POST_ID, authorId: AUTHOR_ID, planetId: PLANET_ID });
    db.report.create.mockResolvedValue(baseReport);

    await service.create(USER_ID, {
      targetType: 'POST',
      targetId: POST_ID,
      reason: 'Spam',
    });

    expect(db.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planetId: PLANET_ID }),
      }),
    );
  });

  it('rejects self-report on POST (D32)', async () => {
    db.post.findFirst.mockResolvedValue({ id: POST_ID, authorId: USER_ID, planetId: PLANET_ID });

    await expect(
      service.create(USER_ID, { targetType: 'POST', targetId: POST_ID, reason: 'Bad' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when POST target not found', async () => {
    db.post.findFirst.mockResolvedValue(null);

    await expect(
      service.create(USER_ID, { targetType: 'POST', targetId: POST_ID, reason: 'Spam' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReportService.create — COMMENT report', () => {
  let db: ReturnType<typeof makeDb>;
  let service: ReportService;

  beforeEach(() => {
    db = makeDb();
    service = new ReportService(makePrisma(db));
  });

  it('creates a COMMENT report successfully', async () => {
    db.comment.findFirst.mockResolvedValue({
      id: COMMENT_ID,
      authorId: AUTHOR_ID,
      post: { planetId: PLANET_ID },
    });
    db.report.create.mockResolvedValue({
      ...baseReport,
      targetType: 'COMMENT',
      targetId: COMMENT_ID,
    });

    const result = await service.create(USER_ID, {
      targetType: 'COMMENT',
      targetId: COMMENT_ID,
      reason: 'Harassment',
    });

    expect(result.targetType).toBe('COMMENT');
  });

  it('derives planetId from comment→post (server-side)', async () => {
    db.comment.findFirst.mockResolvedValue({
      id: COMMENT_ID,
      authorId: AUTHOR_ID,
      post: { planetId: PLANET_ID },
    });
    db.report.create.mockResolvedValue({
      ...baseReport,
      targetType: 'COMMENT',
      targetId: COMMENT_ID,
    });

    await service.create(USER_ID, {
      targetType: 'COMMENT',
      targetId: COMMENT_ID,
      reason: 'Harassment',
    });

    expect(db.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planetId: PLANET_ID }),
      }),
    );
  });

  it('rejects self-report on COMMENT (D32)', async () => {
    db.comment.findFirst.mockResolvedValue({
      id: COMMENT_ID,
      authorId: USER_ID,
      post: { planetId: PLANET_ID },
    });

    await expect(
      service.create(USER_ID, { targetType: 'COMMENT', targetId: COMMENT_ID, reason: 'Bad' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when COMMENT target not found', async () => {
    db.comment.findFirst.mockResolvedValue(null);

    await expect(
      service.create(USER_ID, { targetType: 'COMMENT', targetId: COMMENT_ID, reason: 'Spam' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReportService.create — USER report', () => {
  let db: ReturnType<typeof makeDb>;
  let service: ReportService;

  beforeEach(() => {
    db = makeDb();
    service = new ReportService(makePrisma(db));
  });

  it('creates a USER report with null planetId', async () => {
    db.user.findFirst.mockResolvedValue({ id: AUTHOR_ID });
    db.report.create.mockResolvedValue({
      ...baseReport,
      targetType: 'USER',
      targetId: AUTHOR_ID,
    });

    await service.create(USER_ID, {
      targetType: 'USER',
      targetId: AUTHOR_ID,
      reason: 'Impersonation',
    });

    expect(db.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ planetId: null }),
      }),
    );
  });

  it('rejects self-report on USER (D32)', async () => {
    await expect(
      service.create(USER_ID, { targetType: 'USER', targetId: USER_ID, reason: 'Bad' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns 404 when USER target not found or inactive', async () => {
    db.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(USER_ID, { targetType: 'USER', targetId: AUTHOR_ID, reason: 'Spam' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ReportService.create — duplicate prevention', () => {
  let db: ReturnType<typeof makeDb>;
  let service: ReportService;

  beforeEach(() => {
    db = makeDb();
    service = new ReportService(makePrisma(db));
  });

  it('throws 409 ConflictException on duplicate PENDING report (D20)', async () => {
    db.post.findFirst.mockResolvedValue({ id: POST_ID, authorId: AUTHOR_ID, planetId: PLANET_ID });

    const p2002Error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: {},
    });
    db.report.create.mockRejectedValue(p2002Error);

    await expect(
      service.create(USER_ID, { targetType: 'POST', targetId: POST_ID, reason: 'Spam' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
