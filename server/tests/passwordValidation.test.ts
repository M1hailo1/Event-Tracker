import { loginPasswordSchema, registrationPasswordSchema } from "../src/utils/passwordValidation";

it("requires eight characters for new registrations", () => {
  expect(registrationPasswordSchema.safeParse("Valid12").success).toBe(false);
  expect(registrationPasswordSchema.safeParse("Valid123").success).toBe(true);
});

it.each(["a".repeat(72), "é".repeat(36), "😀".repeat(18)])("accepts passwords at the UTF-8 byte boundary", password => {
  expect(Buffer.byteLength(password, "utf8")).toBe(72);
  expect(registrationPasswordSchema.safeParse(password).success).toBe(true);
});

it.each(["a".repeat(73), "é".repeat(37), "😀".repeat(19)])("rejects oversized passwords for registration and login", password => {
  expect(registrationPasswordSchema.safeParse(password).success).toBe(false);
  expect(loginPasswordSchema.safeParse(password).success).toBe(false);
});

it("counts characters rather than UTF-16 units and preserves existing short-password logins", () => {
  expect(registrationPasswordSchema.safeParse("😀".repeat(6)).success).toBe(false);
  expect(registrationPasswordSchema.safeParse("short1").success).toBe(false);
  expect(loginPasswordSchema.safeParse("short1").success).toBe(true);
  expect(loginPasswordSchema.safeParse("").success).toBe(false);
});
