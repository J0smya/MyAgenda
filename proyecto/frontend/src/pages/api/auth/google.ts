export const prerender = false;

import type { APIRoute } from "astro";
import { Google } from "arctic";

const google = new Google(
  import.meta.env.GOOGLE_CLIENT_ID,
  import.meta.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:4321/api/auth/google/callback"
);

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const state        = Math.random().toString(36).slice(2);
  const codeVerifier = Math.random().toString(36).slice(2) +
                       Math.random().toString(36).slice(2);

  cookies.set("google_state", state, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  cookies.set("google_code_verifier", codeVerifier, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 10,
    sameSite: "lax",
  });

  // Sin el objeto {scopes} — se pasan directo como array
  const url = await google.createAuthorizationURL(state, codeVerifier, [
    "email",
    "profile",
  ]);

  return redirect(url.toString());
};