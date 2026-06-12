import { Google } from "arctic";

const DEFAULT_SITE = "https://myagenda-2.onrender.com";

export const siteUrl = (
  process.env.SITE ??
  process.env.PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  import.meta.env.SITE ??
  import.meta.env.PUBLIC_SITE_URL ??
  DEFAULT_SITE
).replace(/\/$/, "");

export const googleCallbackUrl = `${siteUrl}/api/auth/google/callback`;
export const isSecureSite = siteUrl.startsWith("https://");

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? import.meta.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? import.meta.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET");
  }

  return new Google(clientId, clientSecret, googleCallbackUrl);
}
