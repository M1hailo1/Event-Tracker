import "dotenv/config";
import express from "express";
import prisma from "./prisma";
import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import { requireAuth } from "./middleware/authMiddleware";
import categoryRoutes from "./routes/categoryRoutes";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/categories", categoryRoutes);

app.get("/", async (req, res) => {
  const userCount = await prisma.user.count();
  res.send(`user number je: ${userCount}`);
});

app.listen(PORT, () => console.log("Srvr runnuje na portu", PORT));
