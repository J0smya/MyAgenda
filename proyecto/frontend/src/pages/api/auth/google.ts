export const prerender = false;

import type { APIRoute } from "astro";
import { generateCodeVerifier, generateState } from "arctic";
import { getGoogleOAuthClient, isSecureSite } from "../../../lib/google-oauth";

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const google = getGoogleOAuthClient();
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const authorizationUrl = google.createAuthorizationURL(state, codeVerifier, [
      "openid",
      "profile",
      "email",
    ]);

    cookies.set("google_state", state, {
      path: "/",
      httpOnly: true,
      secure: isSecureSite,
      sameSite: "lax",
      maxAge: 60 * 10,
    });

    cookies.set("google_code_verifier", codeVerifier, {
      path: "/",
      httpOnly: true,
      secure: isSecureSite,
      sameSite: "lax",
      maxAge: 60 * 10,
    });

    return redirect(authorizationUrl.toString());
  } catch (error: any) {
    console.error("ERROR GOOGLE LOGIN:", error.message);
    return redirect("/login?error=google_config");
  }
};
