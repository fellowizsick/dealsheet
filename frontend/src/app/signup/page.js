"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SignupPage() {
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
      const res = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed");
      login(data.token, { id: data.user_id, email: data.email });
      router.push("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-gradient min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[450px] h-[450px] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[80px]" />

      <div className="glass-card-solid rounded-2xl elevated-shadow w-full max-w-md p-8 lg:p-10 animate-fade-in relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
              D
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Get started</h1>
          <p className="text-gray-500 text-sm mt-1">Create your DealSheet account</p>
        </div>

        {error && (
          <div className="bg-red-50/80 border border-red-200 text-red-700 p-3 rounded-xl mb-6 text-sm flex items-center gap-2 animate-fade-in">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-modern w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white/50 outline-none"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-modern w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white/50 outline-none"
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-400 mt-1.5 ml-1">Must be at least 6 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner !w-4 !h-4 !border-2" />
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            No credit card required • 50 free extractions/month
          </p>
        </div>
      </div>
    </div>
  );
}
