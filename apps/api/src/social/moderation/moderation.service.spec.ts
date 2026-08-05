import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

function makeDb() {
  return {
    planetMembership: {
      findUnique: vi.fn(),
    },
    report: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    post: {
      updateMany: vi.fn(),
    },
    comment: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
}

// Transaction mock that runs the callback with the underlying db
function makeTransactionalDb(innerDb: ReturnType<typeof makeDb>) {
  return {
    ...innerDb,
    $transaction: vi.fn().mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb(innerDb);
    }),
  };
}

function makePrisma(
  db: ReturnType<typeof makeDb> & { $transaction?: ReturnType<typeof vi.fn> },
): PrismaService {
  return { db } as unknown as PrismaService;
}

const PLANET_ID = 'planet-aaaa-aaaa-aaaa-000000000001';
const USER_ID = 'user-aaaa-aaaa-aaaa-000000000001';
const OTHER_PLANET_ID = 'planet-aaaa-aaaa-aaaa-000000000002';
const REPORT_ID = 'report-aaaa-aaaa-aaaa-000000000001';
const POST_ID = 'post-aaaa-aaaa-aaaa-000000000001';
const COMMENT_ID = 'comment-aaa-aaaa-aaaa-000000000001';
const NOW = new Date('2025-06-01T12:00:00Z');

const moderatorMembership = { role: 'MODERATOR', leftAt: null };
const memberMembership = { role: 'MEMBER', leftAt: null };
const formerMembership = { role: 'MODERATOR', leftAt: new Date('2025-05-01') };

const baseReport = {
  id: REPORT_ID,
  targetType: 'POST',
  targetId: POST_ID,
  reason: 'Spam',
  status: 'PENDING',
  planetId: PLANET_ID,
  createdAt: NOW,
};

// ---------------------------------------------------------------------------
// ModerationService.listPlanetReports
// ---------------------------------------------------------------------------

describe('ModerationService.listPlanetReports', () => {
  let db: ReturnType<typeof makeDb>;
  let service: ModerationService;

  beforeEach(() => {
    db = makeDb();
    service = new ModerationService(makePrisma(db));
  });

  it('returns reports list for planet moderator', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    db.report.findMany.mockResolvedValue([baseReport]);

    const result = await service.listPlanetReports(PLANET_ID, USER_ID, 'USER');

    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.id).toBe(REPORT_ID);
  });

  it('returns reports for platform ADMIN without membership check', async () => {
    // Platform ADMIN should NOT call planetMembership lookup
    db.report.findMany.mockResolvedValue([baseReport]);

    const result = await service.listPlanetReports(PLANET_ID, USER_ID, 'ADMIN');

    expect(result.data).toHaveLength(1);
    // Membership should NOT have been queried
    expect(db.planetMembership.findUnique).not.toHaveBeenCalled();
  });

  it('rejects listing for non-moderator MEMBER', async () => {
    db.planetMembership.findUnique.mockResolvedValue(memberMembership);

    await expect(service.listPlanetReports(PLANET_ID, USER_ID, 'USER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects listing for former moderator (leftAt is set)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(formerMembership);

    await expect(service.listPlanetReports(PLANET_ID, USER_ID, 'USER')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects listing for moderator of different planet', async () => {
    // User is moderator of PLANET_ID but tries to access OTHER_PLANET_ID reports
    db.planetMembership.findUnique.mockResolvedValue(null);

    await expect(
      service.listPlanetReports(OTHER_PLANET_ID, USER_ID, 'USER'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// ModerationService.reviewReport
// ---------------------------------------------------------------------------

describe('ModerationService.reviewReport — DISMISSED', () => {
  let innerDb: ReturnType<typeof makeDb>;
  let db: ReturnType<typeof makeDb> & { $transaction: ReturnType<typeof vi.fn> };
  let service: ModerationService;

  beforeEach(() => {
    innerDb = makeDb();
    db = makeTransactionalDb(innerDb);
    service = new ModerationService(makePrisma(db));
  });

  it('dismisses a PENDING report as moderator', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    innerDb.report.findUnique.mockResolvedValue(baseReport);
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({ ...baseReport, status: 'DISMISSED' });
    innerDb.auditLog.create.mockResolvedValue({});

    const result = await service.reviewReport(REPORT_ID, USER_ID, 'USER', { status: 'DISMISSED' });

    expect(result.status).toBe('DISMISSED');
    expect(innerDb.report.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: REPORT_ID, status: 'PENDING' },
        data: expect.objectContaining({ status: 'DISMISSED' }),
      }),
    );
  });
});

describe('ModerationService.reviewReport — ACTIONED (hides content)', () => {
  let innerDb: ReturnType<typeof makeDb>;
  let db: ReturnType<typeof makeDb> & { $transaction: ReturnType<typeof vi.fn> };
  let service: ModerationService;

  beforeEach(() => {
    innerDb = makeDb();
    db = makeTransactionalDb(innerDb);
    service = new ModerationService(makePrisma(db));
  });

  it('hides a POST when report is ACTIONED', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    innerDb.report.findUnique.mockResolvedValue({
      ...baseReport,
      targetType: 'POST',
      targetId: POST_ID,
    });
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.post.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({ ...baseReport, status: 'ACTIONED' });
    innerDb.auditLog.create.mockResolvedValue({});

    await service.reviewReport(REPORT_ID, USER_ID, 'USER', {
      status: 'ACTIONED',
      note: 'Confirmed spam',
    });

    expect(innerDb.post.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: POST_ID },
        data: expect.objectContaining({
          moderatedAt: expect.any(Date),
          moderatedById: USER_ID,
        }),
      }),
    );
  });

  it('hides a COMMENT when report is ACTIONED', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    innerDb.report.findUnique.mockResolvedValue({
      ...baseReport,
      targetType: 'COMMENT',
      targetId: COMMENT_ID,
    });
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.comment.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({ ...baseReport, status: 'ACTIONED' });
    innerDb.auditLog.create.mockResolvedValue({});

    await service.reviewReport(REPORT_ID, USER_ID, 'USER', { status: 'ACTIONED' });

    expect(innerDb.comment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COMMENT_ID },
        data: expect.objectContaining({ moderatedAt: expect.any(Date) }),
      }),
    );
  });

  it('creates an AuditLog entry during ACTIONED review', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    innerDb.report.findUnique.mockResolvedValue(baseReport);
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.post.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({ ...baseReport, status: 'ACTIONED' });
    innerDb.auditLog.create.mockResolvedValue({});

    await service.reviewReport(REPORT_ID, USER_ID, 'USER', {
      status: 'ACTIONED',
      note: 'Spam confirmed',
    });

    expect(innerDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          action: 'REPORT_ACTIONED',
          targetType: 'Report',
          targetId: REPORT_ID,
        }),
      }),
    );
  });

  it('AuditLog metadata does not contain post body or private content', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    innerDb.report.findUnique.mockResolvedValue(baseReport);
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.post.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({ ...baseReport, status: 'ACTIONED' });
    innerDb.auditLog.create.mockResolvedValue({});

    await service.reviewReport(REPORT_ID, USER_ID, 'USER', { status: 'ACTIONED' });

    const auditCall = innerDb.auditLog.create.mock.calls[0]!;
    const metadata = (auditCall[0] as { data: { metadata: Record<string, unknown> } }).data
      .metadata;

    // Must not include private content
    expect(metadata).not.toHaveProperty('body');
    expect(metadata).not.toHaveProperty('journalBody');
    expect(metadata).not.toHaveProperty('email');
    expect(metadata).not.toHaveProperty('password');
    // Safe metadata is present
    expect(metadata).toHaveProperty('reportTargetType');
    expect(metadata).toHaveProperty('reportTargetId');
  });

  it('is atomic: updateMany + hide + auditLog run in one transaction', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    innerDb.report.findUnique.mockResolvedValue(baseReport);
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.post.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({ ...baseReport, status: 'ACTIONED' });
    innerDb.auditLog.create.mockResolvedValue({});

    await service.reviewReport(REPORT_ID, USER_ID, 'USER', { status: 'ACTIONED' });

    // All three DB writes must have been called (they run inside the transaction callback)
    expect(innerDb.report.updateMany).toHaveBeenCalled();
    expect(innerDb.post.updateMany).toHaveBeenCalled();
    expect(innerDb.auditLog.create).toHaveBeenCalled();
  });
});

describe('ModerationService.reviewReport — already processed', () => {
  let innerDb: ReturnType<typeof makeDb>;
  let db: ReturnType<typeof makeDb> & { $transaction: ReturnType<typeof vi.fn> };
  let service: ModerationService;

  beforeEach(() => {
    innerDb = makeDb();
    db = makeTransactionalDb(innerDb);
    service = new ModerationService(makePrisma(db));
  });

  it('throws 409 ConflictException when updateMany returns count=0 (already processed)', async () => {
    db.planetMembership.findUnique.mockResolvedValue(moderatorMembership);
    innerDb.report.findUnique.mockResolvedValue(baseReport);
    // count=0 means the WHERE id=X AND status='PENDING' matched nothing
    innerDb.report.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.reviewReport(REPORT_ID, USER_ID, 'USER', { status: 'DISMISSED' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ModerationService.reviewReport — authorization', () => {
  let innerDb: ReturnType<typeof makeDb>;
  let db: ReturnType<typeof makeDb> & { $transaction: ReturnType<typeof vi.fn> };
  let service: ModerationService;

  beforeEach(() => {
    innerDb = makeDb();
    db = makeTransactionalDb(innerDb);
    service = new ModerationService(makePrisma(db));
  });

  it('throws 404 when report not found', async () => {
    innerDb.report.findUnique.mockResolvedValue(null);

    await expect(
      service.reviewReport(REPORT_ID, USER_ID, 'USER', { status: 'DISMISSED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires platform ADMIN for USER reports (planetId=null)', async () => {
    innerDb.report.findUnique.mockResolvedValue({
      ...baseReport,
      targetType: 'USER',
      planetId: null,
    });

    // Regular USER role: forbidden
    await expect(
      service.reviewReport(REPORT_ID, USER_ID, 'USER', { status: 'DISMISSED' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('platform ADMIN can review USER reports (planetId=null)', async () => {
    innerDb.report.findUnique.mockResolvedValue({
      ...baseReport,
      targetType: 'USER',
      planetId: null,
    });
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({
      ...baseReport,
      targetType: 'USER',
      planetId: null,
      status: 'DISMISSED',
    });
    innerDb.auditLog.create.mockResolvedValue({});

    const result = await service.reviewReport(REPORT_ID, USER_ID, 'ADMIN', { status: 'DISMISSED' });

    expect(result.status).toBe('DISMISSED');
    // Membership must NOT be queried for USER reports as ADMIN
    expect(db.planetMembership.findUnique).not.toHaveBeenCalled();
  });

  it('platform ADMIN can moderate any planet report', async () => {
    innerDb.report.findUnique.mockResolvedValue(baseReport);
    innerDb.report.updateMany.mockResolvedValue({ count: 1 });
    innerDb.post.updateMany.mockResolvedValue({ count: 1 });
    innerDb.report.findUniqueOrThrow.mockResolvedValue({ ...baseReport, status: 'ACTIONED' });
    innerDb.auditLog.create.mockResolvedValue({});

    await service.reviewReport(REPORT_ID, USER_ID, 'ADMIN', { status: 'ACTIONED' });

    // Should succeed without membership check
    expect(db.planetMembership.findUnique).not.toHaveBeenCalled();
  });
});
