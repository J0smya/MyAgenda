
export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import bcrypt from "bcryptjs";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const name     = formData.get("name")?.toString().trim();
    const email    = formData.get("email")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();
    const telefono = formData.get("telefono")?.toString().trim();

    // ── Validaciones ──
    if (!name || !email || !password || !telefono) {
      return new Response("Por favor completa todos los campos.", { 
        status: 400,
        headers: { "Content-Type": "text/plain" }
      });
    }

    if (password.length < 8) {
      return new Response("La contraseña debe tener al menos 8 caracteres.", { 
        status: 400 
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response("Correo electrónico inválido.", { status: 400 });
    }

    // ── Verificar si el usuario ya existe ──
    const userExist = await pool.query(
      "SELECT id_usuario FROM usuario WHERE email = $1",
      [email]
    );

    if (userExist.rows.length > 0) {
      return new Response("Este correo ya está registrado.", { status: 409 });
    }

    // ── Hashear contraseña ──
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── Insertar usuario ──
    await pool.query(
      `INSERT INTO usuario 
         (nombre, email, contrasena, telefono, fecha_creacion) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [name, email, hashedPassword, telefono]
    );

    console.log(`Usuario registrado: ${email}`);

    return new Response("Usuario creado correctamente", { 
      status: 201,
      headers: { "Content-Type": "text/plain" }
    });

  } catch (error: any) {
    console.error("ERROR AL REGISTRAR USUARIO:");
    console.error("Mensaje:", error.message);
    console.error("Código:", error.code);
    console.error("Detalle:", error.detail);
    console.error("Stack:", error.stack);

    // Mensaje más útil para desarrollo
    return new Response(`Error interno: ${error.message || 'Desconocido'}`, { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
};