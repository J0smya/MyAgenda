import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SECRET = import.meta.env.JWT_SECRET || "supersecret";

// Encriptar contraseña
export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

// Comparar contraseña
export async function verifyPassword(password: string, hash: string) {
  return await bcrypt.compare(password, hash);
}

// Crear token
export function createToken(userId: string) {
  return jwt.sign({ userId }, SECRET, { expiresIn: "7d" });
}