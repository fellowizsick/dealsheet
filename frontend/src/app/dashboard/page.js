"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const COLORS = ["#1C1810", "#B5652B", "#D98A4D", "#5C3413", "#A39C8E", "#453D30"];

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

  if (authLoading || loading) return (
    <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (!token) return null;

  const monthlyData = {};
  const contingencyCounts = {};
  let totalValue = 0;

  extractions.forEach((e) => {
    const month = e.created_at?.slice(0, 7) || "unknown";
    monthlyData[month] = (monthlyData[month] || 0) + 1;
    if (e.result?.financial_terms?.purchase_price) totalValue += Number(e.result.financial_terms.purchase_price);
    (e.result?.contingencies || []).forEach((c) => contingencyCounts[c.type] = (contingencyCounts[c.type] || 0) + 1);
  });

  const monthlyChart = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count }));
  const contingencyChart = Object.entries(contingencyCounts).map(([name, value]) => ({ name, value }));

  const recent = extractions.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <nav className="bg-white/90 backdrop-blur-md border-b border-[#F0EDE6] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-sm shadow-sm">D</div>
            <span className="font-bold text-[#1C1810] text-lg tracking-tight">DealSheet</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="nav-link text-sm text-[#8A8272] hover:text-[#1C1810]">Extract</Link>
            <Link href="/dashboard" className="nav-link text-sm font-semibold text-[#1C1810] active after:!w-full">Dashboard</Link>
            <Link href="/history" className="nav-link text-sm text-[#8A8272] hover:text-[#1C1810]">History</Link>
            <div className="h-6 w-px bg-[#F0EDE6] mx-1" />
            <span className="text-xs text-[#A39C8E] hidden sm:inline font-medium truncate max-w-[120px]">{user?.email}</span>
            <button onClick={() => { logout(); router.push("/login"); }}
              className="text-sm text-[#A39C8E] hover:text-[#9B3A22] transition-colors font-medium">Logout</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C1810]/10 to-[#B5652B]/20 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1C1810] tracking-tight">Dashboard</h1>
            <p className="text-sm text-[#8A8272]">Your extraction activity at a glance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card rounded-2xl p-5 rich-shadow">
            <p className="text-xs text-[#A39C8E] uppercase tracking-wider font-semibold">Total Extractions</p>
            <p className="text-3xl font-bold text-[#1C1810] mt-2">{extractions.length}</p>
          </div>
          <div className="stat-card rounded-2xl p-5 rich-shadow">
            <p className="text-xs text-[#A39C8E] uppercase tracking-wider font-semibold">Total Deal Value</p>
            <p className="text-3xl font-bold text-[#B5652B] mt-2">${(totalValue / 1000000).toFixed(1)}M</p>
          </div>
          <div className="stat-card rounded-2xl p-5 rich-shadow">
            <p className="text-xs text-[#A39C8E] uppercase tracking-wider font-semibold">Avg Price</p>
            <p className="text-3xl font-bold text-[#1C1810] mt-2">${extractions.length ? (totalValue / extractions.length / 1000).toFixed(0) : 0}K</p>
          </div>
          <div className="stat-card rounded-2xl p-5 rich-shadow">
            <p className="text-xs text-[#A39C8E] uppercase tracking-wider font-semibold">This Month</p>
            <p className="text-3xl font-bold text-[#B5652B] mt-2">{monthlyChart.length > 0 ? monthlyChart[monthlyChart.length - 1].count : 0}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="section-card bg-white rounded-2xl p-6 rich-shadow border border-[#F0EDE6]">
            <h2 className="text-xs font-semibold text-[#453D30] mb-4 uppercase tracking-wider">Extractions Over Time</h2>
            {monthlyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyChart}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#8A8272" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#8A8272" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #F0EDE6", boxShadow: "0 4px 12px rgba(28,20,12,0.08)" }} />
                  <Bar dataKey="count" fill="#B5652B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-[#A39C8E] text-sm text-center py-16">No data yet</p>}
          </div>
          <div className="section-card bg-white rounded-2xl p-6 rich-shadow border border-[#F0EDE6]">
            <h2 className="text-xs font-semibold text-[#453D30] mb-4 uppercase tracking-wider">Contingency Types</h2>
            {contingencyChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={contingencyChart} cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {contingencyChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 16, border: "1px solid #F0EDE6" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-[#A39C8E] text-sm text-center py-16">No data yet</p>}
          </div>
        </div>

        <div className="section-card bg-white rounded-2xl rich-shadow border border-[#F0EDE6] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0EDE6] flex items-center gap-2">
            <span className="text-sm">📋</span>
            <h2 className="text-xs font-semibold text-[#453D30] uppercase tracking-wider">Recent Extractions</h2>
          </div>
          <div className="divide-y divide-[#F0EDE6]">
            {recent.map((e) => (
              <div key={e.id} className="px-6 py-4 flex items-center justify-between text-sm hover:bg-[#FAF9F6] transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-[#1C1810] truncate">{e.filename}</p>
                  <p className="text-xs text-[#A39C8E] mt-0.5">{e.result?.property?.street_address || "—"}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {e.result?.financial_terms?.purchase_price && <p className="font-semibold text-[#1C1810]">${Number(e.result.financial_terms.purchase_price).toLocaleString()}</p>}
                  <p className="text-xs text-[#A39C8E] mt-0.5">{new Date(e.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {extractions.length === 0 && (
              <p className="px-6 py-12 text-[#A39C8E] text-sm text-center">No extractions yet. <Link href="/" className="text-[#B5652B] hover:underline font-medium">Extract your first document →</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
