import express from "express";
import request from "supertest";
import prisma from "../src/prisma";
import notificationRoutes from "../src/routes/notificationRoutes";

jest.mock("../src/prisma", () => ({
  __esModule: true,
  default: { notification: { updateMany: jest.fn() } },
}));

jest.mock("../src/middleware/authMiddleware", () => ({
  requireAuth: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization !== "Bearer test-token") {
      return res.sendStatus(401);
    }
    req.userId = "current-user";
    next();
  },
}));

const app = express();
app.use("/notifications", notificationRoutes);

describe("Mark event notifications as read", () => {
  beforeEach(() => jest.clearAllMocks());

  it("limits the update to the signed-in user's unread notifications for that event", async () => {
    jest.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 2 });

    const response = await request(app)
      .patch("/notifications/events/event-123/read")
      .set("Authorization", "Bearer test-token");

    expect(response.status).toBe(200);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "current-user", eventId: "event-123", isRead: false },
      data: { isRead: true },
    });
  });

  it("requires authentication before updating notifications", async () => {
    const response = await request(app).patch("/notifications/events/event-123/read");

    expect(response.status).toBe(401);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });
});
