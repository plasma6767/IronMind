import { useState } from "react";
import { Link } from "react-router-dom";

interface LoginProps {
  onAuth: (athleteId: string) => void;
}

export default function Login({ onAuth }: LoginProps) {
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

      const data = (await res.json()) as { token?: string; athleteId?: string; error?: string };

      if (!res.ok || !data.token || !data.athleteId) {
        setError(res.status === 401 ? "Wrong password or email not found" : (data.error ?? "Couldn't sign in — try again"));
        setIsLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("athleteId", data.athleteId);

      // onAuth fetches the profile and updates appState.
      // Route guards in App.tsx redirect automatically on the next render.
      await onAuth(data.athleteId);
    } catch {
      setError("Something went wrong — try again");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-background px-6 py-10">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-semibold text-primary mb-2">IronMind</h1>
        <p className="text-muted text-base mb-10">
          Sign in to continue your training.
        </p>

        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-primary placeholder:text-muted text-base mb-3 outline-none focus:border-primary"
        />

        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-primary placeholder:text-muted text-base mb-3 outline-none focus:border-primary"
        />

        {error && (
          <p className="text-red-400 text-sm font-medium mb-3 px-1">{error}</p>
        )}

        <button
          className="w-full py-4 bg-primary text-background rounded-xl font-semibold text-base min-h-touch active:opacity-80 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-muted text-sm text-center mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
