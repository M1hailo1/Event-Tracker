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

const app = express();

if (process.env.RENDER === "true") app.set("trust proxy", 1);

const isTestEnv = process.env.NODE_ENV === "test";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 100000 : 20,
  message: { error: "Too many attempts. Try again later." },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestEnv ? 100000 : 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const allowedOrigins = [
  "http://localhost:5173",
  "https://event-tracker-liard-seven.vercel.app",
];

app.use(cors({ origin: allowedOrigins }));
app.use(helmet());
app.use(globalLimiter);
app.use(express.json());
app.use("/auth", authLimiter, authRoutes);
app.use("/events", eventRoutes);
app.use("/categories", categoryRoutes);
app.use("/users", userRoutes);
app.use("/users", followRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", adminRoutes);

app.get("/", async (req, res) => {
  const userCount = await prisma.user.count();
  res.send(`User count is: ${userCount}`);
});

export default app;
