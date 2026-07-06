"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function HistoryPage() {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.push("/login"); return; }

    fetch(`${API}/extractions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setExtractions(data.map((e) => ({ ...e, result: JSON.parse(e.result_json) })));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token, authLoading, router]);

  const toggleRow = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  if (authLoading || loading) return (
    <div className="auth-gradient min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1e3a5f] to-emerald-500 flex items-center justify-center text-white font-bold text-sm">
              D
            </div>
            <span className="font-bold text-[#1e3a5f] text-lg">DealSheet</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="nav-link text-sm text-gray-500 hover:text-gray-900">Extract</Link>
            <Link href="/dashboard" className="nav-link text-sm text-gray-500 hover:text-gray-900">Dashboard</Link>
            <Link href="/history" className="nav-link text-sm font-semibold text-[#1e3a5f] active after:!w-full">History</Link>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <span className="text-xs text-gray-400 hidden sm:inline font-medium">{user?.email}</span>
            <button onClick={() => { logout(); router.push("/login"); }}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f]/10 to-emerald-500/20 flex items-center justify-center">
            <span className="text-lg">📋</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Extraction History</h1>
            <p className="text-sm text-gray-500">All your past document extractions</p>
          </div>
        </div>

        {extractions.length === 0 && (
          <div className="bg-white rounded-2xl elevated-shadow border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-gray-900 font-semibold mb-1">No extractions yet</p>
            <Link href="/" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium hover:underline inline-flex items-center gap-1">
              Extract your first document →
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {extractions.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl elevated-shadow border border-gray-100 overflow-hidden transition-all hover:shadow-lg">
              <button
                onClick={() => toggleRow(e.id)}
                className="w-full text-left px-5 lg:px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f]/5 to-emerald-500/10 flex items-center justify-center shrink-0">
                    <span className="text-lg">📄</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{e.filename}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(e.created_at).toLocaleDateString()} · {new Date(e.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
                <div className="text-left lg:text-right shrink-0 ml-0 lg:ml-4">
                  {e.result?.property?.street_address && (
                    <p className="text-sm text-gray-600 truncate max-w-[280px]">{e.result.property.street_address}</p>
                  )}
                  {e.result?.financial_terms?.purchase_price && (
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">${Number(e.result.financial_terms.purchase_price).toLocaleString()}</p>
                  )}
                </div>
              </button>

              {expanded.has(e.id) && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#1e3a5f] to-emerald-500" />
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Raw Data</span>
                  </div>
                  <pre className="text-xs text-gray-700 overflow-x-auto bg-white rounded-xl p-4 border border-gray-100 leading-relaxed">
                    {JSON.stringify(e.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
