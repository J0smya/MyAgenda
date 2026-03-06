export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import bcrypt from "bcryptjs";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();

    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      return Response.json({
        success: false,
        message: "Todos los campos son obligatorios"
      }, { status: 400 });
    }

    const result = await pool.query(
      "SELECT * FROM usuario WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return Response.json({
        success: false,
        message: "Correo no registrado"
      }, { status: 400 });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.contrasena);

    if (!match) {
      return Response.json({
        success: false,
        message: "Contraseña incorrecta"
      }, { status: 401 });
    }

    // Aquí van las cookies
    return Response.json({
      success: true
    });

  } catch (error) {
    console.error("ERROR LOGIN:", error);
    return Response.json({
      success: false,
      message: "Error interno del servidor"
    }, { status: 500 });
  }
};