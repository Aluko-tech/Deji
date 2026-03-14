"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, DollarSign, Download, RefreshCw } from "lucide-react";
import { toDay, inRange, fmtDate } from "@/lib/dateUtils";
import { getLedgerEntries } from "@/lib/api";

const CATEGORIES = ["all","Sales","POS","Website","Inventory","Operations","Payroll","Marketing","Logistics","Utilities","Rent","Other"];

function safeArray(val) {
  if (Array.isArray(val))           return val;
  if (Array.isArray(val?.data))     return val.data;
  if (Array.isArray(val?.entries))  return val.entries;
  if (Array.isArray(val?.results))  return val.results;
  if (Array.isArray(val?.items))    return val.items;
  return [];
}

export default function LedgerPage() {
  const [entries,    setEntries]    = useState([]);
  const { format, symbol } = useCurrency();
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCat,  setFilterCat]  = useState("all");
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res  = await getLedgerEntries({ limit:500 });
      setEntries(safeArray(res?.data ?? res));
    } catch (e) {
      console.error("Failed to load ledger:", e);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const safeEntries = Array.isArray(entries) ? entries : [];

  const filtered = safeEntries.filter(e => {
    if (filterType !== "all" && e.type !== filterType) return false;
    if (filterCat  !== "all" && e.category !== filterCat) return false;
    if (!inRange(e.date, dateFrom, dateTo)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.description?.toLowerCase().includes(q) &&
        !e.reference?.toLowerCase().includes(q) &&
        !e.category?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  const withBalance = sorted.map(e => {
    running += e.type === "income" ? Number(e.amount) : -Number(e.amount);
    return { ...e, balance: running };
  }).reverse();

  const totalIncome  = safeEntries.filter(e => e.type === "income") .reduce((s,e) => s + Number(e.amount||0), 0);
  const totalExpense = safeEntries.filter(e => e.type === "expense").reduce((s,e) => s + Number(e.amount||0), 0);
  const netBalance   = totalIncome - totalExpense;

  const catBreakdown = safeEntries.reduce((acc, e) => {
    const k = e.category || "General";
    if (!acc[k]) acc[k] = { income:0, expense:0 };
    acc[k][e.type] = (acc[k][e.type] || 0) + Number(e.amount||0);
    return acc;
  }, {});

  const exportCSV = () => {
    const header = ["Date","Description","Reference","Category","Type","Amount","Balance"];
    const rows = withBalance.map(e => [
      toDay(e.date) || "",
      `"${(e.description||"").replace(/"/g,'""')}"`,
      e.reference || "",
      e.category  || "",
      e.type,
      e.amount,
      e.balance,
    ]);
    const csv  = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Ledger</h1>
          <p className="page-subtitle">Complete transaction history with running balance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchEntries} className="btn-secondary flex items-center gap-1.5">
            <RefreshCw size={13}/>
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2">
            <Download size={14}/> Export CSV
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { label:"Total Income",   value:format(totalIncome.toLocaleString()),  icon:<TrendingUp size={18}/>,   color:"#22c55e" },
          { label:"Total Expenses", value:format(totalExpense.toLocaleString()), icon:<TrendingDown size={18}/>, color:"#ef4444" },
          { label:"Net Balance",    value:(netBalance<0?"-":"")+format(Math.abs(netBalance)).toLocaleString(), icon:<DollarSign size={18}/>, color:netBalance>=0?"#22c55e":"#ef4444" },
        ].map(k => (
          <div key={k.label} className="kpi-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{background:k.color+"22", color:k.color}}>
              {k.icon}
            </div>
            <div>
              <p className="text-2xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{k.value}</p>
              <p className="text-xs" style={{color:"var(--text-muted)"}}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CATEGORY BREAKDOWN */}
      {Object.keys(catBreakdown).length > 0 && (
        <div className="deji-card p-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:"var(--text-muted)"}}>Breakdown by Category</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(catBreakdown).map(([cat, vals]) => {
              const net = (vals.income||0) - (vals.expense||0);
              return (
                <div key={cat} className="p-3 rounded-xl cursor-pointer"
                  style={{background:"var(--bg-hover)"}}
                  onClick={() => setFilterCat(cat)}>
                  <p className="text-xs font-semibold mb-1" style={{color:"var(--text-primary)"}}>{cat}</p>
                  {vals.income  > 0 && <p className="text-xs text-green-400">+{format(vals.income)}</p>}
                  {vals.expense > 0 && <p className="text-xs text-red-400">-{format(vals.expense)}</p>}
                  <p className="text-xs font-bold mt-1" style={{color:net>=0?"var(--primary)":"#f87171"}}>
                    {net<0?"-":""}{format(Math.abs(net).toLocaleString())}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search description, reference, category..."
            className="deji-input pl-9"/>
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="deji-input w-auto">
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="deji-input w-auto">
          {CATEGORIES.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="deji-input w-auto"/>
        <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="deji-input w-auto"/>
        {(dateFrom || dateTo || filterType !== "all" || filterCat !== "all" || search) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); setFilterType("all"); setFilterCat("all"); setSearch(""); }}
            className="btn-secondary text-xs py-1.5 px-3">Clear All</button>
        )}
      </div>

      {/* LEDGER TABLE */}
      <div className="deji-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading ledger...</div>
        ) : safeEntries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📒</div>
            <p style={{color:"var(--text-muted)"}}>No transactions yet. Sales, payments and expenses appear here automatically.</p>
          </div>
        ) : withBalance.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <p style={{color:"var(--text-muted)"}}>No transactions match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="deji-table w-full">
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Reference</th>
                  <th>Category</th><th>Type</th><th>Amount</th><th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {withBalance.map((e, idx) => (
                  <tr key={e.id || idx}>
                    <td>
                      <span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>
                        {toDay(e.date) || "—"}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm" style={{color:"var(--text-primary)"}}>{e.description}</p>
                      {e.notes && <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{e.notes}</p>}
                    </td>
                    <td>
                      <span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{e.reference || "—"}</span>
                    </td>
                    <td>
                      <span className="badge badge-blue text-xs">{e.category || "General"}</span>
                    </td>
                    <td>
                      <span className={`badge text-xs ${e.type==="income"?"badge-green":"badge-red"}`}>{e.type}</span>
                    </td>
                    <td>
                      <span className={`text-sm font-bold ${e.type==="income"?"text-green-400":"text-red-400"}`}>
                        {e.type==="income"?"+":"-"}{format(e.amount||0)}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold"
                          style={{color:e.balance>=0?"var(--primary)":"#f87171"}}>
                          {e.balance<0?"-":""}{format(Math.abs(e.balance).toLocaleString())}
                        </span>
                        <div className="w-16 h-1 rounded-full mt-1" style={{background:"var(--border)"}}>
                          <div className="h-full rounded-full"
                            style={{
                              width:Math.min(Math.abs(e.balance)/Math.max(totalIncome,1)*100,100)+"%",
                              background:e.balance>=0?"var(--primary)":"#ef4444",
                            }}/>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                  <td colSpan={5} className="p-3">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>
                      {filtered.length} transactions
                    </span>
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="text-xs text-green-400">+{format(filtered.filter(e=>e.type==="income") .reduce((s,e)=>s+Number(e.amount||0),0).toLocaleString())}</p>
                      <p className="text-xs text-red-400">-{format(filtered.filter(e=>e.type==="expense").reduce((s,e)=>s+Number(e.amount||0),0).toLocaleString())}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-sm font-bold" style={{color:"var(--primary)"}}>
                      {format(Math.abs(withBalance[0]?.balance || 0).toLocaleString())}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
