import "dotenv/config";
import express from "express";
import prisma from "./prisma";
import authRoutes from "./routes/authRoutes";
import { requireAuth } from "./middleware/authMiddleware";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/auth", authRoutes);

app.get("/", async (req, res) => {
  const userCount = await prisma.user.count();
  res.send(`user number je: ${userCount}`);
});

app.get("/protected-test", requireAuth, (req, res) => {
  res.json({ message: "access workd", userId: req.userId });
});

app.listen(PORT, () => console.log("Srvr runnuje na portu", PORT));
