"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect } from "react";
import { toDay, inRange, fmtDate } from "@/lib/dateUtils";
import { Plus, Search, X, Trash2, Edit, Eye, CheckCircle, Send, CreditCard, Copy, Check, RefreshCw, ExternalLink, Globe } from "lucide-react";
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, getPayments } from "@/lib/api";
import api from "@/lib/api";

const STATUS_COLORS = {
  draft:"badge-blue", sent:"badge-orange", paid:"badge-green",
  overdue:"badge-red", cancelled:"badge-red", partial:"badge-yellow",
};

const PAYMENT_PROCESSORS = [
  { id:"paystack",    name:"Paystack",     logo:"🟦", color:"#00c3f7", keyPrefix:"pk_",    keyLabel:"Public Key",        desc:"Card, bank transfer & USSD — Nigeria, Ghana, Kenya",   docsUrl:"https://paystack.com/docs",              testUrl:"https://dashboard.paystack.com/#/settings/developer" },
  { id:"flutterwave", name:"Flutterwave",  logo:"🟠", color:"#f5a623", keyPrefix:"FLWPUBK",keyLabel:"Public Key",        desc:"Pan-Africa — 150+ currencies across 34+ countries",    docsUrl:"https://developer.flutterwave.com",      testUrl:"https://app.flutterwave.com/settings/api" },
  { id:"stripe",      name:"Stripe",       logo:"🟣", color:"#635bff", keyPrefix:"pk_",    keyLabel:"Publishable Key",   desc:"Global — international customers in USD/GBP/EUR",      docsUrl:"https://stripe.com/docs",               testUrl:"https://dashboard.stripe.com/apikeys" },
];

const SOURCE_META = {
  pos:     { label:"POS",     color:"#6366f1", bg:"rgba(99,102,241,0.1)"  },
  website: { label:"Website", color:"#3b82f6", bg:"rgba(59,130,246,0.1)"  },
  invoice: { label:"Invoice", color:"#22c55e", bg:"rgba(34,197,94,0.1)"   },
};

const EMPTY_INVOICE = {
  warehouseId:"",
  contactName:"", contactEmail:"", contactPhone:"", dueDate:"",
  items:[{description:"", quantity:1, unitPrice:""}],
  notes:"", discount:"", discountType:"fixed", status:"draft",
};

const EMPTY_EXPENSE = {
  description:"", amount:"", category:"Operations",
  reference:"", date:new Date().toISOString().split("T")[0], notes:"",
};

const EXPENSE_CATEGORIES = ["Operations","Inventory","Payroll","Marketing","Logistics","Utilities","Rent","Other"];

function safeArray(val) {
  if (Array.isArray(val))           return val;
  if (Array.isArray(val?.data))     return val.data;
  if (Array.isArray(val?.invoices)) return val.invoices;
  if (Array.isArray(val?.payments)) return val.payments;
  if (Array.isArray(val?.entries))  return val.entries;
  if (Array.isArray(val?.results))  return val.results;
  if (Array.isArray(val?.items))    return val.items;
  return [];
}

function calcInvoice(inv) {
  const subtotal = (inv.items||[]).reduce((s,i) =>
    s + (Number(i.quantity)||0) * (Number(i.unitPrice)||0), 0);
  const disc = inv.discount
    ? (inv.discountType==="percent" ? subtotal*(Number(inv.discount)/100) : Number(inv.discount))
    : 0;
  return { subtotal, discount:Math.max(0,disc), total:Math.max(0,subtotal-disc) };
}


// ── Receipt Generator ──────────────────────────────────────────────────────────

function generateReceiptHTML(inv, bizSettings) {
  const { subtotal, discount, total } = calcInvoice(inv);
  const tax    = bizSettings?.taxRate ? total * (Number(bizSettings.taxRate)/100) : 0;
  const grand  = total + tax;
  const curr   = bizSettings?.currency || "NGN";
  const { symbol: currSymbol, formatCurrency: fmtCurr } = (() => {
    try { const { CURRENCIES } = require ? {} : {}; } catch(e) {}
    return {};
  })();
  const format = (n) => {
    const num = Number(n||0);
    const sym = curr === "USD" ? "$" : curr === "GBP" ? "£" : curr === "EUR" ? "€" : curr === "GHS" ? "GH₵" : curr === "KES" ? "KSh" : curr === "ZAR" ? "R" : "₦";
    return sym + num.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  };
  const items  = (inv.items||[]).map(i => `
    <tr>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;">${i.description}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;">${format(i.unitPrice)}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${format(i.quantity*i.unitPrice)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${inv.invoiceNumber||inv.id?.slice(-8)?.toUpperCase()}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;font-size:13px;}
    .page{max-width:700px;margin:0 auto;padding:40px;}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;}
    .brand{font-size:28px;font-weight:900;color:#f97316;letter-spacing:-1px;}
    .brand span{color:#1a1a1a;}
    .inv-meta{text-align:right;}
    .inv-meta h2{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:4px;}
    .inv-meta p{color:#666;font-size:12px;}
    .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;}
    .badge-paid{background:#dcfce7;color:#16a34a;}
    .badge-sent{background:#ffedd5;color:#ea580c;}
    .badge-overdue{background:#fee2e2;color:#dc2626;}
    .badge-draft{background:#dbeafe;color:#2563eb;}
    .divider{border:none;border-top:2px solid #f0f0f0;margin:24px 0;}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px;}
    .party-label{font-size:10px;font-weight:700;text-transform:uppercase;color:#999;margin-bottom:6px;letter-spacing:.5px;}
    .party-name{font-size:15px;font-weight:700;color:#1a1a1a;}
    .party-sub{font-size:12px;color:#666;margin-top:2px;}
    table{width:100%;border-collapse:collapse;margin:20px 0;}
    thead tr{background:#f9fafb;}
    thead th{padding:10px 4px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:.5px;}
    thead th:not(:first-child){text-align:right;}
    thead th:nth-child(2){text-align:center;}
    .totals{margin-left:auto;width:260px;}
    .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#666;}
    .totals-total{display:flex;justify-content:space-between;padding:10px 0 0;margin-top:6px;border-top:2px solid #f0f0f0;font-size:18px;font-weight:800;color:#1a1a1a;}
    .totals-total span:last-child{color:#f97316;}
    .notes{margin-top:28px;padding:16px;background:#f9fafb;border-radius:8px;}
    .notes-label{font-size:11px;font-weight:700;text-transform:uppercase;color:#999;margin-bottom:6px;}
    .footer{margin-top:40px;text-align:center;font-size:11px;color:#bbb;border-top:1px solid #f0f0f0;padding-top:20px;}
    .dates{display:flex;gap:32px;margin-bottom:24px;}
    .date-block{display:flex;flex-direction:column;gap:2px;}
    .date-label{font-size:10px;font-weight:700;text-transform:uppercase;color:#999;letter-spacing:.5px;}
    .date-val{font-size:13px;font-weight:600;color:#1a1a1a;}
    @media print{.no-print{display:none!important;}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">${bizSettings?.businessName||"Deji"}<span>.</span></div>
      ${bizSettings?.address ? `<p style="font-size:12px;color:#666;margin-top:4px;">${bizSettings.address}</p>` : ""}
      ${bizSettings?.phone   ? `<p style="font-size:12px;color:#666;">${bizSettings.phone}</p>` : ""}
      ${bizSettings?.email   ? `<p style="font-size:12px;color:#666;">${bizSettings.email}</p>` : ""}
    </div>
    <div class="inv-meta">
      <h2>INVOICE</h2>
      <p style="font-size:16px;font-weight:700;color:#f97316;">${inv.invoiceNumber||"INV-"+inv.id?.slice(-8)?.toUpperCase()}</p>
      <span class="badge badge-${inv.status}">${inv.status?.toUpperCase()}</span>
    </div>
  </div>

  <hr class="divider"/>

  <div class="dates">
    <div class="date-block">
      <span class="date-label">Issue Date</span>
      <span class="date-val">${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) : "—"}</span>
    </div>
    <div class="date-block">
      <span class="date-label">Due Date</span>
      <span class="date-val" style="color:${new Date(inv.dueDate)<new Date()&&inv.status!=="paid"?"#dc2626":"inherit"}">${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) : "—"}</span>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${inv.contactName||"—"}</div>
      ${inv.contactEmail ? `<div class="party-sub">${inv.contactEmail}</div>` : ""}
      ${inv.contactPhone ? `<div class="party-sub">${inv.contactPhone}</div>` : ""}
    </div>
    ${bizSettings?.businessName ? `
    <div>
      <div class="party-label">From</div>
      <div class="party-name">${bizSettings.businessName}</div>
      ${bizSettings.email ? `<div class="party-sub">${bizSettings.email}</div>` : ""}
      ${bizSettings.website ? `<div class="party-sub">${bizSettings.website}</div>` : ""}
    </div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${format(subtotal)}</span></div>
    ${discount > 0 ? `<div class="totals-row"><span>Discount</span><span style="color:#dc2626;">-${format(discount)}</span></div>` : ""}
    ${tax > 0 ? `<div class="totals-row"><span>VAT (${bizSettings.taxRate}%)</span><span>${format(tax)}</span></div>` : ""}
    <div class="totals-total"><span>Total</span><span>${format(grand)}</span></div>
  </div>

  ${inv.notes ? `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <p>${inv.notes}</p>
  </div>` : ""}

  <div class="footer">
    <p>Thank you for your business!</p>
    ${bizSettings?.businessName ? `<p style="margin-top:4px;">${bizSettings.businessName}${bizSettings.website ? " · " + bizSettings.website : ""}</p>` : ""}
    <p style="margin-top:4px;">Generated by Deji Business OS</p>
  </div>
</div>
</body>
</html>`;
}

function downloadReceipt(inv, bizSettings) {
  const html = generateReceiptHTML(inv, bizSettings);
  const blob = new Blob([html], { type:"text/html" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `invoice-${(inv.invoiceNumber||inv.id?.slice(-8)||"receipt").replace(/\//g,"-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function printReceipt(inv, bizSettings) {
  const html = generateReceiptHTML(inv, bizSettings);
  const win  = window.open("", "_blank", "width=800,height=900");
  if (!win) { alert("Please allow pop-ups to print receipts"); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}


function Totals({ inv }) {
  const { subtotal, discount, total } = calcInvoice(inv);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span style={{color:"var(--text-muted)"}}>Subtotal</span>
        <span style={{color:"var(--text-primary)"}}>{format(subtotal.toLocaleString())}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm">
          <span style={{color:"var(--text-muted)"}}>Discount</span>
          <span className="text-red-400">-{format(discount.toLocaleString())}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-base pt-1.5" style={{borderTop:"1px solid var(--border)"}}>
        <span style={{color:"var(--text-primary)"}}>Total</span>
        <span style={{color:"var(--primary)"}}>{format(total.toLocaleString())}</span>
      </div>
    </div>
  );
}

function SourceBadge({ source, channel }) {
  const meta = SOURCE_META[source||channel];
  if (!meta) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold"
      style={{background:meta.bg, color:meta.color}}>
      {(source==="website"||channel==="website") && <Globe size={7}/>}
      {(source==="pos"||channel==="pos") && <CreditCard size={7}/>}
      {meta.label}
    </span>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const { format, symbol } = useCurrency();
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg flex-shrink-0"
      style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}>
      {copied?<><Check size={10} className="text-green-400"/> Copied</>:<><Copy size={10}/> Copy</>}
    </button>
  );
}

export default function FinancePage() {
  const { format, symbol } = useCurrency();
  const [invoices,       setInvoices]       = useState([]);
  const [payments,       setPayments]       = useState([]);
  const [expenses,       setExpenses]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [showModal,      setShowModal]      = useState(false);
  const [showExpenseModal,setShowExpenseModal]=useState(false);
  const [editInv,        setEditInv]        = useState(null);
  const [viewInv,        setViewInv]        = useState(null);
  const [form,           setForm]           = useState(EMPTY_INVOICE);
  const [expenseForm,    setExpenseForm]    = useState(EMPTY_EXPENSE);
  const [saving,         setSaving]         = useState(false);
  const [savingExpense,  setSavingExpense]  = useState(false);
  const [activeTab,      setActiveTab]      = useState("invoices");
  const [expenseSearch,  setExpenseSearch]  = useState("");
  const [expenseCatFilter,setExpenseCatFilter]=useState("all");
  const [warehouses, setWarehouses] = useState([]);
  const [processorSettings,setProcessorSettings]=useState({paystack:"",flutterwave:"",stripe:"",activeProcessor:""});
  const [savingProc,     setSavingProc]     = useState(false);
  const [procSaved,      setProcSaved]      = useState(false);

  useEffect(() => { fetchAll(); fetchProcessorSettings(); }, []);
  useEffect(() => { if (activeTab==="expenses") fetchExpenses(); }, [activeTab]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ir, pr, wr] = await Promise.allSettled([
        getInvoices({ limit:500 }),
        getPayments({ limit:200 }),
        api.get('/warehouses'),
      ]);
      setInvoices(ir.status==="fulfilled" ? safeArray(ir.value?.data ?? ir.value) : []);
      setPayments(pr.status==="fulfilled" ? safeArray(pr.value?.data ?? pr.value) : []);
      setWarehouses(wr.status==="fulfilled" ? safeArray(wr.value?.data) : []);
    } catch(e) { console.error(e); setInvoices([]); setPayments([]); }
    finally { setLoading(false); }
  };

  const fetchExpenses = async () => {
    try {
      const er = await api.get("/ledger?type=expense&limit=500");
      setExpenses(safeArray(er.data));
    } catch(e) { console.error(e); setExpenses([]); }
  };

  const fetchProcessorSettings = async () => {
    try {
      const res = await api.get("/settings");
      const s   = res.data?.settings || res.data || {};
      setProcessorSettings({
        paystack:    s.paystackKey    ||"",
        flutterwave: s.flutterwaveKey ||"",
        stripe:      s.stripeKey      ||"",
        activeProcessor: s.activeProcessor||"",
      });
    } catch {}
  };

  const saveInvoice = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        items:    form.items.map(i => ({...i, quantity:Number(i.quantity), unitPrice:Number(i.unitPrice)})),
        discount: Number(form.discount)||0,
      };
      editInv ? await updateInvoice(editInv.id, payload) : await createInvoice(payload);
      await fetchAll(); setShowModal(false); setEditInv(null); setForm(EMPTY_INVOICE);
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const markStatus = async (id, status) => {
    try { await api.patch(`/invoices/${id}/status`, { status }); fetchAll(); }
    catch { setInvoices(p => p.map(i => i.id===id ? {...i,status} : i)); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    try { await deleteInvoice(id); fetchAll(); } catch(e) { alert(e.message); }
  };

  const openEdit = (inv) => {
    setEditInv(inv);
    setForm({
      contactName:  inv.contactName||"",  contactEmail: inv.contactEmail||"",
      contactPhone: inv.contactPhone||"", dueDate: inv.dueDate?inv.dueDate.split("T")[0]:"",
      items: inv.items?.length
        ? inv.items.map(i => ({description:i.description||"",quantity:i.quantity||1,unitPrice:i.unitPrice||""}))
        : [{description:"",quantity:1,unitPrice:""}],
      notes:inv.notes||"", discount:inv.discount||"",
      discountType:inv.discountType||"fixed", status:inv.status||"draft",
    });
    setShowModal(true);
  };

  const addItem    = () => setForm(p => ({...p, items:[...p.items, {description:"",quantity:1,unitPrice:""}]}));
  const removeItem = (i) => setForm(p => ({...p, items:p.items.filter((_,j) => j!==i)}));
  const updateItem = (i,k,v) => setForm(p => ({...p, items:p.items.map((it,j) => j===i?{...it,[k]:v}:it)}));

  const saveExpense = async (e) => {
    e.preventDefault(); setSavingExpense(true);
    try {
      await api.post("/ledger", {
        description:expenseForm.description, amount:Number(expenseForm.amount),
        category:expenseForm.category,
        reference:expenseForm.reference||`EXP-${Date.now().toString().slice(-6)}`,
        date:new Date(expenseForm.date).toISOString(), type:"expense", notes:expenseForm.notes,
      });
      await fetchExpenses(); setShowExpenseModal(false); setExpenseForm(EMPTY_EXPENSE);
    } catch(err) { alert(err.message); }
    finally { setSavingExpense(false); }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try { await api.delete(`/ledger/${id}`); fetchExpenses(); } catch(e) { alert(e.message); }
  };

  const saveProcessorSettings = async () => {
    setSavingProc(true);
    try {
      await api.patch("/settings", {
        paystackKey:    processorSettings.paystack,
        flutterwaveKey: processorSettings.flutterwave,
        stripeKey:      processorSettings.stripe,
        activeProcessor:processorSettings.activeProcessor,
      });
      const ex = JSON.parse(localStorage.getItem("tenantSettings")||"{}");
      localStorage.setItem("tenantSettings", JSON.stringify({
        ...ex, paystackKey:processorSettings.paystack,
        flutterwaveKey:processorSettings.flutterwave,
        stripeKey:processorSettings.stripe,
        activeProcessor:processorSettings.activeProcessor,
      }));
      setProcSaved(true); setTimeout(()=>setProcSaved(false),3000);
    } catch(e) { alert(e.message); }
    finally { setSavingProc(false); }
  };

  const getPayLink = (inv) =>
    (typeof window!=="undefined"?window.location.origin:"")+`/pay/${inv.id}`;

  const getStatusKey = (inv) =>
    (inv.status==="sent"&&inv.dueDate&&new Date(inv.dueDate)<new Date())?"overdue":inv.status;

  const filteredInvoices = invoices.filter(inv => {
    if (filterStatus!=="all"&&getStatusKey(inv)!==filterStatus&&inv.status!==filterStatus) return false;
    if (search&&!inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())&&
        !inv.contactName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (!inRange(inv.createdAt,dateFrom,dateTo)) return false;
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    if (expenseCatFilter!=="all"&&e.category!==expenseCatFilter) return false;
    if (expenseSearch) {
      const q=expenseSearch.toLowerCase();
      if (!e.description?.toLowerCase().includes(q)&&!e.reference?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const posPayments     = payments.filter(p=>p.source==="pos"||p.channel==="pos");
  const websitePayments = payments.filter(p=>p.source==="website"||p.channel==="website");
  const totalRevenue    = invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+calcInvoice(i).total,0);
  const totalPending    = invoices.filter(i=>i.status==="sent").reduce((s,i)=>s+calcInvoice(i).total,0);
  const totalOverdue    = invoices.filter(i=>getStatusKey(i)==="overdue").reduce((s,i)=>s+calcInvoice(i).total,0);
  const totalExpenses   = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const totalPayments   = payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const activeProc      = PAYMENT_PROCESSORS.find(p=>p.id===processorSettings.activeProcessor);

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-subtitle">{invoices.length} invoices · {format(totalRevenue.toLocaleString())} collected{payments.length>0&&` · ${payments.length} payments`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary flex items-center gap-1.5"><RefreshCw size={13}/></button>
          {activeTab==="expenses" && <button onClick={()=>setShowExpenseModal(true)} className="btn-primary flex items-center gap-2"><Plus size={15}/> Add Expense</button>}
          {activeTab==="invoices" && <button onClick={()=>{setEditInv(null);setForm(EMPTY_INVOICE);setShowModal(true);}} className="btn-primary flex items-center gap-2"><Plus size={15}/> New Invoice</button>}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {label:"Collected",      value:format(totalRevenue.toLocaleString()),  icon:"✅"},
          {label:"Pending",        value:format(totalPending.toLocaleString()),  icon:"⏳"},
          {label:"Overdue",        value:format(totalOverdue.toLocaleString()),  icon:"⚠️"},
          {label:"Total Expenses", value:format(totalExpenses.toLocaleString()), icon:"📉"},
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="text-2xl mb-1">{k.icon}</div>
            <p className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{k.value}</p>
            <p className="text-xs" style={{color:"var(--text-muted)"}}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Active processor banner */}
      {activeProc && (
        <div className="p-3 rounded-2xl flex items-center gap-3"
          style={{background:`${activeProc.color}12`,border:`1px solid ${activeProc.color}40`}}>
          <CreditCard size={14} style={{color:activeProc.color,flexShrink:0}}/>
          <p className="text-sm" style={{color:"var(--text-muted)"}}>
            <strong style={{color:activeProc.color}}>{activeProc.name}</strong> is active — customers can pay invoices and website orders online.
          </p>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["invoices","payments","expenses","processor"].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-semibold capitalize border transition-all whitespace-nowrap"
            style={{
              background:  activeTab===t?"var(--primary)":"transparent",
              color:       activeTab===t?"#fff":"var(--text-muted)",
              borderColor: activeTab===t?"var(--primary)":"var(--border)",
            }}>
            {t==="processor"?"💳 Payment Processor":t}
          </button>
        ))}
      </div>

      {/* INVOICES TAB */}
      {activeTab==="invoices" && (
        <>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice # or customer..." className="deji-input pl-9"/>
            </div>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="deji-input w-auto"/>
            <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   className="deji-input w-auto"/>
            {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}} className="btn-secondary text-xs py-1.5 px-3">Clear Dates</button>}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all","draft","sent","paid","partial","overdue","cancelled"].map(s => (
              <button key={s} onClick={()=>setFilterStatus(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap capitalize"
                style={{background:filterStatus===s?"var(--primary)":"transparent",color:filterStatus===s?"#fff":"var(--text-muted)",borderColor:filterStatus===s?"var(--primary)":"var(--border)"}}>
                {s==="all"?"All":s} <span className="ml-1 opacity-70">{s==="all"?invoices.length:invoices.filter(i=>i.status===s).length}</span>
              </button>
            ))}
          </div>
          <div className="deji-card overflow-hidden">
            {loading?(
              <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading invoices...</div>
            ):filteredInvoices.length===0?(
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">🧾</div>
                <p style={{color:"var(--text-muted)"}}>{invoices.length===0?"No invoices yet. Create your first invoice.":"No invoices match your filters."}</p>
              </div>
            ):(
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredInvoices.map(inv => {
                      const {total}=calcInvoice(inv); const statusKey=getStatusKey(inv); const isOverdue=statusKey==="overdue";
                      return (
                        <tr key={inv.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="font-mono text-sm font-bold" style={{color:"var(--primary)"}}>{inv.invoiceNumber||"INV-"+inv.id?.slice(-6)}</span>
                                <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{fmtDate(inv.createdAt)}</p>
                              </div>
                              {(inv.source||inv.channel)&&<SourceBadge source={inv.source} channel={inv.channel}/>}
                            </div>
                          </td>
                          <td>
                            <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{inv.contactName}</p>
                            {inv.contactPhone&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>{inv.contactPhone}</p>}
                          </td>
                          <td><span className="text-sm font-bold" style={{color:"var(--text-primary)"}}>{format(total.toLocaleString())}</span></td>
                          <td><span className="text-xs" style={{color:isOverdue?"#f87171":"var(--text-muted)"}}>{fmtDate(inv.dueDate)}</span></td>
                          <td><span className={`badge ${STATUS_COLORS[statusKey]||"badge-blue"} capitalize`}>{statusKey}</span></td>
                          <td>
                            <div className="flex gap-1.5 flex-wrap">
                              <button onClick={()=>setViewInv(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Eye size={12}/></button>
                              <button onClick={()=>openEdit(inv)}   className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Edit size={12}/></button>
                              {inv.status==="draft"&&<button onClick={()=>markStatus(inv.id,"sent")} className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400" style={{background:"var(--bg-hover)"}}><Send size={12}/></button>}
                              {["sent","overdue","partial"].includes(inv.status)&&(
                                <>
                                  <button onClick={()=>markStatus(inv.id,"paid")} className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400" style={{background:"var(--bg-hover)"}}><CheckCircle size={12}/></button>
                                  {activeProc&&<button onClick={()=>navigator.clipboard.writeText(getPayLink(inv))} title="Copy payment link" className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"rgba(99,91,255,0.1)",color:"#635bff"}}><CreditCard size={12}/></button>}
                                </>
                              )}
                              <button onClick={()=>handleDelete(inv.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Trash2 size={12}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* PAYMENTS TAB */}
      {activeTab==="payments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:"Invoice Payments", value:payments.filter(p=>!p.source||p.source==="invoice").length, total:payments.filter(p=>!p.source||p.source==="invoice").reduce((s,p)=>s+Number(p.amount||0),0), icon:"🧾",color:"#22c55e"},
              {label:"POS Payments",     value:posPayments.length,      total:posPayments.reduce((s,p)=>s+Number(p.amount||0),0),      icon:"🏪",color:"#6366f1"},
              {label:"Website Payments", value:websitePayments.length,  total:websitePayments.reduce((s,p)=>s+Number(p.amount||0),0),  icon:"🌐",color:"#3b82f6"},
            ].map(k=>(
              <div key={k.label} className="kpi-card">
                <div className="text-xl mb-1">{k.icon}</div>
                <p className="text-lg font-bold" style={{fontFamily:"Syne,sans-serif",color:k.color}}>{format(k.total.toLocaleString())}</p>
                <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{k.value} · {k.label}</p>
              </div>
            ))}
          </div>
          <div className="deji-card overflow-hidden">
            {payments.length===0?(
              <div className="p-12 text-center"><div className="text-5xl mb-3">💳</div><p style={{color:"var(--text-muted)"}}>No payments yet. POS sales, website orders and invoice payments appear here automatically.</p></div>
            ):(
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead><tr><th>Reference</th><th>Customer</th><th>Source</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                  <tbody>
                    {payments.map(p=>(
                      <tr key={p.id}>
                        <td><span className="font-mono text-xs" style={{color:"var(--primary)"}}>{p.reference||p.id?.slice(-8)}</span></td>
                        <td><span className="text-sm" style={{color:"var(--text-primary)"}}>{p.contactName||p.customerName||"—"}</span></td>
                        <td><SourceBadge source={p.source} channel={p.channel}/></td>
                        <td><span className="text-sm font-bold text-green-400">{format(p.amount||0)}</span></td>
                        <td><span className="badge badge-blue capitalize">{p.method||p.paymentMethod||"—"}</span></td>
                        <td><span className="text-xs" style={{color:"var(--text-muted)"}}>{fmtDate(p.createdAt)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                      <td colSpan={3} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{payments.length} payments</span></td>
                      <td className="p-3"><span className="text-sm font-bold text-green-400">{format(totalPayments.toLocaleString())}</span></td>
                      <td colSpan={2}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EXPENSES TAB */}
      {activeTab==="expenses" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Operations","Payroll","Inventory","Other"].map(cat => {
              const catTotal=expenses.filter(e=>cat==="Other"?!["Operations","Payroll","Inventory"].includes(e.category):e.category===cat).reduce((s,e)=>s+Number(e.amount||0),0);
              return (
                <div key={cat} className="kpi-card">
                  <p className="text-xs font-semibold mb-1" style={{color:"var(--text-muted)"}}>{cat}</p>
                  <p className="text-lg font-bold text-red-400">{format(catTotal.toLocaleString())}</p>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
              <input value={expenseSearch} onChange={e=>setExpenseSearch(e.target.value)} placeholder="Search description or reference..." className="deji-input pl-9"/>
            </div>
            <select value={expenseCatFilter} onChange={e=>setExpenseCatFilter(e.target.value)} className="deji-input w-auto">
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {(expenseSearch||expenseCatFilter!=="all")&&<button onClick={()=>{setExpenseSearch("");setExpenseCatFilter("all");}} className="btn-secondary text-xs py-1.5 px-3">Clear</button>}
          </div>
          <div className="deji-card overflow-hidden">
            {filteredExpenses.length===0?(
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">📉</div>
                <p className="mb-4" style={{color:"var(--text-muted)"}}>{expenses.length===0?"No expenses recorded yet.":"No expenses match your filters."}</p>
                {expenses.length===0&&<button onClick={()=>setShowExpenseModal(true)} className="btn-primary flex items-center gap-2 mx-auto"><Plus size={14}/> Add First Expense</button>}
              </div>
            ):(
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Category</th><th>Amount</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredExpenses.map((e,idx)=>(
                      <tr key={e.id||idx}>
                        <td><span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{toDay(e.date)||fmtDate(e.date)||"—"}</span></td>
                        <td>
                          <p className="text-sm" style={{color:"var(--text-primary)"}}>{e.description}</p>
                          {e.notes&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>{e.notes}</p>}
                        </td>
                        <td><span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{e.reference||"—"}</span></td>
                        <td><span className="badge badge-blue text-xs">{e.category||"General"}</span></td>
                        <td><span className="text-sm font-bold text-red-400">-{format(e.amount||0)}</span></td>
                        <td><button onClick={()=>handleDeleteExpense(e.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Trash2 size={12}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                      <td colSpan={4} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{filteredExpenses.length} expenses</span></td>
                      <td className="p-3"><span className="text-sm font-bold text-red-400">-{format(filteredExpenses.reduce((s,e)=>s+Number(e.amount||0),0).toLocaleString())}</span></td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* PAYMENT PROCESSOR TAB */}
      {activeTab==="processor" && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-4 rounded-2xl flex items-start gap-3"
            style={{background:"rgba(99,91,255,0.06)",border:"1px solid rgba(99,91,255,0.2)"}}>
            <CreditCard size={16} style={{color:"#635bff",flexShrink:0,marginTop:2}}/>
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>Optional: Accept Online Payments</p>
              <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>Connect a processor to let customers pay invoices via link and accept payments on your Deji website. You only need one.</p>
            </div>
          </div>

          <div className="deji-card p-4">
            <label className="deji-label">Active Processor</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[...PAYMENT_PROCESSORS,{id:"",name:"None — manual only",logo:"🚫",color:"#6b7280"}].map(p=>(
                <button key={p.id} type="button" onClick={()=>setProcessorSettings(prev=>({...prev,activeProcessor:p.id}))}
                  className="p-3 rounded-xl text-left border transition-all"
                  style={{borderColor:processorSettings.activeProcessor===p.id?p.color:"var(--border)",background:processorSettings.activeProcessor===p.id?`${p.color}15`:"transparent"}}>
                  <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{p.logo} {p.name}</p>
                </button>
              ))}
            </div>
          </div>

          {PAYMENT_PROCESSORS.map(proc => {
            const key = processorSettings[proc.id];
            const isActive = processorSettings.activeProcessor===proc.id;
            return (
              <div key={proc.id} className="deji-card p-5"
                style={{borderColor:isActive?proc.color:undefined}}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:`${proc.color}20`}}>{proc.logo}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold" style={{color:"var(--text-primary)"}}>{proc.name}</p>
                        {isActive&&<span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:`${proc.color}20`,color:proc.color}}>● ACTIVE</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>{proc.desc}</p>
                    </div>
                  </div>
                  <a href={proc.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs flex-shrink-0" style={{color:"var(--primary)"}}>Docs <ExternalLink size={10}/></a>
                </div>
                <div className="space-y-2">
                  <label className="deji-label">{proc.keyLabel}</label>
                  <div className="flex gap-2">
                    <input type="text" value={key} onChange={e=>setProcessorSettings(prev=>({...prev,[proc.id]:e.target.value}))}
                      className="deji-input flex-1 font-mono text-xs" placeholder={`${proc.keyPrefix}...`}/>
                    {key&&<CopyBtn text={key}/>}
                  </div>
                  {key&&!key.startsWith(proc.keyPrefix)&&<p className="text-xs text-yellow-400">⚠ Should start with `{proc.keyPrefix}`</p>}
                  {key&&key.startsWith(proc.keyPrefix)&&<p className="text-xs text-green-400">✓ Key format correct</p>}
                  <div className="p-3 rounded-xl flex items-center gap-2" style={{background:"var(--bg-hover)"}}>
                    <ExternalLink size={11} style={{color:"var(--text-muted)",flexShrink:0}}/>
                    <p className="text-xs" style={{color:"var(--text-muted)"}}>Get your key from <a href={proc.testUrl} target="_blank" rel="noreferrer" className="underline" style={{color:"var(--primary)"}}>{proc.name} dashboard</a></p>
                  </div>
                </div>
              </div>
            );
          })}

          <button onClick={saveProcessorSettings} disabled={savingProc}
            className="btn-primary w-full py-3.5 font-bold flex items-center justify-center gap-2">
            {savingProc?<><RefreshCw size={14} className="animate-spin"/> Saving...</>:procSaved?<><Check size={14}/> Saved!</>:"Save Payment Settings"}
          </button>

          <div className="p-4 rounded-2xl" style={{background:"var(--bg-hover)"}}>
            <p className="text-xs font-bold mb-2" style={{color:"var(--text-muted)"}}>⚙ Webhook URL (set in your payment dashboard)</p>
            <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
              <code className="text-xs flex-1" style={{color:"var(--primary)"}}>
                {typeof window!=="undefined"?window.location.origin:""}/api/webhooks/payment
              </code>
              <CopyBtn text={`${typeof window!=="undefined"?window.location.origin:""}/api/webhooks/payment`}/>
            </div>
            <p className="text-xs mt-2" style={{color:"var(--text-muted)"}}>Deji auto-marks invoices paid and updates the ledger when customers pay online.</p>
          </div>
        </div>
      )}

      {/* VIEW INVOICE MODAL */}
      {viewInv && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setViewInv(null)}>
          <div className="deji-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{viewInv.invoiceNumber||"Invoice"}</h2>
                  {(viewInv.source||viewInv.channel)&&<SourceBadge source={viewInv.source} channel={viewInv.channel}/>}
                </div>
                <span className={`badge ${STATUS_COLORS[viewInv.status]||"badge-blue"} capitalize`}>{viewInv.status}</span>
              </div>
              <button onClick={()=>setViewInv(null)} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="deji-label">Customer</p>
                  <p style={{color:"var(--text-primary)"}}>{viewInv.contactName}</p>
                  {viewInv.contactPhone&&<p style={{color:"var(--text-muted)"}}>{viewInv.contactPhone}</p>}
                </div>
                <div>
                  <p className="deji-label">Due Date</p>
                  <p style={{color:"var(--text-primary)"}}>{fmtDate(viewInv.dueDate)}</p>
                </div>
              </div>
              {activeProc&&["sent","overdue","partial"].includes(viewInv.status)&&(
                <div className="p-3 rounded-xl" style={{background:`${activeProc.color}12`,border:`1px solid ${activeProc.color}30`}}>
                  <p className="text-xs font-bold mb-2" style={{color:activeProc.color}}>💳 Send Payment Link ({activeProc.name})</p>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{background:"var(--bg-card)"}}>
                    <code className="text-xs flex-1 truncate" style={{color:"var(--primary)"}}>{getPayLink(viewInv)}</code>
                    <CopyBtn text={getPayLink(viewInv)}/>
                  </div>
                  <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>Share via WhatsApp or email — auto-marks paid on payment.</p>
                </div>
              )}
              <div className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border)"}}>
                <table className="w-full text-sm">
                  <thead><tr style={{background:"var(--bg-hover)"}}>
                    <th className="text-left p-3" style={{color:"var(--text-muted)"}}>Item</th>
                    <th className="text-right p-3" style={{color:"var(--text-muted)"}}>Qty</th>
                    <th className="text-right p-3" style={{color:"var(--text-muted)"}}>Price</th>
                    <th className="text-right p-3" style={{color:"var(--text-muted)"}}>Total</th>
                  </tr></thead>
                  <tbody>
                    {(viewInv.items||[]).map((item,i)=>(
                      <tr key={i} style={{borderTop:"1px solid var(--border)"}}>
                        <td className="p-3" style={{color:"var(--text-primary)"}}>{item.description}</td>
                        <td className="p-3 text-right" style={{color:"var(--text-muted)"}}>{item.quantity}</td>
                        <td className="p-3 text-right" style={{color:"var(--text-muted)"}}>{format(item.unitPrice)}</td>
                        <td className="p-3 text-right font-semibold" style={{color:"var(--text-primary)"}}>{format((item.quantity*item.unitPrice).toLocaleString())}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3" style={{borderTop:"1px solid var(--border)",background:"var(--bg-hover)"}}><Totals inv={viewInv}/></div>
              </div>
              {viewInv.notes&&<div className="p-3 rounded-xl" style={{background:"var(--bg-hover)"}}><p className="deji-label mb-1">Notes</p><p className="text-sm" style={{color:"var(--text-primary)"}}>{viewInv.notes}</p></div>}
              <div className="flex gap-3">
                {viewInv.status==="draft"&&<button onClick={()=>{markStatus(viewInv.id,"sent");setViewInv(null);}} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Send size={14}/> Mark Sent</button>}
                {["sent","overdue","partial"].includes(viewInv.status)&&<button onClick={()=>{markStatus(viewInv.id,"paid");setViewInv(null);}} className="btn-primary flex-1 flex items-center justify-center gap-2"><CheckCircle size={14}/> Mark Paid</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE/EDIT INVOICE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>{setShowModal(false);setEditInv(null);}}>
          <div className="deji-card p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{editInv?"Edit Invoice":"New Invoice"}</h2>
              <button onClick={()=>{setShowModal(false);setEditInv(null);}} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <form onSubmit={saveInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="deji-label">Customer Name *</label><input value={form.contactName} onChange={e=>setForm(p=>({...p,contactName:e.target.value}))} className="deji-input" required/></div>
                <div><label className="deji-label">Phone</label><input value={form.contactPhone} onChange={e=>setForm(p=>({...p,contactPhone:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Email</label><input type="email" value={form.contactEmail} onChange={e=>setForm(p=>({...p,contactEmail:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Due Date</label><input type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Dispatch from Warehouse</label><select value={form.warehouseId} onChange={e=>setForm(p=>({...p,warehouseId:e.target.value}))} className="deji-input"><option value="">Auto (highest stock)</option>{warehouses.filter(w=>w.isActive!==false).map(w=>(<option key={w.id} value={w.id}>{w.name} · {w.country}</option>))}</select><p className="text-xs mt-1" style={{color:"var(--text-muted)"}}>Stock will be deducted from this warehouse when invoice is created</p></div>
                <div><label className="deji-label">Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="deji-input">
                    {["draft","sent","paid","partial","overdue","cancelled"].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{borderTop:"1px solid var(--border)",paddingTop:"1rem"}}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>Line Items</p>
                  <button type="button" onClick={addItem} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><Plus size={11}/> Add</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item,i)=>(
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6"><input value={item.description} onChange={e=>updateItem(i,"description",e.target.value)} className="deji-input text-sm" placeholder="Item description"/></div>
                      <div className="col-span-2"><input type="number" min="1" value={item.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} className="deji-input text-sm text-center" placeholder="Qty"/></div>
                      <div className="col-span-3"><input type="number" value={item.unitPrice} onChange={e=>updateItem(i,"unitPrice",e.target.value)} className="deji-input text-sm" placeholder="Unit price"/></div>
                      <div className="col-span-1 flex justify-center">{form.items.length>1&&<button type="button" onClick={()=>removeItem(i)} className="text-red-400"><X size={13}/></button>}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl" style={{background:"var(--bg-hover)"}}><Totals inv={form}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="deji-label">Discount</label><input type="number" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} className="deji-input" placeholder="0"/></div>
                <div><label className="deji-label">Discount Type</label>
                  <select value={form.discountType} onChange={e=>setForm(p=>({...p,discountType:e.target.value}))} className="deji-input">
                    <option value="fixed">Fixed (₦)</option><option value="percent">Percent (%)</option>
                  </select>
                </div>
              </div>
              <div><label className="deji-label">Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2}/></div>
              {activeProc&&(
                <div className="p-3 rounded-xl flex items-center gap-2" style={{background:"var(--bg-hover)"}}>
                  <CreditCard size={13} style={{color:activeProc.color}}/>
                  <p className="text-xs" style={{color:"var(--text-muted)"}}>After saving, use the 💳 button on the invoice to copy the payment link and send via WhatsApp.</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{setShowModal(false);setEditInv(null);}} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?"Saving...":editInv?"Update Invoice":"Create Invoice"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowExpenseModal(false)}>
          <div className="deji-card p-6 w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Record Expense</h2>
              <button onClick={()=>setShowExpenseModal(false)} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <form onSubmit={saveExpense} className="space-y-4">
              <div><label className="deji-label">Description *</label><input value={expenseForm.description} onChange={e=>setExpenseForm(p=>({...p,description:e.target.value}))} className="deji-input" placeholder="e.g. Office rent, Generator fuel..." required/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="deji-label">Amount (₦) *</label><input type="number" min="1" value={expenseForm.amount} onChange={e=>setExpenseForm(p=>({...p,amount:e.target.value}))} className="deji-input" placeholder="0" required/></div>
                <div><label className="deji-label">Category *</label>
                  <select value={expenseForm.category} onChange={e=>setExpenseForm(p=>({...p,category:e.target.value}))} className="deji-input">
                    {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="deji-label">Date *</label><input type="date" value={expenseForm.date} onChange={e=>setExpenseForm(p=>({...p,date:e.target.value}))} className="deji-input" required/></div>
                <div><label className="deji-label">Reference</label><input value={expenseForm.reference} onChange={e=>setExpenseForm(p=>({...p,reference:e.target.value}))} className="deji-input" placeholder="EXP-003"/></div>
              </div>
              <div><label className="deji-label">Notes</label><textarea value={expenseForm.notes} onChange={e=>setExpenseForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2} placeholder="Optional notes..."/></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowExpenseModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={savingExpense} className="btn-primary flex-1">{savingExpense?"Saving...":"Record Expense"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
