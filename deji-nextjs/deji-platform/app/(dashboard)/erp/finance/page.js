"use client";
import { useCurrency } from "@/lib/currencyContext";
import { useState, useEffect, useCallback } from "react";
import { toDay, inRange, fmtDate } from "@/lib/dateUtils";
import {
  Plus, Search, X, Trash2, Edit, Eye, CheckCircle, Send, CreditCard,
  Copy, Check, RefreshCw, ExternalLink, Globe, RotateCcw, FileText,
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Package,
} from "lucide-react";
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, getPayments } from "@/lib/api";
import api from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  draft:"badge-blue", sent:"badge-orange", paid:"badge-green",
  overdue:"badge-red", cancelled:"badge-red", partial:"badge-yellow",
};
const STATUS_ICONS = {
  draft:"📝", sent:"📤", paid:"✅", overdue:"⚠️", cancelled:"❌", partial:"🔄",
};
const PAYMENT_PROCESSORS = [
  { id:"paystack",    name:"Paystack",     logo:"🟦", color:"#00c3f7", keyPrefix:"pk_",     keyLabel:"Public Key",      desc:"Card, bank transfer & USSD — Nigeria, Ghana, Kenya",  docsUrl:"https://paystack.com/docs" },
  { id:"flutterwave", name:"Flutterwave",  logo:"🟠", color:"#f5a623", keyPrefix:"FLWPUBK", keyLabel:"Public Key",      desc:"Pan-Africa — 150+ currencies across 34+ countries",   docsUrl:"https://developer.flutterwave.com" },
  { id:"stripe",      name:"Stripe",       logo:"🟣", color:"#635bff", keyPrefix:"pk_",     keyLabel:"Publishable Key", desc:"Global — international customers in USD/GBP/EUR",     docsUrl:"https://stripe.com/docs" },
];
const SOURCE_META = {
  pos:     { label:"POS",     color:"#6366f1", bg:"rgba(99,102,241,0.1)" },
  website: { label:"Website", color:"#3b82f6", bg:"rgba(59,130,246,0.1)" },
  invoice: { label:"Invoice", color:"#22c55e", bg:"rgba(34,197,94,0.1)"  },
};
const EMPTY_ITEM    = { description:"", quantity:1, unitPrice:"", productId:"", variantIdx:null, productObj:null, warehouseId:"" };
const EMPTY_INVOICE = {
  warehouseId:"", contactName:"", contactEmail:"", contactPhone:"", dueDate:"",
  items:[{...EMPTY_ITEM}], notes:"", discount:"", discountType:"fixed", status:"draft",
};
const EMPTY_EXPENSE = {
  description:"", amount:"", category:"Operations",
  reference:"", date:new Date().toISOString().split("T")[0], notes:"",
};
const EXPENSE_CATEGORIES = ["Operations","Inventory","Payroll","Marketing","Logistics","Utilities","Rent","Other"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeArray(val) {
  if (Array.isArray(val))           return val;
  if (Array.isArray(val?.data))     return val.data;
  if (Array.isArray(val?.invoices)) return val.invoices;
  if (Array.isArray(val?.payments)) return val.payments;
  if (Array.isArray(val?.entries))  return val.entries;
  if (Array.isArray(val?.results))  return val.results;
  if (Array.isArray(val?.products)) return val.products;
  return [];
}

function calcInvoice(inv) {
  // Try pre-computed total first, fall back to line-item sum
  const items    = inv.items || inv.lineItems || [];
  const subtotal = items.reduce((s,i) => s + (Number(i.quantity)||0)*(Number(i.unitPrice)||0), 0);
  const disc = inv.discount
    ? (inv.discountType==="percent" ? subtotal*(Number(inv.discount)/100) : Number(inv.discount))
    : 0;
  // If backend already set total use it, else compute
  const total = inv.total > 0 ? Number(inv.total) : Math.max(0, subtotal - Math.max(0,disc));
  return { subtotal, discount:Math.max(0,disc), total };
}

function getStatusKey(inv) {
  const s = inv.status?.toLowerCase() || 'draft';
  if (s==='sent' && inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue';
  return s;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Totals({ inv }) {
  const { format } = useCurrency();
  const { subtotal, discount, total } = calcInvoice(inv);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm"><span style={{color:"var(--text-muted)"}}>Subtotal</span><span style={{color:"var(--text-primary)"}}>{format(subtotal)}</span></div>
      {discount > 0 && <div className="flex justify-between text-sm"><span style={{color:"var(--text-muted)"}}>Discount</span><span className="text-red-400">-{format(discount)}</span></div>}
      <div className="flex justify-between font-bold text-base pt-1.5" style={{borderTop:"1px solid var(--border)"}}><span style={{color:"var(--text-primary)"}}>Total</span><span style={{color:"var(--primary)"}}>{format(total)}</span></div>
    </div>
  );
}

function SourceBadge({ source, channel }) {
  const meta = SOURCE_META[source||channel];
  if (!meta) return null;
  return <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold" style={{background:meta.bg,color:meta.color}}>{(source==="website"||channel==="website")&&<Globe size={7}/>}{(source==="pos"||channel==="pos")&&<CreditCard size={7}/>}{meta.label}</span>;
}

function CopyBtn({ text }) {
  const [copied,setCopied]=useState(false);
  return <button onClick={()=>{navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),2000);}} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg flex-shrink-0" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}>{copied?<><Check size={10} className="text-green-400"/> Copied</>:<><Copy size={10}/> Copy</>}</button>;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FinancePage() {
  const { format } = useCurrency();

  // Data state
  const [invoices,         setInvoices]         = useState([]);
  const [payments,         setPayments]         = useState([]);
  const [expenses,         setExpenses]         = useState([]);
  const [inventory,        setInventory]        = useState([]);
  const [warehouses,       setWarehouses]       = useState([]);
  const [deliveredOrders,  setDeliveredOrders]  = useState([]);

  // UI state
  const [loading,          setLoading]          = useState(true);
  const [activeTab,        setActiveTab]        = useState("invoices");
  const [search,           setSearch]           = useState("");
  const [filterStatus,     setFilterStatus]     = useState("all");
  const [dateFrom,         setDateFrom]         = useState("");
  const [dateTo,           setDateTo]           = useState("");

  // Modal state
  const [showModal,        setShowModal]        = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRefund,       setShowRefund]       = useState(null);
  const [viewInv,          setViewInv]          = useState(null);
  const [editInv,          setEditInv]          = useState(null);

  // Form state
  const [form,             setForm]             = useState(EMPTY_INVOICE);
  const [expenseForm,      setExpenseForm]      = useState(EMPTY_EXPENSE);
  const [refundForm,       setRefundForm]       = useState({ reason:"", restockWarehouseId:"", items:[] });

  // Saving state
  const [saving,           setSaving]           = useState(false);
  const [savingExpense,    setSavingExpense]    = useState(false);
  const [savingRefund,     setSavingRefund]     = useState(false);
  const [raisingInvoice,   setRaisingInvoice]  = useState("");

  // Expense filters
  const [expenseSearch,    setExpenseSearch]    = useState("");
  const [expenseCatFilter, setExpenseCatFilter] = useState("all");

  // Payment processor
  const [processorSettings, setProcessorSettings] = useState({paystack:"",flutterwave:"",stripe:"",activeProcessor:""});
  const [savingProc,        setSavingProc]         = useState(false);
  const [procSaved,         setProcSaved]          = useState(false);

  useEffect(() => { fetchAll(); fetchProcessorSettings(); }, []);
  useEffect(() => { if (activeTab==="expenses") fetchExpenses(); }, [activeTab]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ir,pr,wr,inv2,or2] = await Promise.allSettled([
        getInvoices({limit:500}),
        getPayments({limit:200}).catch(()=>({data:[]})),
        api.get('/warehouses'),
        api.get('/products?limit=500'),
        api.get('/orders?status=delivered').catch(()=>({data:{data:[]}})),
      ]);

      const allInvoices = ir.status==="fulfilled" ? safeArray(ir.value?.data??ir.value) : [];
      setInvoices(allInvoices);
      setPayments(pr.status==="fulfilled" ? safeArray(pr.value?.data??pr.value) : []);
      setWarehouses(wr.status==="fulfilled" ? safeArray(wr.value?.data) : []);

      const invData = inv2.status==="fulfilled" ? inv2.value?.data : null;
      setInventory(invData ? (Array.isArray(invData)?invData:Array.isArray(invData?.data)?invData.data:invData?.products||[]) : []);

      const allDelivered = or2.status==="fulfilled" ? safeArray(or2.value?.data?.data??or2.value?.data??or2.value) : [];
      // Only show delivered orders that don't already have an invoice
      const invoicedOrderIds = new Set(allInvoices.map(i=>i.fromOrderId).filter(Boolean));
      // Also filter by notes containing order ID as fallback
      const invoicedOrderNotes = new Set(allInvoices.map(i=>i.notes).filter(Boolean));
      setDeliveredOrders(allDelivered.filter(o => {
        if (invoicedOrderIds.has(o.id)) return false;
        if ([...invoicedOrderNotes].some(n => n.includes(o.id.slice(-8).toUpperCase()))) return false;
        return true;
      }));
    } catch(e) { console.error(e); setInvoices([]); setPayments([]); }
    finally { setLoading(false); }
  }, []);

  const fetchExpenses = async () => {
    try {
      const er = await api.get("/ledger?type=expense&limit=500");
      setExpenses(safeArray(er.data));
    } catch(e) { console.error(e); setExpenses([]); }
  };

  const fetchProcessorSettings = async () => {
    try {
      const res=await api.get("/settings"); const s=res.data?.settings||res.data||{};
      setProcessorSettings({ paystack:s.paystackKey||"", flutterwave:s.flutterwaveKey||"", stripe:s.stripeKey||"", activeProcessor:s.activeProcessor||"" });
    } catch {}
  };

  // ── Raise invoice from delivered order ───────────────────────────────────────
  const raiseInvoiceFromOrder = async (order) => {
    setRaisingInvoice(order.id);
    try {
      const items = (order.orderItems||[]).map(i=>({
        description: i.product?.name || `Product #${(i.productId||"").slice(-6)}`,
        quantity:    Number(i.quantity)||1,
        unitPrice:   Number(i.price)||0,
        productId:   i.productId||"",
      }));
      if (!items.length) items.push({ description:`Order #${order.id?.slice(-8).toUpperCase()}`, quantity:1, unitPrice:Number(order.totalAmount)||0, productId:"" });
      await createInvoice({
        contactName:  order.lead?.name  || "Customer",
        contactEmail: order.lead?.email || "",
        contactPhone: order.lead?.phone || "",
        items, status:"draft",
        fromOrderId: order.id,
        notes: `Auto-generated from delivered order #${order.id?.slice(-8).toUpperCase()}`,
      });
      await fetchAll(); setActiveTab("invoices");
    } catch(e) { alert("Failed to create invoice: "+e.message); }
    finally { setRaisingInvoice(""); }
  };

  // ── Save invoice (create or update) ─────────────────────────────────────────
  const saveInvoice = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = {
        ...form,
        items:    form.items.map(i=>({ description:i.description, quantity:Number(i.quantity), unitPrice:Number(i.unitPrice), productId:i.productId||null, warehouseId:i.warehouseId||form.warehouseId||null })),
        discount: Number(form.discount)||0,
        warehouseId: form.warehouseId||null,
      };
      if (editInv) {
        await updateInvoice(editInv.id, payload);
      } else {
        await createInvoice(payload);
      }
      await fetchAll(); setShowModal(false); setEditInv(null); setForm(EMPTY_INVOICE);
    } catch(e) { alert(e.response?.data?.message || e.message); }
    finally { setSaving(false); }
  };

  // ── Mark invoice status ───────────────────────────────────────────────────────
  const markStatus = async (id, status) => {
    try {
      await api.patch(`/invoices/${id}/status`, { status });
      // Optimistic update
      setInvoices(prev => prev.map(inv => inv.id===id ? {...inv, status} : inv));
      // Refresh to get accurate data
      setTimeout(() => fetchAll(), 500);
    } catch(e) {
      alert("Failed to update status: " + (e.response?.data?.message || e.message));
      fetchAll();
    }
  };

  // ── Record manual payment ─────────────────────────────────────────────────────
  const recordManualPayment = async (inv) => {
    const amount = prompt(`Record payment for ${inv.contactName}\nInvoice total: ${format(calcInvoice(inv).total)}\n\nEnter amount paid:`, calcInvoice(inv).total);
    if (!amount) return;
    try {
      await api.post(`/invoices/${inv.id}/payments`, {
        amount:  Number(amount),
        method:  'manual',
        reference: `PAY-${Date.now().toString().slice(-6)}`,
        note:    'Manual payment recorded',
      });
      // Mark as paid if full amount
      const { total } = calcInvoice(inv);
      if (Number(amount) >= total) {
        await markStatus(inv.id, 'paid');
      } else if (Number(amount) > 0) {
        await markStatus(inv.id, 'partial');
      }
      await fetchAll();
    } catch(e) { alert("Failed to record payment: " + (e.response?.data?.message || e.message)); }
  };

  // ── Delete invoice ────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    try { await deleteInvoice(id); fetchAll(); } catch(e) { alert(e.message); }
  };

  // ── Open edit modal ───────────────────────────────────────────────────────────
  const openEdit = (inv) => {
    setEditInv(inv);
    setForm({
      warehouseId:  inv.warehouseId||"",
      contactName:  inv.contactName||"",
      contactEmail: inv.contactEmail||"",
      contactPhone: inv.contactPhone||"",
      dueDate:      inv.dueDate?inv.dueDate.split("T")[0]:"",
      items: (inv.items||inv.lineItems||[]).length
        ? (inv.items||inv.lineItems||[]).map(i=>({ description:i.description||"", quantity:i.quantity||1, unitPrice:i.unitPrice||"", productId:i.productId||"", variantIdx:null, productObj:inventory.find(p=>p.id===i.productId)||null, warehouseId:i.warehouseId||"" }))
        : [{...EMPTY_ITEM}],
      notes:       inv.notes||"",
      discount:    inv.discount||"",
      discountType:inv.discountType||"fixed",
      status:      inv.status||"draft",
    });
    setShowModal(true);
  };

  // ── Refund ────────────────────────────────────────────────────────────────────
  const openRefund = (inv) => {
    const defaultWH = warehouses.find(w=>w.isDefault)||warehouses[0];
    setRefundForm({
      reason:"", restockWarehouseId:defaultWH?.id||"",
      items:(inv.items||inv.lineItems||[]).map((item,idx)=>({ lineItemId:item.id||`item-${idx}`, productId:item.productId||"", quantity:item.quantity, description:item.description, unitPrice:item.unitPrice, selected:true })),
    });
    setShowRefund(inv);
  };

  const submitRefund = async () => {
    if (!showRefund) return;
    if (!refundForm.reason.trim()) { alert("Please provide a refund reason."); return; }
    setSavingRefund(true);
    try {
      const items = refundForm.items.filter(i=>i.selected).map(i=>({ lineItemId:i.lineItemId, productId:i.productId||null, quantity:Number(i.quantity) }));
      const res = await api.post(`/invoices/${showRefund.id}/refund`, { reason:refundForm.reason, restockWarehouseId:refundForm.restockWarehouseId||null, items });
      setShowRefund(null); await fetchAll();
      alert(`✅ Refund of ${format(Number(res.data?.refundAmount||0))} processed. Stock restocked.`);
    } catch(e) { alert(e?.response?.data?.message||e.message||"Refund failed"); }
    finally { setSavingRefund(false); }
  };

  // ── Line item helpers ─────────────────────────────────────────────────────────
  const addItem    = () => setForm(p=>({...p,items:[...p.items,{...EMPTY_ITEM}]}));
  const removeItem = (i) => { if(form.items.length>1) setForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)})); };
  const updateItem = (i,k,v) => setForm(p=>({...p,items:p.items.map((it,j)=>j===i?{...it,[k]:v}:it)}));

  const getVariants = (prod) => {
    if (!prod) return [];
    if (prod.variants?.length) return prod.variants;
    return prod.customFields?.variants || [];
  };

  const pickProduct = (i, productId) => {
    const prod = inventory.find(p=>p.id===productId);
    if (prod) {
      const variants = getVariants(prod);
      const firstV   = variants[0];
      const price    = firstV?.sellingPrice || firstV?.price || prod.price || prod.sellingPrice || "";
      setForm(p=>({...p, items:p.items.map((it,j)=>j!==i?it:{
        ...it, productId:prod.id, variantIdx:firstV?0:null,
        description: firstV ? `${prod.name} — ${firstV.name}` : prod.name,
        unitPrice:   price, productObj:prod,
      })}));
    } else {
      setForm(p=>({...p, items:p.items.map((it,j)=>j!==i?it:{...it,productId:"",variantIdx:null,productObj:null})}));
    }
  };

  const pickVariant = (i, variantIdx) => {
    const prod     = form.items[i]?.productObj;
    const variants = getVariants(prod);
    const v        = variants[Number(variantIdx)];
    setForm(p=>({...p, items:p.items.map((it,j)=>j!==i?it:{
      ...it, variantIdx,
      description: v ? `${prod.name} — ${v.name}` : prod?.name||"",
      unitPrice:   v?.sellingPrice || v?.price || it.unitPrice,
    })}));
  };

  // ── Expenses ──────────────────────────────────────────────────────────────────
  const saveExpense = async (e) => {
    e.preventDefault(); setSavingExpense(true);
    try {
      await api.post("/ledger", { description:expenseForm.description, amount:Number(expenseForm.amount), category:expenseForm.category, reference:expenseForm.reference||`EXP-${Date.now().toString().slice(-6)}`, date:new Date(expenseForm.date).toISOString(), type:"expense", notes:expenseForm.notes });
      await fetchExpenses(); setShowExpenseModal(false); setExpenseForm(EMPTY_EXPENSE);
    } catch(err) { alert(err.response?.data?.message||err.message); }
    finally { setSavingExpense(false); }
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm("Delete this expense?")) return;
    try { await api.delete(`/ledger/${id}`); fetchExpenses(); } catch(e) { alert(e.message); }
  };

  // ── Processor settings ────────────────────────────────────────────────────────
  const saveProcessorSettings = async () => {
    setSavingProc(true);
    try {
      await api.patch("/settings", { paystackKey:processorSettings.paystack, flutterwaveKey:processorSettings.flutterwave, stripeKey:processorSettings.stripe, activeProcessor:processorSettings.activeProcessor });
      const ex=JSON.parse(localStorage.getItem("tenantSettings")||"{}");
      localStorage.setItem("tenantSettings",JSON.stringify({...ex,paystackKey:processorSettings.paystack,flutterwaveKey:processorSettings.flutterwave,stripeKey:processorSettings.stripe,activeProcessor:processorSettings.activeProcessor}));
      setProcSaved(true); setTimeout(()=>setProcSaved(false),3000);
    } catch(e) { alert(e.message); }
    finally { setSavingProc(false); }
  };

  const getPayLink = (inv) => (typeof window!=="undefined"?window.location.origin:"")+`/pay/${inv.id}`;
  const activeProc = PAYMENT_PROCESSORS.find(p=>p.id===processorSettings.activeProcessor);

  // ── Computed KPIs ─────────────────────────────────────────────────────────────
  const filteredInvoices = invoices.filter(inv => {
    const sk = getStatusKey(inv);
    if (filterStatus!=="all" && sk!==filterStatus && inv.status!==filterStatus) return false;
    if (search && !inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) && !inv.contactName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (!inRange(inv.createdAt, dateFrom, dateTo)) return false;
    return true;
  });

  const paidInvoices     = invoices.filter(i => i.status==="paid"    || i.status==="PAID");
  const pendingInvoices  = invoices.filter(i => i.status==="sent"    || i.status==="PENDING");
  const overdueInvoices  = invoices.filter(i => getStatusKey(i)==="overdue");
  const totalRevenue     = paidInvoices.reduce((s,i) => s+calcInvoice(i).total, 0);
  const totalPending     = pendingInvoices.reduce((s,i) => s+calcInvoice(i).total, 0);
  const totalOverdue     = overdueInvoices.reduce((s,i) => s+calcInvoice(i).total, 0);
  const totalExpenses    = expenses.reduce((s,e) => s+(parseFloat(e.amount||e.debit||0)||0), 0);
  const netProfit        = totalRevenue - totalExpenses;
  const totalPayments    = payments.reduce((s,p) => s+Number(p.amount||0), 0);
  const posPayments      = payments.filter(p=>p.source==="pos"||p.channel==="pos");
  const websitePayments  = payments.filter(p=>p.source==="website"||p.channel==="website");

  const filteredExpenses = expenses.filter(e => {
    if (expenseCatFilter!=="all" && e.category!==expenseCatFilter) return false;
    if (expenseSearch) { const q=expenseSearch.toLowerCase(); if (!e.description?.toLowerCase().includes(q)&&!e.reference?.toLowerCase().includes(q)) return false; }
    return true;
  });

  // Status tab counts
  const statusCounts = {
    all: invoices.length,
    draft:     invoices.filter(i=>i.status==="draft"||i.status==="PENDING").length,
    sent:      invoices.filter(i=>i.status==="sent").length,
    paid:      paidInvoices.length,
    partial:   invoices.filter(i=>i.status==="partial"||i.status==="PARTIALLY_PAID").length,
    overdue:   overdueInvoices.length,
    cancelled: invoices.filter(i=>i.status==="cancelled"||i.status==="CANCELLED").length,
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-6 animate-fade-up">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="page-subtitle">
            {invoices.length} invoices · {format(totalRevenue)} collected
            {payments.length>0 && ` · ${payments.length} payments`}
            {netProfit!==0 && ` · Net: ${netProfit>=0?"+":""}${format(netProfit)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary flex items-center gap-1.5" title="Refresh"><RefreshCw size={13}/></button>
          {activeTab==="expenses" && <button onClick={()=>setShowExpenseModal(true)} className="btn-primary flex items-center gap-2"><Plus size={15}/> Add Expense</button>}
          {activeTab==="invoices" && <button onClick={()=>{setEditInv(null);setForm(EMPTY_INVOICE);setShowModal(true);}} className="btn-primary flex items-center gap-2"><Plus size={15}/> New Invoice</button>}
        </div>
      </div>

      {/* ── KPI CARDS ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:"Collected", value:format(totalRevenue), icon:<CheckCircle size={18}/>, color:"#22c55e", sub:`${paidInvoices.length} paid invoices` },
          { label:"Pending",   value:format(totalPending), icon:<Send size={18}/>,        color:"#f97316", sub:`${pendingInvoices.length} sent, awaiting payment` },
          { label:"Overdue",   value:format(totalOverdue), icon:<AlertTriangle size={18}/>,color:"#ef4444", sub:overdueInvoices.length>0?`${overdueInvoices.length} invoices past due`:"All clear" },
          { label:"Expenses",  value:format(totalExpenses),icon:<TrendingDown size={18}/>,color:"#6366f1", sub:`Net profit: ${netProfit>=0?"+":""}${format(netProfit)}` },
        ].map(k => (
          <div key={k.label} className="kpi-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:k.color+"22",color:k.color}}>{k.icon}</div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{k.value}</p>
              <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{k.label}</p>
              <p className="text-[9px]" style={{color:"var(--text-dim)"}}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── DELIVERED ORDERS BANNER ─────────────────────────────────────────── */}
      {deliveredOrders.length>0 && activeTab==="invoices" && (
        <div className="p-4 rounded-2xl" style={{background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.3)"}}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚚</span>
            <div>
              <p className="text-sm font-bold" style={{color:"var(--text-primary)"}}>{deliveredOrders.length} Delivered Order{deliveredOrders.length>1?"s":""} Ready to Invoice</p>
              <p className="text-xs" style={{color:"var(--text-muted)"}}>Sales reps marked these as delivered — raise invoices with one click</p>
            </div>
          </div>
          <div className="space-y-2">
            {deliveredOrders.slice(0,5).map(order => {
              const total = Number(order.totalAmount)||(order.orderItems||[]).reduce((s,i)=>s+(Number(i.price)||0)*(Number(i.quantity)||1),0);
              const isRaising = raisingInvoice===order.id;
              return (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl" style={{background:"var(--bg-card)",border:"1px solid var(--border)"}}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>Order #{order.id?.slice(-8).toUpperCase()}</p>
                      <span className="badge badge-green text-[9px]">Delivered</span>
                    </div>
                    <p className="text-xs" style={{color:"var(--text-muted)"}}>
                      {order.lead?.name && <span className="mr-2">👤 {order.lead.name}</span>}
                      {(order.orderItems||[]).length} items · {format(total)}
                    </p>
                  </div>
                  <button onClick={()=>raiseInvoiceFromOrder(order)} disabled={isRaising}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-shrink-0"
                    style={{opacity:isRaising?0.7:1}}>
                    {isRaising?<><RefreshCw size={10} className="animate-spin"/> Creating...</>:<><Plus size={11}/> Raise Invoice</>}
                  </button>
                </div>
              );
            })}
            {deliveredOrders.length>5 && <p className="text-xs text-center pt-1" style={{color:"var(--text-muted)"}}>+{deliveredOrders.length-5} more</p>}
          </div>
        </div>
      )}

      {activeProc && (
        <div className="p-3 rounded-2xl flex items-center gap-3" style={{background:`${activeProc.color}12`,border:`1px solid ${activeProc.color}40`}}>
          <CreditCard size={14} style={{color:activeProc.color,flexShrink:0}}/>
          <p className="text-sm" style={{color:"var(--text-muted)"}}><strong style={{color:activeProc.color}}>{activeProc.name}</strong> is active — customers can pay invoices online.</p>
        </div>
      )}

      {/* ── TABS ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["invoices","payments","expenses","processor"].map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} className="px-4 py-2 rounded-xl text-sm font-semibold capitalize border transition-all whitespace-nowrap"
            style={{background:activeTab===t?"var(--primary)":"transparent",color:activeTab===t?"#fff":"var(--text-muted)",borderColor:activeTab===t?"var(--primary)":"var(--border)"}}>
            {t==="processor"?"💳 Payment Processor":t==="invoices"?`Invoices (${invoices.length})`:t==="payments"?`Payments (${payments.length})`:t==="expenses"?`Expenses (${expenses.length})`:t}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          INVOICES TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="invoices" && (
        <>
          {/* Search + date filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice # or customer..." className="deji-input pl-9"/>
            </div>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="deji-input w-auto"/>
            <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   className="deji-input w-auto"/>
            {(dateFrom||dateTo) && <button onClick={()=>{setDateFrom("");setDateTo("");}} className="btn-secondary text-xs py-1.5 px-3">Clear</button>}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all","draft","sent","paid","partial","overdue","cancelled"].map(s => (
              <button key={s} onClick={()=>setFilterStatus(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap capitalize"
                style={{background:filterStatus===s?"var(--primary)":"transparent",color:filterStatus===s?"#fff":"var(--text-muted)",borderColor:filterStatus===s?"var(--primary)":"var(--border)"}}>
                {STATUS_ICONS[s]||""} {s==="all"?"All":s} <span className="ml-1 opacity-70">{statusCounts[s]||0}</span>
              </button>
            ))}
          </div>

          {/* Invoice table */}
          <div className="deji-card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center" style={{color:"var(--text-muted)"}}>Loading invoices...</div>
            ) : filteredInvoices.length===0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">🧾</div>
                <p style={{color:"var(--text-muted)"}}>{invoices.length===0?"No invoices yet — create your first one or raise from a delivered order.":"No invoices match your filters."}</p>
                {invoices.length===0 && <button onClick={()=>setShowModal(true)} className="btn-primary mt-4 flex items-center gap-2 mx-auto"><Plus size={14}/> Create First Invoice</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead>
                    <tr><th>Invoice</th><th>Customer</th><th>Items</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => {
                      const { total } = calcInvoice(inv);
                      const sk = getStatusKey(inv);
                      const isOverdue = sk==="overdue";
                      const isPaid    = sk==="paid";
                      const items     = inv.items || inv.lineItems || [];
                      return (
                        <tr key={inv.id}>
                          <td>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div>
                                <span className="font-mono text-sm font-bold" style={{color:"var(--primary)"}}>{inv.invoiceNumber||"INV-"+inv.id?.slice(-6)}</span>
                                <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{fmtDate(inv.createdAt)}</p>
                              </div>
                              {(inv.source||inv.channel) && <SourceBadge source={inv.source} channel={inv.channel}/>}
                              {inv.fromOrderId && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{background:"rgba(34,197,94,0.15)",color:"#22c55e"}}>📦 Order</span>}
                            </div>
                          </td>
                          <td>
                            <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>{inv.contactName||"—"}</p>
                            {inv.contactPhone && <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{inv.contactPhone}</p>}
                            {inv.contactEmail && <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{inv.contactEmail}</p>}
                          </td>
                          <td>
                            <div className="space-y-0.5">
                              {items.slice(0,2).map((item,i) => (
                                <p key={i} className="text-[10px]" style={{color:"var(--text-muted)"}}>
                                  {item.description} × {item.quantity}
                                </p>
                              ))}
                              {items.length>2 && <p className="text-[9px]" style={{color:"var(--text-dim)"}}>+{items.length-2} more</p>}
                            </div>
                          </td>
                          <td>
                            <span className="text-sm font-bold" style={{color:isPaid?"#22c55e":isOverdue?"#ef4444":"var(--text-primary)"}}>{format(total)}</span>
                            {inv.discount>0 && <p className="text-[10px] text-red-400">-{format(inv.discount)} disc</p>}
                          </td>
                          <td>
                            <span className="text-xs" style={{color:isOverdue?"#f87171":"var(--text-muted)"}}>{fmtDate(inv.dueDate)||"—"}</span>
                          </td>
                          <td>
                            {/* Quick status changer */}
                            <select
                              value={sk}
                              onChange={e => markStatus(inv.id, e.target.value)}
                              className="text-xs rounded-lg px-2 py-1 border font-semibold"
                              style={{background:"var(--bg-hover)",borderColor:"var(--border)",cursor:"pointer",
                                color:sk==="paid"?"#22c55e":sk==="overdue"||sk==="cancelled"?"#ef4444":sk==="sent"?"#f97316":"var(--text-primary)"}}>
                              {["draft","sent","paid","partial","overdue","cancelled"].map(s => (
                                <option key={s} value={s}>{STATUS_ICONS[s]} {s.charAt(0).toUpperCase()+s.slice(1)}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <div className="flex gap-1.5 flex-wrap">
                              {/* View */}
                              <button onClick={()=>setViewInv(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}} title="View"><Eye size={12}/></button>
                              {/* Edit */}
                              <button onClick={()=>openEdit(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}} title="Edit"><Edit size={12}/></button>
                              {/* Mark sent */}
                              {sk==="draft" && <button onClick={()=>markStatus(inv.id,"sent")} className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400" style={{background:"rgba(249,115,22,0.1)"}} title="Mark Sent"><Send size={12}/></button>}
                              {/* Mark paid */}
                              {["sent","overdue","partial"].includes(sk) && (
                                <button onClick={()=>markStatus(inv.id,"paid")} className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400" style={{background:"rgba(34,197,94,0.1)"}} title="Mark Paid"><CheckCircle size={12}/></button>
                              )}
                              {/* Record manual payment */}
                              {["sent","overdue","partial"].includes(sk) && (
                                <button onClick={()=>recordManualPayment(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"rgba(99,102,241,0.1)",color:"#6366f1"}} title="Record Payment"><DollarSign size={12}/></button>
                              )}
                              {/* Copy payment link */}
                              {activeProc && ["sent","overdue","partial"].includes(sk) && (
                                <button onClick={()=>navigator.clipboard.writeText(getPayLink(inv))} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:"rgba(99,91,255,0.1)",color:"#635bff"}} title="Copy payment link"><CreditCard size={12}/></button>
                              )}
                              {/* Refund */}
                              {["paid","partial"].includes(sk) && (
                                <button onClick={()=>openRefund(inv)} className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-400" style={{background:"rgba(249,115,22,0.1)"}} title="Refund"><RotateCcw size={12}/></button>
                              )}
                              {/* Delete */}
                              <button onClick={()=>handleDelete(inv.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}} title="Delete"><Trash2 size={12}/></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals footer */}
                  {filteredInvoices.length > 0 && (
                    <tfoot>
                      <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                        <td colSpan={3} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{filteredInvoices.length} invoices</span></td>
                        <td className="p-3">
                          <span className="text-sm font-bold" style={{color:"var(--text-primary)"}}>{format(filteredInvoices.reduce((s,i)=>s+calcInvoice(i).total,0))}</span>
                          <p className="text-[10px] text-green-400">Collected: {format(filteredInvoices.filter(i=>getStatusKey(i)==="paid").reduce((s,i)=>s+calcInvoice(i).total,0))}</p>
                        </td>
                        <td colSpan={3}/>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PAYMENTS TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="payments" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Invoice Payments", value:payments.filter(p=>!p.source||p.source==="invoice").length, total:payments.filter(p=>!p.source||p.source==="invoice").reduce((s,p)=>s+Number(p.amount||0),0), icon:"🧾", color:"#22c55e" },
              { label:"POS Payments",     value:posPayments.length,     total:posPayments.reduce((s,p)=>s+Number(p.amount||0),0),     icon:"🏪", color:"#6366f1" },
              { label:"Website Payments", value:websitePayments.length, total:websitePayments.reduce((s,p)=>s+Number(p.amount||0),0), icon:"🌐", color:"#3b82f6" },
            ].map(k => (
              <div key={k.label} className="kpi-card">
                <div className="text-xl mb-1">{k.icon}</div>
                <p className="text-lg font-bold" style={{fontFamily:"Syne,sans-serif",color:k.color}}>{format(k.total)}</p>
                <p className="text-[10px]" style={{color:"var(--text-muted)"}}>{k.value} · {k.label}</p>
              </div>
            ))}
          </div>
          <div className="deji-card overflow-hidden">
            {payments.length===0 ? (
              <div className="p-12 text-center"><div className="text-5xl mb-3">💳</div><p style={{color:"var(--text-muted)"}}>No payments recorded yet. Mark invoices as paid to see them here.</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead><tr><th>Reference</th><th>Customer</th><th>Invoice</th><th>Source</th><th>Amount</th><th>Method</th><th>Date</th></tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td><span className="font-mono text-xs" style={{color:"var(--primary)"}}>{p.reference||p.id?.slice(-8)}</span></td>
                        <td><span className="text-sm" style={{color:"var(--text-primary)"}}>{p.contactName||p.customerName||"—"}</span></td>
                        <td><span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{p.invoiceId?`INV-${p.invoiceId.slice(-6)}`:"—"}</span></td>
                        <td><SourceBadge source={p.source} channel={p.channel}/></td>
                        <td><span className="text-sm font-bold text-green-400">{format(p.amount||0)}</span></td>
                        <td><span className="badge badge-blue capitalize">{p.method||p.paymentMethod||"—"}</span></td>
                        <td><span className="text-xs" style={{color:"var(--text-muted)"}}>{fmtDate(p.createdAt)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                      <td colSpan={4} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{payments.length} payments</span></td>
                      <td className="p-3"><span className="text-sm font-bold text-green-400">{format(totalPayments)}</span></td>
                      <td colSpan={2}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          EXPENSES TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="expenses" && (
        <>
          {/* Category KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Operations","Payroll","Inventory","Other"].map(cat => {
              const catTotal = expenses.filter(e=>cat==="Other"?!["Operations","Payroll","Inventory"].includes(e.category):e.category===cat).reduce((s,e)=>s+(parseFloat(e.amount||0)||0),0);
              return (
                <div key={cat} className="kpi-card">
                  <p className="text-xs font-semibold mb-1" style={{color:"var(--text-muted)"}}>{cat}</p>
                  <p className="text-lg font-bold text-red-400">{format(catTotal)}</p>
                </div>
              );
            })}
          </div>
          {/* P&L Summary */}
          <div className="deji-card p-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{color:"var(--text-muted)"}}>Total Revenue</p>
              <p className="text-xl font-bold text-green-400">{format(totalRevenue)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{color:"var(--text-muted)"}}>Total Expenses</p>
              <p className="text-xl font-bold text-red-400">-{format(totalExpenses)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{color:"var(--text-muted)"}}>Net Profit</p>
              <p className={`text-xl font-bold ${netProfit>=0?"text-green-400":"text-red-400"}`}>{netProfit>=0?"+":""}{format(netProfit)}</p>
            </div>
          </div>
          {/* Expense search + filter */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:"var(--text-muted)"}}/>
              <input value={expenseSearch} onChange={e=>setExpenseSearch(e.target.value)} placeholder="Search description or reference..." className="deji-input pl-9"/>
            </div>
            <select value={expenseCatFilter} onChange={e=>setExpenseCatFilter(e.target.value)} className="deji-input w-auto">
              <option value="all">All Categories</option>
              {EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            {(expenseSearch||expenseCatFilter!=="all") && <button onClick={()=>{setExpenseSearch("");setExpenseCatFilter("all");}} className="btn-secondary text-xs py-1.5 px-3">Clear</button>}
          </div>
          {/* Expense table */}
          <div className="deji-card overflow-hidden">
            {filteredExpenses.length===0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-3">📉</div>
                <p className="mb-4" style={{color:"var(--text-muted)"}}>{expenses.length===0?"No expenses recorded yet.":"No expenses match your filters."}</p>
                {expenses.length===0 && <button onClick={()=>setShowExpenseModal(true)} className="btn-primary flex items-center gap-2 mx-auto"><Plus size={14}/> Add First Expense</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="deji-table w-full">
                  <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Category</th><th>Amount</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredExpenses.map((e,idx) => (
                      <tr key={e.id||idx}>
                        <td><span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{toDay(e.date)||fmtDate(e.date)||"—"}</span></td>
                        <td><p className="text-sm" style={{color:"var(--text-primary)"}}>{e.description}</p>{e.notes&&<p className="text-[10px]" style={{color:"var(--text-muted)"}}>{e.notes}</p>}</td>
                        <td><span className="text-xs font-mono" style={{color:"var(--text-muted)"}}>{e.reference||"—"}</span></td>
                        <td><span className="badge badge-blue text-xs">{e.category||"General"}</span></td>
                        <td><span className="text-sm font-bold text-red-400">-{format(parseFloat(e.amount||0)||0)}</span></td>
                        <td><button onClick={()=>handleDeleteExpense(e.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-red-400" style={{background:"var(--bg-hover)",color:"var(--text-muted)"}}><Trash2 size={12}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{borderTop:"2px solid var(--border)",background:"var(--bg-hover)"}}>
                      <td colSpan={4} className="p-3"><span className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>{filteredExpenses.length} expenses</span></td>
                      <td className="p-3"><span className="text-sm font-bold text-red-400">-{format(filteredExpenses.reduce((s,e)=>s+(parseFloat(e.amount||0)||0),0))}</span></td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PAYMENT PROCESSOR TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="processor" && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-4 rounded-2xl flex items-start gap-3" style={{background:"rgba(99,91,255,0.06)",border:"1px solid rgba(99,91,255,0.2)"}}>
            <CreditCard size={16} style={{color:"#635bff",flexShrink:0,marginTop:2}}/>
            <div>
              <p className="text-sm font-semibold" style={{color:"var(--text-primary)"}}>Accept Online Payments</p>
              <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>Connect a processor so customers can pay invoices via a link you send them.</p>
            </div>
          </div>
          <div className="deji-card p-4">
            <label className="deji-label">Active Processor</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[...PAYMENT_PROCESSORS,{id:"",name:"None — manual only",logo:"🚫",color:"#6b7280"}].map(p => (
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
              <div key={proc.id} className="deji-card p-5" style={{borderColor:isActive?proc.color:undefined}}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{background:`${proc.color}20`}}>{proc.logo}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold" style={{color:"var(--text-primary)"}}>{proc.name}</p>
                        {isActive && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{background:`${proc.color}20`,color:proc.color}}>● ACTIVE</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{color:"var(--text-muted)"}}>{proc.desc}</p>
                    </div>
                  </div>
                  <a href={proc.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs flex-shrink-0" style={{color:"var(--primary)"}}>Docs <ExternalLink size={10}/></a>
                </div>
                <div className="space-y-2">
                  <label className="deji-label">{proc.keyLabel}</label>
                  <div className="flex gap-2">
                    <input type="text" value={key} onChange={e=>setProcessorSettings(prev=>({...prev,[proc.id]:e.target.value}))} className="deji-input flex-1 font-mono text-xs" placeholder={`${proc.keyPrefix}...`}/>
                    {key && <CopyBtn text={key}/>}
                  </div>
                  {key && !key.startsWith(proc.keyPrefix) && <p className="text-xs text-yellow-400">⚠ Should start with `{proc.keyPrefix}`</p>}
                  {key && key.startsWith(proc.keyPrefix)  && <p className="text-xs text-green-400">✓ Key format correct</p>}
                </div>
              </div>
            );
          })}
          <button onClick={saveProcessorSettings} disabled={savingProc} className="btn-primary w-full py-3.5 font-bold flex items-center justify-center gap-2">
            {savingProc?<><RefreshCw size={14} className="animate-spin"/> Saving...</>:procSaved?<><Check size={14}/> Saved!</>:"Save Payment Settings"}
          </button>
          <div className="p-4 rounded-2xl" style={{background:"var(--bg-hover)"}}>
            <p className="text-xs font-bold mb-2" style={{color:"var(--text-muted)"}}>⚙ Webhook URL</p>
            <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{background:"var(--bg-card)",border:"1px solid var(--border))"}}>
              <code className="text-xs flex-1" style={{color:"var(--primary)"}}>{typeof window!=="undefined"?window.location.origin:""}/api/webhooks/payment</code>
              <CopyBtn text={`${typeof window!=="undefined"?window.location.origin:""}/api/webhooks/payment`}/>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          VIEW INVOICE MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {viewInv && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setViewInv(null)}>
          <div className="deji-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{viewInv.invoiceNumber||"Invoice"}</h2>
                  {(viewInv.source||viewInv.channel) && <SourceBadge source={viewInv.source} channel={viewInv.channel}/>}
                  {viewInv.fromOrderId && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{background:"rgba(34,197,94,0.15)",color:"#22c55e"}}>📦 From Order</span>}
                </div>
                <span className={`badge ${STATUS_COLORS[getStatusKey(viewInv)]||"badge-blue"} capitalize mt-1 inline-block`}>{STATUS_ICONS[getStatusKey(viewInv)]} {getStatusKey(viewInv)}</span>
              </div>
              <button onClick={()=>setViewInv(null)} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="deji-label">Customer</p>
                  <p className="font-semibold" style={{color:"var(--text-primary)"}}>{viewInv.contactName||"—"}</p>
                  {viewInv.contactPhone && <p style={{color:"var(--text-muted)"}}>{viewInv.contactPhone}</p>}
                  {viewInv.contactEmail && <p style={{color:"var(--text-muted)"}}>{viewInv.contactEmail}</p>}
                </div>
                <div>
                  <p className="deji-label">Due Date</p>
                  <p style={{color:"var(--text-primary)"}}>{fmtDate(viewInv.dueDate)||"—"}</p>
                  <p className="deji-label mt-2">Created</p>
                  <p style={{color:"var(--text-muted)"}}>{fmtDate(viewInv.createdAt)}</p>
                </div>
              </div>
              {activeProc && ["sent","overdue","partial"].includes(getStatusKey(viewInv)) && (
                <div className="p-3 rounded-xl" style={{background:`${activeProc.color}12`,border:`1px solid ${activeProc.color}30`}}>
                  <p className="text-xs font-bold mb-2" style={{color:activeProc.color}}>💳 Payment Link ({activeProc.name})</p>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{background:"var(--bg-card)"}}>
                    <code className="text-xs flex-1 truncate" style={{color:"var(--primary)"}}>{getPayLink(viewInv)}</code>
                    <CopyBtn text={getPayLink(viewInv)}/>
                  </div>
                </div>
              )}
              {/* Line items */}
              <div className="rounded-xl overflow-hidden" style={{border:"1px solid var(--border))"}}>
                <table className="w-full text-sm">
                  <thead><tr style={{background:"var(--bg-hover)"}}><th className="text-left p-3" style={{color:"var(--text-muted)"}}>Item</th><th className="text-right p-3" style={{color:"var(--text-muted)"}}>Qty</th><th className="text-right p-3" style={{color:"var(--text-muted)"}}>Price</th><th className="text-right p-3" style={{color:"var(--text-muted)"}}>Total</th></tr></thead>
                  <tbody>
                    {(viewInv.items||viewInv.lineItems||[]).map((item,i) => (
                      <tr key={i} style={{borderTop:"1px solid var(--border))"}}>
                        <td className="p-3" style={{color:"var(--text-primary)"}}>{item.description}</td>
                        <td className="p-3 text-right" style={{color:"var(--text-muted)"}}>{item.quantity}</td>
                        <td className="p-3 text-right" style={{color:"var(--text-muted)"}}>{format(item.unitPrice)}</td>
                        <td className="p-3 text-right font-semibold" style={{color:"var(--text-primary)"}}>{format(item.quantity*item.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-3" style={{borderTop:"1px solid var(--border))",background:"var(--bg-hover)"}}><Totals inv={viewInv}/></div>
              </div>
              {viewInv.notes && <div className="p-3 rounded-xl" style={{background:"var(--bg-hover)"}}><p className="deji-label mb-1">Notes</p><p className="text-sm" style={{color:"var(--text-primary)"}}>{viewInv.notes}</p></div>}
              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {getStatusKey(viewInv)==="draft" && <button onClick={()=>{markStatus(viewInv.id,"sent");setViewInv(null);}} className="btn-secondary flex-1 flex items-center justify-center gap-2"><Send size={14}/> Mark Sent</button>}
                {["sent","overdue","partial"].includes(getStatusKey(viewInv)) && <>
                  <button onClick={()=>{markStatus(viewInv.id,"paid");setViewInv(null);}} className="btn-primary flex-1 flex items-center justify-center gap-2"><CheckCircle size={14}/> Mark Paid</button>
                  <button onClick={()=>{recordManualPayment(viewInv);setViewInv(null);}} className="btn-secondary flex items-center gap-2 px-3"><DollarSign size={14}/> Record Payment</button>
                </>}
                {["paid","partial"].includes(getStatusKey(viewInv)) && <button onClick={()=>{setViewInv(null);openRefund(viewInv);}} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm" style={{background:"rgba(249,115,22,0.1)",color:"#f97316"}}><RotateCcw size={14}/> Refund</button>}
                <button onClick={()=>openEdit(viewInv)} className="btn-secondary flex items-center gap-2 px-3"><Edit size={14}/> Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CREATE/EDIT INVOICE MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>{setShowModal(false);setEditInv(null);}}>
          <div className="deji-card p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>{editInv?"Edit Invoice":"New Invoice"}</h2>
              <button onClick={()=>{setShowModal(false);setEditInv(null);}} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <form onSubmit={saveInvoice} className="space-y-4">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="deji-label">Customer Name *</label><input value={form.contactName} onChange={e=>setForm(p=>({...p,contactName:e.target.value}))} className="deji-input" required/></div>
                <div><label className="deji-label">Phone</label><input value={form.contactPhone} onChange={e=>setForm(p=>({...p,contactPhone:e.target.value}))} className="deji-input"/></div>
                <div><label className="deji-label">Email</label><input type="email" value={form.contactEmail} onChange={e=>setForm(p=>({...p,contactEmail:e.target.value}))} className="deji-input"/></div>
                <div>
                  <label className="deji-label">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} className="deji-input"/>
                </div>
                <div>
                  <label className="deji-label">Dispatch Warehouse</label>
                  <select value={form.warehouseId} onChange={e=>setForm(p=>({...p,warehouseId:e.target.value}))} className="deji-input">
                    <option value="">Auto (highest stock)</option>
                    {warehouses.filter(w=>w.isActive!==false).map(w=><option key={w.id} value={w.id}>{w.isDefault?"⚡ ":""}{w.name} · {w.country}</option>)}
                  </select>
                </div>
                <div>
                  <label className="deji-label">Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} className="deji-input">
                    {["draft","sent","paid","partial","overdue","cancelled"].map(s=><option key={s} value={s} className="capitalize">{STATUS_ICONS[s]} {s}</option>)}
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div style={{borderTop:"1px solid var(--border)",paddingTop:"1rem"}}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{color:"var(--text-muted)"}}>📦 Line Items</p>
                  <button type="button" onClick={addItem} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><Plus size={11}/> Add Item</button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item,i) => {
                    const prod2    = item.productObj;
                    const variants = prod2?.variants?.length ? prod2.variants : (prod2?.customFields?.variants||[]);
                    const hasVariants = variants.length > 0;
                    const totalStock  = prod2 ? (variants.length ? variants.reduce((s,v)=>s+(Number(v.stock)||0),0) : (prod2.stock||0)) : 0;
                    const qty = Number(item.quantity)||0;
                    return (
                      <div key={i} className="p-3 rounded-xl space-y-2" style={{background:"var(--bg-hover)",border:"1px solid var(--border)"}}>
                        <div className="flex items-center gap-2">
                          <select value={item.productId||""} onChange={e=>pickProduct(i,e.target.value)} className="deji-input text-xs flex-1">
                            <option value="">— Pick from inventory (optional) —</option>
                            {inventory.filter(p=>p.isActive!==false).map(p=>{
                              const vs = p.variants?.length?p.variants:(p.customFields?.variants||[]);
                              const stock = vs.length?vs.reduce((s,v)=>s+(Number(v.stock)||0),0):(p.stock||0);
                              return <option key={p.id} value={p.id} disabled={stock<=0}>{p.name}{p.sku?` (${p.sku})`:""} · ₦{Number(p.price||p.sellingPrice||0).toLocaleString()} · {stock} in stock{stock<=0?" [Out]":""}</option>;
                            })}
                          </select>
                          {form.items.length>1 && <button type="button" onClick={()=>removeItem(i)} className="text-red-400 flex-shrink-0"><X size={13}/></button>}
                        </div>
                        {item.productId && hasVariants && (
                          <div>
                            <label className="deji-label text-[10px]">Variant</label>
                            <select value={item.variantIdx??""} onChange={e=>pickVariant(i,e.target.value)} className="deji-input text-sm w-full">
                              <option value="">— Select variant —</option>
                              {variants.map((v,vi)=><option key={v.id||vi} value={vi}>{v.name}{(v.sellingPrice||v.price)?` · ₦${Number(v.sellingPrice||v.price||0).toLocaleString()}`:""}  {v.stock!=null?` · ${v.stock} in stock`:""}</option>)}
                            </select>
                          </div>
                        )}
                        {item.productId && (
                          <div>
                            <label className="deji-label text-[10px]">Dispatch Warehouse (overrides invoice-level)</label>
                            <select value={item.warehouseId||""} onChange={e=>updateItem(i,"warehouseId",e.target.value)} className="deji-input text-xs">
                              <option value="">Use invoice warehouse</option>
                              {warehouses.filter(w=>w.isActive!==false).map(w=>{
                                const ws=(w.warehouseStocks||[]).find(s=>s.productId===item.productId);
                                const wqty=ws?.quantity??0;
                                return <option key={w.id} value={w.id} disabled={wqty<=0}>{w.isDefault?"⚡ ":""}{w.name} · {wqty} units{wqty<=0?" [Out]":""}</option>;
                              })}
                            </select>
                          </div>
                        )}
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-6"><input value={item.description} onChange={e=>updateItem(i,"description",e.target.value)} className="deji-input text-sm" placeholder="Item description" required/></div>
                          <div className="col-span-2"><input type="number" min="1" value={item.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)} className="deji-input text-sm text-center" placeholder="Qty"/></div>
                          <div className="col-span-4"><input type="number" value={item.unitPrice} onChange={e=>updateItem(i,"unitPrice",e.target.value)} className="deji-input text-sm" placeholder="Unit price"/></div>
                        </div>
                        {prod2 && qty > 0 && (
                          <p className={`text-[10px] ${qty>totalStock?"text-red-400":"text-green-400"}`}>
                            {qty>totalStock?`⚠ Only ${totalStock} units available`:`✓ ${totalStock} in stock — deducting ${qty}`}
                          </p>
                        )}
                        {item.quantity && item.unitPrice && (
                          <p className="text-xs text-right font-semibold" style={{color:"var(--primary)"}}>
                            Line: {format(Number(item.quantity)*Number(item.unitPrice))}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 p-3 rounded-xl" style={{background:"var(--bg-hover)"}}><Totals inv={form}/></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="deji-label">Discount</label><input type="number" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} className="deji-input" placeholder="0"/></div>
                <div><label className="deji-label">Discount Type</label><select value={form.discountType} onChange={e=>setForm(p=>({...p,discountType:e.target.value}))} className="deji-input"><option value="fixed">Fixed (₦)</option><option value="percent">Percent (%)</option></select></div>
              </div>
              <div><label className="deji-label">Notes</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} className="deji-input resize-none" rows={2}/></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>{setShowModal(false);setEditInv(null);}} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?"Saving...":editInv?"Update Invoice":"Create Invoice"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          REFUND MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {showRefund && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowRefund(null)}>
          <div className="deji-card p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Process Refund / Return</h2><p className="text-xs" style={{color:"var(--text-muted)"}}>{showRefund.invoiceNumber} · {showRefund.contactName}</p></div>
              <button onClick={()=>setShowRefund(null)} style={{color:"var(--text-muted)"}}><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-xl" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}><p className="text-xs text-red-400 font-semibold mb-1">⚠ This will cancel the invoice and restock returned items</p><p className="text-xs" style={{color:"var(--text-muted)"}}>Invoice total: {format(calcInvoice(showRefund).total)}</p></div>
              <div><label className="deji-label">Refund Reason *</label><input value={refundForm.reason} onChange={e=>setRefundForm(p=>({...p,reason:e.target.value}))} className="deji-input" placeholder="e.g. Customer return, wrong item, damaged goods..."/></div>
              <div>
                <label className="deji-label">Restock to Warehouse</label>
                <select value={refundForm.restockWarehouseId} onChange={e=>setRefundForm(p=>({...p,restockWarehouseId:e.target.value}))} className="deji-input">
                  <option value="">Don't restock inventory</option>
                  {warehouses.filter(w=>w.isActive!==false).map(w=><option key={w.id} value={w.id}>{w.isDefault?"⚡ ":""}{w.name} · {w.country}</option>)}
                </select>
                <p className="text-[10px] mt-1" style={{color:"var(--text-muted)"}}>Product quantities will be added back to this warehouse</p>
              </div>
              <div>
                <label className="deji-label">Items to Refund</label>
                <div className="space-y-2 mt-1">
                  {refundForm.items.map((item,i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{background:"var(--bg-hover)"}}>
                      <input type="checkbox" checked={item.selected} onChange={e=>setRefundForm(p=>({...p,items:p.items.map((it,j)=>j===i?{...it,selected:e.target.checked}:it)}))} className="accent-green-500 w-4 h-4 flex-shrink-0"/>
                      <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate" style={{color:"var(--text-primary)"}}>{item.description}</p><p className="text-xs" style={{color:"var(--text-muted)"}}>{format(item.unitPrice||0)} × {item.quantity}</p>{!item.productId&&<p className="text-[10px] text-orange-400">No product linked — stock won't update</p>}</div>
                      <div className="flex-shrink-0"><label className="text-[10px]" style={{color:"var(--text-muted)"}}>Qty</label><input type="number" min="1" max={item.quantity} value={item.quantity} onChange={e=>setRefundForm(p=>({...p,items:p.items.map((it,j)=>j===i?{...it,quantity:e.target.value}:it)}))} className="deji-input text-sm w-16 text-center mt-0.5"/></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 rounded-xl flex items-center justify-between" style={{background:"var(--bg-hover)"}}><span className="text-sm" style={{color:"var(--text-muted)"}}>Refund Total</span><span className="text-base font-bold text-orange-400">{format(refundForm.items.filter(i=>i.selected).reduce((s,i)=>s+Number(i.unitPrice||0)*Number(i.quantity||0),0))}</span></div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setShowRefund(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={submitRefund} disabled={savingRefund||!refundForm.reason.trim()} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2" style={{background:"#ef4444",opacity:(!refundForm.reason.trim()||savingRefund)?0.6:1}}>
                  {savingRefund?<><RefreshCw size={13} className="animate-spin"/> Processing...</>:<><RotateCcw size={13}/> Process Refund</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ADD EXPENSE MODAL
          ═══════════════════════════════════════════════════════════════════ */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={()=>setShowExpenseModal(false)}>
          <div className="deji-card p-6 w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold" style={{fontFamily:"Playfair Display,serif",color:"var(--text-primary)"}}>Record Expense</h2><button onClick={()=>setShowExpenseModal(false)} style={{color:"var(--text-muted)"}}><X size={18}/></button></div>
            <form onSubmit={saveExpense} className="space-y-4">
              <div><label className="deji-label">Description *</label><input value={expenseForm.description} onChange={e=>setExpenseForm(p=>({...p,description:e.target.value}))} className="deji-input" placeholder="e.g. Office rent, Generator fuel..." required/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="deji-label">Amount *</label><input type="number" min="1" value={expenseForm.amount} onChange={e=>setExpenseForm(p=>({...p,amount:e.target.value}))} className="deji-input" placeholder="0" required/></div>
                <div><label className="deji-label">Category *</label><select value={expenseForm.category} onChange={e=>setExpenseForm(p=>({...p,category:e.target.value}))} className="deji-input">{EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
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