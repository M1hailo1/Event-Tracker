import { z } from "zod";

export const loginPasswordSchema = z.string().min(1, "Enter your password.")
  .refine(value => Buffer.byteLength(value, "utf8") <= 72, "Password is too long. Try a shorter password.");

export const registrationPasswordSchema = loginPasswordSchema
  .refine(value => Array.from(value).length >= 8, "Use at least 8 characters for your password.");
