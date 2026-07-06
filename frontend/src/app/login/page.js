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
      {/* Decorative blobs */}
      <div className="auth-blob absolute top-[-12%] left-[-8%] rounded-full bg-[#D98A4D]/10 blur-[120px]" />
      <div className="w-[350px] h-[350px] absolute bottom-[-15%] right-[-8%] rounded-full bg-[#D4A017]/8 blur-[100px]" />
      <div className="w-[200px] h-[200px] absolute top-[40%] right-[15%] rounded-full bg-[#E86A58]/6 blur-[80px] hidden lg:block" />

      {/* Main card */}
      <div className="glass-card-solid rounded-3xl elevated-shadow w-full max-w-md p-6 sm:p-8 lg:p-10 animate-fade-in relative z-10 mx-auto">
        {/* Brand header */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C1810] via-[#B5652B] to-[#D4A017] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#B5652B]/20 logo-glow group-hover:scale-105 transition-transform duration-300">
              D
            </div>
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1C1810] tracking-tight">
            Nice to see you again
          </h1>
          <p className="text-[#8A8272] text-sm mt-1.5">Got some deals to crunch? Let&apos;s go.</p>
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
            <div className="input-wrap rounded-2xl">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern w-full border-2 border-[#E8E4DC] rounded-2xl px-4 py-3.5 text-base bg-white/70 outline-none text-[#1C1810] placeholder:text-[#A39C8E]"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">
              Password
            </label>
            <div className="input-wrap rounded-2xl">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern w-full border-2 border-[#E8E4DC] rounded-2xl px-4 py-3.5 text-base bg-white/70 outline-none text-[#1C1810] placeholder:text-[#A39C8E]"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full text-white py-4 rounded-2xl font-semibold text-sm disabled:opacity-40 min-h-[52px]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner !w-4 !h-4 !border-2" />
                Signing in...
              </span>
            ) : (
              "Let's Go →"
            )}
          </button>
        </form>

        <p className="text-sm text-[#8A8272] text-center mt-6">
          New around here?{" "}
          <Link href="/signup" className="text-[#B5652B] hover:text-[#96501F] font-semibold hover:underline transition-colors">
            Create your account
          </Link>
        </p>

        {/* Trust signals */}
        <div className="mt-8 pt-6 border-t border-[#F0EDE6] space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-[#A39C8E]">
            <span className="flex items-center gap-1">🔒 256-bit encrypted</span>
            <span className="w-1 h-1 rounded-full bg-[#E8E4DC]" />
            <span className="flex items-center gap-1">⚡ AI-powered extraction</span>
          </div>
        </div>
      </div>

      {/* Side panel with value props (hidden on mobile) */}
      <div className="hidden lg:flex flex-col items-start justify-center w-80 ml-12 animate-fade-in-2 relative z-10">
        <div className="glass-card rounded-3xl p-8 text-white">
          <div className="text-4xl mb-4">🏠</div>
          <h3 className="text-xl font-bold mb-2">From PDF to deal data</h3>
          <p className="text-white/70 text-sm leading-relaxed mb-6">
            Stop reading contracts line by line. DealSheet extracts parties, price, dates, and contingencies in seconds.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-lg bg-[#D98A4D]/20 flex items-center justify-center text-xs font-bold">1</span>
              <span className="text-white/80">Upload purchase agreement</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-lg bg-[#D98A4D]/20 flex items-center justify-center text-xs font-bold">2</span>
              <span className="text-white/80">AI extracts key terms</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-lg bg-[#D98A4D]/20 flex items-center justify-center text-xs font-bold">3</span>
              <span className="text-white/80">Export clean data in seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
