export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import bcrypt from "bcryptjs";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name     = formData.get("name")?.toString().trim();
    const email    = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const telefono = formData.get("telefono")?.toString().trim();

    // ── Validación ──
    if (!name || !email || !password || !telefono) {
      return new Response("Por favor completa todos los campos.", { status: 400 });
    }

    if (password.length < 8) {
      return new Response("La contraseña debe tener al menos 8 caracteres.", { status: 400 });
    }

    // ── Correo duplicado ──
    const userExist = await pool.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );

    if (userExist.rows.length > 0) {
      return new Response("Este correo ya está registrado.", { status: 409 });
    }

    // ── Insertar ──
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO usuario (nombre, email, contrasena, telefono) VALUES ($1, $2, $3, $4)",
      [name, email, hashedPassword, telefono]
    );

    return new Response("ok", { status: 200 });

  } catch (error: any) {
    console.error("🔥 ERROR:", error.message, error.detail);
    return new Response("Error interno del servidor. Intenta de nuevo.", { status: 500 });
  }
};