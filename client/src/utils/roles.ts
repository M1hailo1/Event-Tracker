export function isStaff(role: string | undefined): boolean {
  return role === "ADMIN" || role === "MODERATOR";
}
