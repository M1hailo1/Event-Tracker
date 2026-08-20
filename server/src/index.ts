import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./prisma";
import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import userRoutes from "./routes/userRoutes";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import followRoutes from "./routes/followRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import adminRoutes from "./routes/adminRoutes";
import { sendDueEventReminders } from "./utils/eventReminders";

const app = express();
const PORT = process.env.PORT || 3000;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts. Try again later." },
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
});

const allowedOrigins = [
  "http://localhost:5173",
  "https://event-tracker-liard-seven.vercel.app",
];

app.use(cors({ origin: allowedOrigins }));
app.use(helmet());
app.use(express.json());
app.use("/auth", authLimiter, authRoutes);
app.use("/events", eventRoutes);
app.use("/categories", categoryRoutes);
app.use("/users", userRoutes);
app.use("/users", followRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);
app.use(globalLimiter);

app.get("/", async (req, res) => {
  const userCount = await prisma.user.count();
  res.send(`User count is: ${userCount}`);
});

const REMINDER_CHECK_INTERVAL_MS = 15 * 60 * 1000;

app.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);

  sendDueEventReminders().catch((err) =>
    console.error("Event reminder check failed:", err),
  );
  setInterval(() => {
    sendDueEventReminders().catch((err) =>
      console.error("Event reminder check failed:", err),
    );
  }, REMINDER_CHECK_INTERVAL_MS);
});
