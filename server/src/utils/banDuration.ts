export type BanDuration = "1h" | "1w" | "1m" | "forever";

export const PERMANENT_BAN_DATE = new Date("9999-12-31T00:00:00.000Z");

export function computeBannedUntil(duration: BanDuration): Date {
  const now = new Date();

  switch (duration) {
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "1w":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "1m": {
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth;
    }
    case "forever":
      return PERMANENT_BAN_DATE;
  }
}

export function isCurrentlyBanned(bannedUntil: Date | null): boolean {
  return !!bannedUntil && bannedUntil.getTime() > Date.now();
}

export function isPermanentBan(bannedUntil: Date | null): boolean {
  return !!bannedUntil && bannedUntil.getFullYear() >= 9999;
}

export function formatBanMessage(bannedUntil: Date | null): string {
  if (isPermanentBan(bannedUntil)) {
    return "Your account has been permanently banned";
  }
  return `Your account has been banned until ${bannedUntil!.toLocaleString()}`;
}
