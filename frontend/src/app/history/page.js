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

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-blue-600 text-lg">DealSheet</Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">Extract</Link>
          <Link href="/history" className="text-sm font-semibold text-blue-600">History</Link>
          <span className="text-xs text-gray-400 hidden sm:inline">{user?.email}</span>
          <button onClick={() => { logout(); router.push("/login"); }} className="text-sm text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 lg:p-8">
        <h1 className="text-2xl font-bold mb-6">Extraction History</h1>

        {extractions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">No extractions yet</p>
            <Link href="/" className="text-blue-600 hover:underline text-sm">Extract your first document →</Link>
          </div>
        )}

        <div className="space-y-3">
          {extractions.map((e) => (
            <div key={e.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <button
                onClick={() => toggleRow(e.id)}
                className="w-full text-left px-4 lg:px-5 py-3 lg:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{e.filename}</p>
                  <p className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString()} {new Date(e.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
                <div className="text-left lg:text-right shrink-0">
                  {e.result?.property?.street_address && (
                    <p className="text-sm text-gray-600 truncate max-w-[250px]">{e.result.property.street_address}</p>
                  )}
                  {e.result?.financial_terms?.purchase_price && (
                    <p className="text-sm font-semibold text-gray-900">${Number(e.result.financial_terms.purchase_price).toLocaleString()}</p>
                  )}
                </div>
              </button>

              {expanded.has(e.id) && (
                <pre className="px-4 lg:px-5 pb-4 text-xs text-gray-700 overflow-x-auto bg-gray-50">
                  {JSON.stringify(e.result, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
