export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ redirect }) => {
  return redirect("/api/auth/google");
};
