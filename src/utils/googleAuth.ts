/**
 * Helper utilities for parsing and extracting Google OAuth profile information
 * safely in both Expo Go and web environments.
 */

function decodeBase64(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = input.replace(/=+$/, "");
  let output = "";

  if (str.length % 4 === 1) {
    return "";
  }

  for (
    let bc = 0, bs = 0, buffer, idx = 0;
    (buffer = str.charAt(idx++));
    ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
      ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
      : 0
  ) {
    buffer = chars.indexOf(buffer);
  }

  return output;
}

export function parseGoogleIdToken(idToken: string): {
  email?: string;
  name?: string;
  sub?: string;
  picture?: string;
  email_verified?: boolean;
} | null {
  try {
    if (!idToken || typeof idToken !== "string") return null;
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const raw = typeof atob === "function" ? atob(base64) : decodeBase64(base64);
    try {
      const utf8 = decodeURIComponent(
        raw
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(utf8);
    } catch {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[googleAuth] parseGoogleIdToken warning:", err);
    return null;
  }
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{
  email?: string;
  name?: string;
  id?: string;
  picture?: string;
} | null> {
  try {
    if (!accessToken) return null;
    const res = await fetch("https://www.googleapis.com/userinfo/v2/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("[googleAuth] fetchGoogleUserInfo warning:", e);
  }
  return null;
}

export async function extractGoogleProfile(result: any): Promise<{
  email?: string;
  name?: string;
  sub?: string;
  picture?: string;
  idToken?: string;
} | null> {
  if (!result) return null;

  const idToken =
    result?.params?.id_token ||
    result?.authentication?.idToken ||
    (typeof result === "string" ? result : undefined);

  let profile: any = null;
  if (idToken) {
    profile = parseGoogleIdToken(idToken);
  }

  const accessToken =
    result?.params?.access_token || result?.authentication?.accessToken;

  if ((!profile || !profile.email) && accessToken) {
    const userInfo = await fetchGoogleUserInfo(accessToken);
    if (userInfo && userInfo.email) {
      return {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split("@")[0],
        sub: userInfo.id,
        picture: userInfo.picture,
        idToken,
      };
    }
  }

  if (profile) {
    return {
      email: profile.email,
      name: profile.name || profile.displayName || profile.email?.split("@")[0],
      sub: profile.sub,
      picture: profile.picture,
      idToken,
    };
  }

  return idToken ? { idToken } : null;
}
