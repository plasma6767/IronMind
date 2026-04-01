import { hashPassword, verifyPassword, generateToken } from "../lib/auth";

interface AuthRecord {
  email: string;
  passwordHash: string;
  salt: string;
  athleteId: string;
}

interface SessionRecord {
  athleteId: string;
  createdAt: string;
}

async function emailToAthleteId(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const encoded = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return ("athlete-" + hex).slice(0, 32);
}

export class AuthObject {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/signup") {
      return this.handleSignup(request);
    }

    if (request.method === "POST" && url.pathname === "/login") {
      return this.handleLogin(request);
    }

    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleSignup(request: Request): Promise<Response> {
    let body: { email: string; password: string };
    try {
      body = (await request.json()) as { email: string; password: string };
    } catch {
      return this.jsonError("invalid JSON body", 400);
    }

    const { email, password } = body;
    if (!email || !password) {
      return this.jsonError("email and password required", 400);
    }

    const storageKey = `auth:${email.toLowerCase().trim()}`;
    const existing = await this.state.storage.get<AuthRecord>(storageKey);

    if (existing) {
      return this.jsonError("email already registered", 409);
    }

    const athleteId = await emailToAthleteId(email);
    const { hash, salt } = await hashPassword(password);

    const authRecord: AuthRecord = {
      email: email.toLowerCase().trim(),
      passwordHash: hash,
      salt,
      athleteId,
    };

    const token = generateToken();
    const sessionRecord: SessionRecord = {
      athleteId,
      createdAt: new Date().toISOString(),
    };

    await this.state.storage.put(storageKey, authRecord);
    await this.state.storage.put(`session:${token}`, sessionRecord);

    return this.jsonOk({ token, athleteId });
  }

  private async handleLogin(request: Request): Promise<Response> {
    let body: { email: string; password: string };
    try {
      body = (await request.json()) as { email: string; password: string };
    } catch {
      return this.jsonError("invalid JSON body", 400);
    }

    const { email, password } = body;
    if (!email || !password) {
      return this.jsonError("email and password required", 400);
    }

    const storageKey = `auth:${email.toLowerCase().trim()}`;
    const record = await this.state.storage.get<AuthRecord>(storageKey);

    if (!record) {
      return this.jsonError("invalid email or password", 401);
    }

    const valid = await verifyPassword(password, record.passwordHash, record.salt);
    if (!valid) {
      return this.jsonError("invalid email or password", 401);
    }

    const token = generateToken();
    const sessionRecord: SessionRecord = {
      athleteId: record.athleteId,
      createdAt: new Date().toISOString(),
    };

    await this.state.storage.put(`session:${token}`, sessionRecord);

    return this.jsonOk({ token, athleteId: record.athleteId });
  }

  private jsonOk(data: unknown): Response {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
