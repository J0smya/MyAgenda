export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import bcrypt from "bcryptjs";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString().trim();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!name || !email || !password) {
      return new Response("Campos vacíos", { status: 400 });
    }

    const userExist = await pool.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );

    if (userExist.rows.length > 0) {
      return new Response("Correo ya registrado", { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO usuario (nombre, email, contrasena) VALUES ($1, $2, $3)",
      [name, email, hashedPassword]
    );

    return Response.redirect(new URL("/login", request.url));

  } catch (error: any) {
    console.error("🔥 ERROR COMPLETO:");
    console.error(error);
    console.error("Mensaje:", error.message);
    console.error("Detalle:", error.detail);
    console.error("Código:", error.code);

    return new Response("Error interno", { status: 500 });
  }
};