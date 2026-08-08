import "dotenv/config";
import express from "express";
import cors from "cors";
import prisma from "./prisma";
import authRoutes from "./routes/authRoutes";
import eventRoutes from "./routes/eventRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import userRoutes from "./routes/userRoutes";

const app = express();
const PORT = 3000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/categories", categoryRoutes);
app.use("/users", userRoutes);

app.get("/", async (req, res) => {
  const userCount = await prisma.user.count();
  res.send(`User count is: ${userCount}`);
});

app.listen(PORT, () => console.log("Server is running on PORT:", PORT));
