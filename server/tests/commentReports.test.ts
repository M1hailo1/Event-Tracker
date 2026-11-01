import { Request, Response } from 'express';
import { reportComment } from '../src/controllers/commentReportController';
import prisma from '../src/prisma';
jest.mock('../src/prisma', () => ({ __esModule: true, default: {
  eventComment: { findFirst: jest.fn() }, commentReport: { updateMany: jest.fn(), upsert: jest.fn() },
} }));
it('reopens only dismissed reports with changed text and clears the review', async () => {
  (prisma.eventComment.findFirst as jest.Mock).mockResolvedValue({ id: 'comment', userId: 'author', body: 'Edited text' });
  const req = { params: { id: 'event', commentId: 'comment' }, userId: 'reporter', body: { reason: 'SPAM', details: 'Changed' } } as unknown as Request;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
  await reportComment(req, res);
  expect(prisma.commentReport.updateMany).toHaveBeenCalledWith({
    where: { commentId: 'comment', reporterId: 'reporter', status: 'DISMISSED', bodySnapshot: { not: 'Edited text' } },
    data: { status: 'OPEN', reason: 'SPAM', details: 'Changed', bodySnapshot: 'Edited text', createdAt: expect.any(Date), reviewedAt: null, reviewedBy: null },
  });
  expect((prisma.commentReport.upsert as jest.Mock).mock.calls[0][0].update).toEqual({});
  expect(res.status).toHaveBeenCalledWith(201);
});
