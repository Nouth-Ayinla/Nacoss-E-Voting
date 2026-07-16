import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);
const VOTER_SECRET = new TextEncoder().encode(process.env.VOTER_JWT_SECRET!);

export async function createAdminSession(adminId: string) {
  const token = await new SignJWT({ adminId, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(ADMIN_SECRET);

  const cookieStore = await cookies();
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 2,
    path: "/",
  });
}

export async function verifyAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, ADMIN_SECRET);
    return payload as { adminId: string; role: string };
  } catch {
    return null;
  }
}

// Voter session is deliberately short-lived and single-purpose:
// only valid for the vote-casting window, destroyed right after.
export async function createVoterSession(matricNumber: string) {
  const token = await new SignJWT({ matricNumber, role: "voter" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(VOTER_SECRET);

  const cookieStore = await cookies();
  cookieStore.set("voter_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 60 * 15,
    path: "/",
  });
}

export async function verifyVoterSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("voter_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, VOTER_SECRET);
    return payload as { matricNumber: string; role: string };
  } catch {
    return null;
  }
}

export async function destroyVoterSession() {
  const cookieStore = await cookies();
  cookieStore.delete("voter_session");
}
