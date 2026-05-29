export const prerender = false;

import type { APIRoute } from "astro";
import { eliminarSesion, obtenerTokenDeCookie, cookieCerrarSesion } from "../../../lib/sesion";

export const GET: APIRoute = async ({ request, redirect }) => {
  const token = obtenerTokenDeCookie(request.headers.get("cookie"));

  if (token) {
    await eliminarSesion(token);
  }

  const response = redirect("/login");
  response.headers.append("Set-Cookie", cookieCerrarSesion());
  return response;
};