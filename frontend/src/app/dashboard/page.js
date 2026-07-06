"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COLORS = ["#1e3a5f", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function DashboardPage() {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
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
      .catch(() => setLoading(false));
  }, [token, authLoading, router]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!token) return null;

  // Chart data
  const monthlyData = {};
  const contingencyCounts = {};
  let totalValue = 0;

  extractions.forEach((e) => {
    const month = e.created_at?.slice(0, 7) || "unknown";
    monthlyData[month] = (monthlyData[month] || 0) + 1;
    if (e.result?.financial_terms?.purchase_price) {
      totalValue += Number(e.result.financial_terms.purchase_price);
    }
    (e.result?.contingencies || []).forEach((c) => {
      contingencyCounts[c.type] = (contingencyCounts[c.type] || 0) + 1;
    });
  });

  const monthlyChart = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const contingencyChart = Object.entries(contingencyCounts)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-[#1e3a5f] text-lg">DealSheet</Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-blue-600">Extract</Link>
          <Link href="/dashboard" className="text-sm font-semibold text-blue-600">Dashboard</Link>
          <Link href="/history" className="text-sm text-gray-600 hover:text-blue-600">History</Link>
          <span className="text-xs text-gray-400 hidden sm:inline">{user?.email}</span>
          <button onClick={() => { logout(); router.push("/login"); }} className="text-sm text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 rich-shadow">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Extractions</p>
            <p className="text-3xl font-bold text-[#1e3a5f] mt-1">{extractions.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 rich-shadow">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Deal Value</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">${(totalValue / 1000000).toFixed(1)}M</p>
          </div>
          <div className="bg-white rounded-xl p-5 rich-shadow">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Price</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              ${extractions.length ? (totalValue / extractions.length / 1000).toFixed(0) : 0}K
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 rich-shadow">
            <p className="text-xs text-gray-400 uppercase tracking-wider">This Month</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{monthlyChart.length > 0 ? monthlyChart[monthlyChart.length - 1].count : 0}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly extraction volume */}
          <div className="bg-white rounded-xl p-6 rich-shadow">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Extractions Over Time</h2>
            {monthlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyChart}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm text-center py-12">No data yet</p>
            )}
          </div>

          {/* Contingency breakdown */}
          <div className="bg-white rounded-xl p-6 rich-shadow">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Contingency Types</h2>
            {contingencyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={contingencyChart} cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {contingencyChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-sm text-center py-12">No data yet</p>
            )}
          </div>
        </div>

        {/* Recent extractions */}
        <div className="bg-white rounded-xl rich-shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-sm font-semibold text-gray-700">Recent Extractions</h2>
          </div>
          <div className="divide-y">
            {extractions.slice(0, 5).map((e) => (
              <div key={e.id} className="px-6 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{e.filename}</p>
                  <p className="text-xs text-gray-400">{e.result?.property?.street_address || "—"}</p>
                </div>
                <div className="text-right">
                  {e.result?.financial_terms?.purchase_price && (
                    <p className="font-semibold">${Number(e.result.financial_terms.purchase_price).toLocaleString()}</p>
                  )}
                  <p className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {extractions.length === 0 && (
              <p className="px-6 py-8 text-gray-400 text-sm text-center">No extractions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
