"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      login(data.token, { id: data.user_id, email: data.email });
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              D
            </div>
          </Link>
          <h1>Nice to see you again</h1>
          <p className="subtitle">Got some deals to crunch?</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl mb-5 text-sm animate-fade-in">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-field" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field" placeholder="Enter your password" required />
          </div>
          <button type="submit" disabled={loading}
            className="btn btn-primary btn-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" />
                Signing in...
              </span>
            ) : "Continue →"}
          </button>
        </form>

        <p className="text-sm text-[#8A8272] text-center mt-6">
          New around here?{" "}
          <Link href="/signup" className="text-[#B5652B] hover:text-[#96501F] font-medium hover:underline transition-colors">
            Create your account
          </Link>
        </p>
        <p className="text-xs text-[#A39C8E] text-center mt-3">
          <Link href="/forgot-password" className="hover:text-[#B5652B] transition-colors">Forgot password?</Link>
        </p>

        <hr className="separator" />
        <div className="flex items-center justify-center gap-4 text-xs text-[#A39C8E]">
          <span>🔒 256-bit encrypted</span>
          <span className="w-1 h-1 rounded-full bg-[#E8E4DC]" />
          <span>⚡ AI-powered extraction</span>
        </div>
      </div>
    </div>
  );
}
