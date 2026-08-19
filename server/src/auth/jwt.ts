import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type SystemRole = "USER" | "ADMIN";

export interface UserTokenPayload {
  userId: string;
  email: string;
  name: string;
  color?: string;
  avatar?: string | null;
  systemRole?: SystemRole;
}

export function signToken(payload: UserTokenPayload, expiresIn: string | number = "7d"): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: expiresIn as any });
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as UserTokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
