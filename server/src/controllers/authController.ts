import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import prisma from "../prisma";
import { generateToken } from "../utils/jwt";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export async function register(req: Request, res: Response) {
  const parseResult = registerSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { email, password, name } = parseResult.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return res
      .status(409)
      .json({ error: "A user with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  });

  const token = generateToken(user.id);

  res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const parseResult = loginSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { email, password } = parseResult.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Wrong email/password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: "Wrong email/password" });
  }

  const token = generateToken(user.id);

  res.status(200).json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
  });
}
