import request from "supertest";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import app from "../src/app";
import prisma from "../src/prisma";

const emails: string[] = [];
function email() { const value = `auth-validation-${randomUUID()}@example.test`; emails.push(value); return value; }
afterAll(async () => { await prisma.user.deleteMany({ where: { email: { in: emails } } }); await prisma.$disconnect(); });

it("enforces the byte limit at both HTTP endpoints without truncating", async () => {
  const address = email(), password = "x".repeat(72);
  await request(app).post("/auth/register").send({ name: "Fictional User", email: address, password }).expect(201);
  await request(app).post("/auth/login").send({ email: address, password }).expect(200);
  await request(app).post("/auth/login").send({ email: address, password: password + "different suffix" }).expect(400);
  await request(app).post("/auth/register").send({ name: "Fictional User", email: email(), password: "😀".repeat(19) }).expect(400);
});

it("accepts a multibyte password at exactly 72 bytes", async () => {
  const address = email(), password = "é".repeat(36);
  await request(app).post("/auth/register").send({ name: "Fictional User", email: address, password }).expect(201);
  await request(app).post("/auth/login").send({ email: address, password }).expect(200);
});

it("registers and authenticates an eight-character password", async () => {
  const address = email();
  await request(app).post("/auth/register").send({ name: "Fictional User", email: address, password: "Valid123" }).expect(201);
  await request(app).post("/auth/login").send({ email: address, password: "Valid123" }).expect(200);
});

it("rejects short new passwords without creating an account", async () => {
  const address = email();
  await request(app).post("/auth/register").send({ name: "Fictional User", email: address, password: "short12" }).expect(400);
  expect(await prisma.user.findUnique({ where: { email: address } })).toBeNull();
});

it("continues to authenticate existing shorter passwords", async () => {
  const address = email();
  await prisma.user.create({ data: { name: "Legacy fixture", email: address, password: await bcrypt.hash("short1", 10) } });
  await request(app).post("/auth/login").send({ email: address, password: "short1" }).expect(200);
});
