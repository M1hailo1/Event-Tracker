import "dotenv/config";
import express from "express";
import prisma from "./prisma";

const app = express();
const PORT = 3000;

app.get("/", async (req, res) => {
  const userCount = await prisma.user.count();
  res.send(`user number je: ${userCount}`);
});

app.listen(PORT, () => console.log("Srvr runnuje na portu", PORT));
