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
    <div className="auth-gradient min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Noise texture */}
      <div className="noise-overlay absolute inset-0" />

      {/* Decorative blobs */}
      <div className="auth-blob absolute top-[-15%] left-[-10%] rounded-full bg-[#D98A4D]/8 blur-[100px]" />
      <div className="auth-blob absolute bottom-[-20%] right-[-10%] rounded-full bg-[#5C3413]/10 blur-[80px]" />

      <div className="glass-card-solid rounded-3xl elevated-shadow w-full max-w-md p-6 sm:p-8 lg:p-10 animate-fade-in relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-[#B5652B]/20">
              D
            </div>
          </Link>
          <h1 className="text-2xl lg:text-3xl font-semibold text-[#1C1810] tracking-tight">Welcome back</h1>
          <p className="text-[#8A8272] text-sm mt-1.5">Sign in to your DealSheet account</p>
        </div>

        {error && (
          <div className="bg-[#FBEEEC]/80 border border-[#E8C4BC] text-[#9B3A22] p-3.5 rounded-2xl mb-6 text-sm flex items-start gap-3 animate-fade-in">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-modern w-full border border-[#E8E4DC] rounded-2xl px-4 py-3.5 text-base bg-[#FAF9F6]/60 outline-none text-[#1C1810] placeholder:text-[#A39C8E]"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-modern w-full border border-[#E8E4DC] rounded-2xl px-4 py-3.5 text-base bg-[#FAF9F6]/60 outline-none text-[#1C1810] placeholder:text-[#A39C8E]"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full text-white py-3.5 rounded-2xl font-semibold text-sm disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner !w-4 !h-4 !border-2" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="text-sm text-[#8A8272] text-center mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#B5652B] hover:text-[#96501F] font-medium hover:underline">
            Create one
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-[#F0EDE6]">
          <p className="text-xs text-[#A39C8E] text-center">
            Secured with industry-standard encryption
          </p>
        </div>
      </div>
    </div>
  );
}
