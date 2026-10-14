import { createHash, timingSafeEqual } from "crypto";

function sha(s: string) {
  return createHash("sha256").update(s).digest();
}

export function safeEqual(a: string, b: string) {
  return timingSafeEqual(sha(a), sha(b));
}

export function sessionValue() {
  return sha(`${process.env.DASHBOARD_PASSWORD}:${process.env.API_TOKEN}`).toString("hex");
}

export function hasValidToken(req: Request) {
  const token = process.env.API_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${token}`);
}
