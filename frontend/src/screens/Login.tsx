import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IronMindMascot } from "../components/Mascot";

interface LoginProps {
  onAuth: (athleteId: string) => void;
}

export default function Login({ onAuth }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const trimmedEmail = email.toLowerCase().trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = (await res.json()) as {
        token?: string;
        athleteId?: string;
        error?: string;
      };

      if (!res.ok || !data.token || !data.athleteId) {
        setError(
          res.status === 401
            ? "Wrong password or email not found"
            : (data.error ?? "Couldn't sign in — try again")
        );
        setIsLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("athleteId", data.athleteId);
      await onAuth(data.athleteId);
    } catch {
      setError("Something went wrong — try again");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-background bg-grid">

      {/* Back */}
      <div className="px-6 pt-10">
        <button
          className="flex items-center gap-1.5 text-silver text-sm font-medium"
          onClick={() => navigate("/")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-10">

        {/* Mascot + header */}
        <div className="flex flex-col items-center mb-10 gap-4">
          <IronMindMascot width={72} />
          <div className="text-center">
            <p className="text-blue-light text-xs font-bold tracking-[0.3em] uppercase mb-2">
              IronMind
            </p>
            <h1 className="text-3xl font-black text-primary tracking-tight">
              Welcome back.
            </h1>
            <p className="text-silver text-sm mt-1 font-medium">
              Sign in to continue your training.
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3 mb-4">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="w-full px-4 py-3.5 bg-surface-2 border border-border rounded-xl text-primary placeholder:text-muted text-base outline-none focus:border-blue transition-colors font-medium"
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            className="w-full px-4 py-3.5 bg-surface-2 border border-border rounded-xl text-primary placeholder:text-muted text-base outline-none focus:border-blue transition-colors font-medium"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm font-semibold mb-4 px-1">{error}</p>
        )}

        <button
          className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-blue-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          style={{
            background: isLoading
              ? "#1a2744"
              : "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)",
          }}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-silver text-sm text-center mt-8 font-medium">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-blue-light underline underline-offset-2 font-semibold"
          >
            Get started free
          </Link>
        </p>
      </div>
    </div>
  );
}
