"use client";
import { useState, useRef, useEffect } from "react";
import {
  Plus, X, Copy, Check, Loader, Sparkles, Upload,
  Globe, ExternalLink, Zap, ShoppingCart, Calendar,
  Phone, ChevronUp, ChevronDown, Eye, Settings,
} from "lucide-react";
import api from "@/lib/api";

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: "ecommerce", name: "E-Commerce Store", emoji: "🛒", color: "#22c55e",
    desc: "Products, cart, checkout — connected to Deji Inventory & POS",
    sections: ["hero","products","features","testimonials","contact","footer"],
  },
  {
    id: "realestate", name: "Real Estate", emoji: "🏠", color: "#3b82f6",
    desc: "Property listings, showcase, contact agent — leads go to CRM",
    sections: ["hero","listings","about","testimonials","contact","footer"],
  },
  {
    id: "restaurant", name: "Restaurant / Food", emoji: "🍽️", color: "#f97316",
    desc: "Menu sections, reservation form, order — connected to POS",
    sections: ["hero","menu","about","reservation","testimonials","footer"],
  },
  {
    id: "service", name: "Service Business", emoji: "💼", color: "#6366f1",
    desc: "Services, about, book a call, contact — all leads to CRM",
    sections: ["hero","services","about","booking","testimonials","contact","footer"],
  },
];

// ─── Default content per template ─────────────────────────────────────────────
const TEMPLATE_DEFAULTS = {
  ecommerce: {
    businessName: "", tagline: "Shop Premium Products Online",
    description: "Discover our curated collection of quality products.",
    primaryColor: "#22c55e", ctaText: "Shop Now",
    whatsapp: "", logoUrl: "", footerText: "All rights reserved.",
    products: [
      { name: "Premium Item 1", price: "15000", description: "High quality product", image: "" },
      { name: "Premium Item 2", price: "25000", description: "Best seller",         image: "" },
      { name: "Premium Item 3", price: "35000", description: "Limited edition",     image: "" },
    ],
    testimonials: [{ name: "Chioma A.", text: "Amazing quality! Fast delivery.", rating: 5 }],
    features: ["Free Delivery on Orders Above ₦10,000", "Secure Payment", "7-Day Returns"],
    dejiConnect: { contactToLead: true, productFromInventory: true, checkoutToPOS: true, bookingToCRM: false },
  },
  realestate: {
    businessName: "", tagline: "Find Your Dream Property",
    description: "We help you find the perfect home, office or investment property.",
    primaryColor: "#3b82f6", ctaText: "View Listings",
    whatsapp: "", logoUrl: "", footerText: "All rights reserved.",
    listings: [
      { title: "3 Bedroom Apartment", location: "Lekki, Lagos",  price: "45,000,000", type: "For Sale",  beds: 3, baths: 2 },
      { title: "Office Space",         location: "VI, Lagos",     price: "800,000/yr",  type: "For Rent",  beds: 0, baths: 2 },
      { title: "4 Bedroom Duplex",     location: "Ikoyi, Lagos",  price: "85,000,000", type: "For Sale",  beds: 4, baths: 3 },
    ],
    testimonials: [{ name: "Emeka O.", text: "Found my dream home in 2 weeks!", rating: 5 }],
    features: ["Verified Listings", "Expert Agents", "Virtual Tours Available"],
    dejiConnect: { contactToLead: true, productFromInventory: false, checkoutToPOS: false, bookingToCRM: true },
  },
  restaurant: {
    businessName: "", tagline: "Taste the Difference",
    description: "Fresh ingredients, authentic recipes, delivered to your door.",
    primaryColor: "#f97316", ctaText: "Order Now",
    whatsapp: "", logoUrl: "", footerText: "All rights reserved.",
    menuItems: [
      { name: "Jollof Rice Special", price: "3500",  category: "Main",    description: "Party-style with chicken" },
      { name: "Pepper Soup",         price: "4500",  category: "Starter", description: "Spicy assorted meat" },
      { name: "Chapman Cocktail",    price: "1500",  category: "Drinks",  description: "Chilled and refreshing" },
      { name: "Fried Plantain",      price: "1000",  category: "Sides",   description: "Crispy dodo" },
    ],
    testimonials: [{ name: "Adaeze B.", text: "Best jollof in Lagos, no cap!", rating: 5 }],
    features: ["Fresh Daily", "Fast Delivery", "Catering Available"],
    dejiConnect: { contactToLead: true, productFromInventory: false, checkoutToPOS: true, bookingToCRM: true },
  },
  service: {
    businessName: "", tagline: "Professional Services You Can Trust",
    description: "We deliver exceptional results for every client.",
    primaryColor: "#6366f1", ctaText: "Book a Call",
    whatsapp: "", logoUrl: "", footerText: "All rights reserved.",
    services: [
      { name: "Consultation",    price: "25,000", description: "1-hour expert session",      icon: "💬" },
      { name: "Full Package",    price: "150,000", description: "End-to-end service delivery", icon: "🚀" },
      { name: "Monthly Retainer",price: "80,000", description: "Ongoing support & management",icon: "🔄" },
    ],
    testimonials: [{ name: "Bola F.", text: "Transformed our business completely.", rating: 5 }],
    features: ["Certified Experts", "100% Satisfaction Guarantee", "Fast Turnaround"],
    dejiConnect: { contactToLead: true, productFromInventory: false, checkoutToPOS: false, bookingToCRM: true },
  },
};

// ─── Preview Component ─────────────────────────────────────────────────────────
function Preview({ content, template }) {
  const col  = content.primaryColor || template?.color || "#22c55e";
  const col2 = col + "22";
  const tid  = template?.id || "service";

  const NavBar = () => (
    <nav style={{ background: col, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {content.logoUrl && (
          <img src={content.logoUrl} alt="logo" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 8, background: "#fff" }}/>
        )}
        <span style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>
          {content.businessName || "Your Business"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {["Home","About","Contact"].map(l => (
          <span key={l} style={{ color: "#ffffffcc", fontSize: 12, cursor: "pointer" }}>{l}</span>
        ))}
        <span style={{ background: "#fff", color: col, padding: "6px 16px", borderRadius: 999, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
          {content.ctaText || "Get Started"}
        </span>
      </div>
    </nav>
  );

  const Hero = () => (
    <div style={{ background: `linear-gradient(135deg, ${col}15 0%, #fff 60%)`, padding: "60px 32px", textAlign: "center" }}>
      <div style={{ display: "inline-block", background: col + "20", color: col, padding: "4px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, marginBottom: 16 }}>
        ✦ Welcome to {content.businessName || "Our Business"}
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: "#111", marginBottom: 16, lineHeight: 1.2, maxWidth: 500, margin: "0 auto 16px" }}>
        {content.tagline || "Your Tagline Here"}
      </h1>
      <p style={{ color: "#666", fontSize: 14, maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.6 }}>
        {content.description || "Describe what makes your business special."}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <span style={{ background: col, color: "#fff", padding: "13px 28px", borderRadius: 999, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 20px ${col}40` }}>
          {content.ctaText || "Get Started"}
        </span>
        <span style={{ background: "#fff", color: col, padding: "13px 28px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer", border: `2px solid ${col}` }}>
          Learn More
        </span>
      </div>
      {(content.features || []).length > 0 && (
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          {content.features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#555" }}>
              <span style={{ color: col, fontWeight: 700 }}>✓</span> {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const DejiTag = ({ label, icon }) => (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#0a1f12", color: "#22c55e", padding: "3px 10px", borderRadius: 999, fontSize: 9, fontWeight: 700, border: "1px solid #22c55e33", marginBottom: 8 }}>
      <span>{icon}</span> {label}
    </div>
  );

  // E-Commerce Preview
  if (tid === "ecommerce") return (
    <div className="w-full h-full overflow-y-auto bg-white text-gray-900 text-sm">
      <NavBar/>
      <Hero/>
      <div style={{ padding: "40px 24px", background: "#fafafa" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <DejiTag label="Connected to Deji Inventory" icon="⚡"/>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Our Products</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
          {(content.products || []).filter(p => p.name).map((p, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px #0001" }}>
              <div style={{ height: 120, background: col2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🛍️</div>
              <div style={{ padding: 12 }}>
                <p style={{ fontWeight: 700, color: "#111", marginBottom: 4, fontSize: 13 }}>{p.name}</p>
                <p style={{ color: "#888", fontSize: 10, marginBottom: 8 }}>{p.description}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontWeight: 800, color: col, fontSize: 14 }}>₦{Number(p.price || 0).toLocaleString()}</p>
                  <span style={{ background: col, color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Add to Cart</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ContactSection col={col} label="Contact Form → Deji CRM Lead"/>
      <TestimonialsSection testimonials={content.testimonials} col={col}/>
      <Footer content={content} col={col}/>
    </div>
  );

  // Real Estate Preview
  if (tid === "realestate") return (
    <div className="w-full h-full overflow-y-auto bg-white text-gray-900 text-sm">
      <NavBar/>
      <Hero/>
      <div style={{ padding: "40px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <DejiTag label="Contact Agent → Deji CRM Lead" icon="⚡"/>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Featured Listings</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
          {(content.listings || []).map((l, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 16px #0001", border: "1px solid #eee" }}>
              <div style={{ height: 140, background: col2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, position: "relative" }}>
                🏠
                <span style={{ position: "absolute", top: 10, left: 10, background: col, color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 9, fontWeight: 700 }}>{l.type}</span>
              </div>
              <div style={{ padding: 14 }}>
                <p style={{ fontWeight: 800, color: "#111", marginBottom: 4 }}>{l.title}</p>
                <p style={{ color: "#888", fontSize: 11, marginBottom: 8 }}>📍 {l.location}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontWeight: 800, color: col, fontSize: 13 }}>₦{l.price}</p>
                  <div style={{ fontSize: 10, color: "#888" }}>{l.beds > 0 ? `${l.beds}bed · ` : ""}{l.baths}bath</div>
                </div>
                <button style={{ width: "100%", marginTop: 10, background: col, color: "#fff", border: "none", padding: "7px 0", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Contact Agent</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ContactSection col={col} label="Contact Form → Deji CRM Lead"/>
      <TestimonialsSection testimonials={content.testimonials} col={col}/>
      <Footer content={content} col={col}/>
    </div>
  );

  // Restaurant Preview
  if (tid === "restaurant") return (
    <div className="w-full h-full overflow-y-auto bg-white text-gray-900 text-sm">
      <NavBar/>
      <Hero/>
      <div style={{ padding: "40px 24px", background: "#fafafa" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <DejiTag label="Order → Deji POS" icon="⚡"/>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Our Menu</h2>
        </div>
        {["Main","Starter","Drinks","Sides"].map(cat => {
          const items = (content.menuItems || []).filter(m => m.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat} style={{ marginBottom: 24 }}>
              <p style={{ fontWeight: 700, color: col, marginBottom: 12, fontSize: 13, textTransform: "uppercase", letterSpacing: 1 }}>{cat}</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
                {items.map((m, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 8px #0001" }}>
                    <div>
                      <p style={{ fontWeight: 700, color: "#111", fontSize: 13 }}>{m.name}</p>
                      <p style={{ color: "#888", fontSize: 10 }}>{m.description}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <p style={{ fontWeight: 800, color: col, fontSize: 14 }}>₦{Number(m.price || 0).toLocaleString()}</p>
                      <span style={{ background: col, color: "#fff", padding: "3px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Order</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ReservationSection col={col}/>
      <TestimonialsSection testimonials={content.testimonials} col={col}/>
      <Footer content={content} col={col}/>
    </div>
  );

  // Service Business Preview
  return (
    <div className="w-full h-full overflow-y-auto bg-white text-gray-900 text-sm">
      <NavBar/>
      <Hero/>
      <div style={{ padding: "40px 24px", background: "#fafafa" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111" }}>Our Services</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
          {(content.services || []).map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 20, textAlign: "center", boxShadow: "0 2px 16px #0001", border: `1px solid ${col}22` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon || "⚡"}</div>
              <p style={{ fontWeight: 800, color: "#111", marginBottom: 8 }}>{s.name}</p>
              <p style={{ color: "#888", fontSize: 11, marginBottom: 12 }}>{s.description}</p>
              <p style={{ fontWeight: 800, color: col, fontSize: 15, marginBottom: 12 }}>₦{s.price}</p>
              <button style={{ background: col, color: "#fff", border: "none", padding: "8px 20px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Book Now</button>
            </div>
          ))}
        </div>
      </div>
      <BookingSection col={col}/>
      <ContactSection col={col} label="Contact Form → Deji CRM Lead"/>
      <TestimonialsSection testimonials={content.testimonials} col={col}/>
      <Footer content={content} col={col}/>
    </div>
  );
}

function ContactSection({ col, label }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#0a1f12", color: "#22c55e", padding: "3px 10px", borderRadius: 999, fontSize: 9, fontWeight: 700, border: "1px solid #22c55e33", marginBottom: 12 }}>
        ⚡ {label}
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>Get in Touch</h2>
      <div style={{ maxWidth: 360, margin: "0 auto", textAlign: "left" }}>
        {["Your Name","Phone Number","Email Address"].map(p => (
          <input key={p} placeholder={p} readOnly style={{ display: "block", width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 10, fontSize: 13, boxSizing: "border-box", background: "#fafafa" }}/>
        ))}
        <button style={{ display: "block", width: "100%", background: col, color: "#fff", border: "none", padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${col}40` }}>
          Send Message
        </button>
      </div>
    </div>
  );
}

function BookingSection({ col }) {
  return (
    <div style={{ padding: "40px 24px", background: "#f9fafb", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#0a1f12", color: "#22c55e", padding: "3px 10px", borderRadius: 999, fontSize: 9, fontWeight: 700, border: "1px solid #22c55e33", marginBottom: 12 }}>
        ⚡ Booking → Deji CRM Appointment
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>Book a Call</h2>
      <div style={{ maxWidth: 360, margin: "0 auto", textAlign: "left" }}>
        {["Your Name","Phone Number","Preferred Date"].map(p => (
          <input key={p} placeholder={p} readOnly style={{ display: "block", width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 10, fontSize: 13, boxSizing: "border-box", background: "#fff" }}/>
        ))}
        <button style={{ display: "block", width: "100%", background: col, color: "#fff", border: "none", padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          📅 Book Free Call
        </button>
      </div>
    </div>
  );
}

function ReservationSection({ col }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#0a1f12", color: "#22c55e", padding: "3px 10px", borderRadius: 999, fontSize: 9, fontWeight: 700, border: "1px solid #22c55e33", marginBottom: 12 }}>
        ⚡ Reservation → Deji CRM
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 20 }}>Make a Reservation</h2>
      <div style={{ maxWidth: 360, margin: "0 auto", textAlign: "left" }}>
        {["Your Name","Phone Number","Date & Time","Number of Guests"].map(p => (
          <input key={p} placeholder={p} readOnly style={{ display: "block", width: "100%", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 10, fontSize: 13, boxSizing: "border-box", background: "#fafafa" }}/>
        ))}
        <button style={{ display: "block", width: "100%", background: col, color: "#fff", border: "none", padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Reserve Table
        </button>
      </div>
    </div>
  );
}

function TestimonialsSection({ testimonials, col }) {
  const items = (testimonials || []).filter(t => t.name);
  if (!items.length) return null;
  return (
    <div style={{ padding: "40px 24px", background: "#f9fafb" }}>
      <h2 style={{ textAlign: "center", fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 24 }}>What Clients Say</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        {items.map((t, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 2px 12px #0001" }}>
            <p style={{ color: "#f97316", marginBottom: 8, fontSize: 16 }}>{"⭐".repeat(t.rating || 5)}</p>
            <p style={{ color: "#555", fontSize: 13, marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>"{t.text}"</p>
            <p style={{ fontWeight: 700, color: "#111", fontSize: 12 }}>— {t.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer({ content, col }) {
  return (
    <div style={{ background: "#111", color: "#aaa", padding: "24px", textAlign: "center", fontSize: 12 }}>
      <p style={{ color: "#fff", fontWeight: 700, marginBottom: 8 }}>{content.businessName || "Your Business"}</p>
      {content.whatsapp && (
        <p style={{ marginBottom: 8 }}>📱 WhatsApp: +{content.whatsapp}</p>
      )}
      <p>© {new Date().getFullYear()} {content.businessName || "Your Business"}. {content.footerText || "Powered by Deji."}</p>
    </div>
  );
}

// ─── Main Builder ──────────────────────────────────────────────────────────────
export default function WebsiteBuilderPage() {
  const [step, setStep]         = useState("select");
  const [sel, setSel]           = useState(null);
  const [editTab, setEditTab]   = useState("ai");
  const [content, setContent]   = useState({});
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [published, setPublished] = useState(null);
  const [copied, setCopied]     = useState(false);
  const [previewMode, setPreviewMode] = useState("desktop");
  const logoRef = useRef();

  const upd = (key) => (e) => setContent(p => ({ ...p, [key]: e.target.value }));

  const selectTemplate = (t) => {
    setSel(t);
    setContent({ ...TEMPLATE_DEFAULTS[t.id] });
    setStep("build");
  };

  // ── AI Generation ────────────────────────────────────────────────────────────
  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const templateId = sel?.id || "service";
      const extraFields = {
        ecommerce:  "products (array of 3: name, price as number, description), features (array of 3 strings)",
        realestate: "listings (array of 3: title, location, price as string, type as 'For Sale' or 'For Rent', beds as number, baths as number), features (array of 3 strings)",
        restaurant: "menuItems (array of 4: name, price as number, category as 'Main'|'Starter'|'Drinks'|'Sides', description), features (array of 3 strings)",
        service:    "services (array of 3: name, price as string, description, icon as emoji), features (array of 3 strings)",
      }[templateId] || "features (array of 3 strings)";

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `You are a professional website copywriter. Return ONLY valid JSON with NO markdown, NO backticks, NO explanation.
Template type: ${templateId}
Business: "${aiPrompt}"

Return JSON with: businessName, tagline, description, ctaText, footerText, whatsapp (empty string), ${extraFields}, testimonials (array of 2: name, text, rating as number 1-5).

Make it professional, compelling, and specific to the business described. Use Nigerian Naira (₦) for prices if prices are given or infer realistic prices.`,
          }],
        }),
      });
      const data = await res.json();
      const text  = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const defaults = TEMPLATE_DEFAULTS[sel?.id || "service"];
      setContent(p => ({
        ...defaults,
        ...p,
        ...parsed,
        primaryColor: p.primaryColor || defaults.primaryColor,
        dejiConnect:  defaults.dejiConnect,
      }));
      setEditTab("manual");
    } catch(e) {
      console.error(e);
      alert("AI generation failed — please fill in manually.");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Publish ──────────────────────────────────────────────────────────────────
  const publish = async () => {
    if (!content.businessName) return alert("Enter your business name first");
    setSaving(true);
    try {
      const slug = content.businessName.toLowerCase()
        .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now().toString(36);
      const API = process.env.NEXT_PUBLIC_API_URL || "";
      try {
        await fetch(`${API}/api/website/sites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({ slug, content, template: sel?.id || "service" }),
        });
      } catch {}
      const url = `${window.location.origin}/store/${slug}`;
      setPublished({ url, slug });
      setStep("published");
    } finally { setSaving(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(published?.url || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Published screen ─────────────────────────────────────────────────────────
  if (step === "published") return (
    <div className="max-w-lg mx-auto animate-fade-up space-y-4 pt-8">
      <div className="deji-card p-8 text-center space-y-4">
        <div className="text-6xl">🎉</div>
        <div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily:"Playfair Display,serif", color:"var(--text-primary)" }}>
            Your site is live!
          </h2>
          <p className="text-sm" style={{ color:"var(--text-muted)" }}>
            Share this link with customers. All forms and actions are connected to Deji.
          </p>
        </div>

        <div className="p-4 rounded-2xl space-y-2" style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)" }}>
          <p className="text-xs font-bold" style={{ color:"#22c55e" }}>⚡ Deji Connections Active</p>
          {Object.entries(content.dejiConnect || {}).filter(([,v]) => v).map(([k]) => (
            <p key={k} className="text-xs" style={{ color:"var(--text-muted)" }}>
              ✓ {k === "contactToLead" ? "Contact form → CRM Lead"
                : k === "productFromInventory" ? "Products → Deji Inventory"
                : k === "checkoutToPOS" ? "Checkout → Deji POS"
                : "Booking → CRM Appointment"}
            </p>
          ))}
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background:"var(--bg-hover)" }}>
          <Globe size={14} style={{ color:"var(--primary)", flexShrink:0 }}/>
          <span className="text-xs flex-1 font-mono truncate" style={{ color:"var(--text-primary)" }}>
            {published?.url}
          </span>
          <button onClick={copy}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
            style={{ background:"var(--primary)", color:"#fff" }}>
            {copied ? <><Check size={10}/> Copied!</> : <><Copy size={10}/> Copy</>}
          </button>
          <a href={published?.url} target="_blank" rel="noreferrer" style={{ color:"var(--text-muted)" }}>
            <ExternalLink size={14}/>
          </a>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setStep("select"); setSel(null); setContent({}); setPublished(null); }}
            className="btn-secondary flex-1">New Site</button>
          <button onClick={() => setStep("build")} className="btn-primary flex-1">Edit Site</button>
        </div>
      </div>
    </div>
  );

  // ── Template selection ────────────────────────────────────────────────────────
  if (step === "select") return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title">Website Builder</h1>
        <p className="page-subtitle">
          Choose a template — AI generates your content, then edit and publish
        </p>
      </div>

      <div className="p-4 rounded-2xl flex items-start gap-3"
        style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)" }}>
        <Zap size={16} style={{ color:"#22c55e", flexShrink:0, marginTop:2 }}/>
        <div>
          <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>
            Every website is connected to Deji
          </p>
          <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
            Contact forms → CRM leads · Products → Inventory · Checkout → POS · Booking → CRM appointment. All automatic.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEMPLATES.map(t => (
          <button key={t.id} onClick={() => selectTemplate(t)}
            className="deji-card p-6 text-left transition-all hover:scale-[1.02] group">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: t.color + "22" }}>
                {t.emoji}
              </div>
              <div className="flex-1">
                <p className="font-bold text-base mb-1" style={{ color:"var(--text-primary)" }}>{t.name}</p>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>{t.desc}</p>
                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {t.sections.slice(0,4).map(s => (
                    <span key={s} className="text-[9px] px-2 py-0.5 rounded-full font-semibold capitalize"
                      style={{ background: t.color + "22", color: t.color }}>
                      {s}
                    </span>
                  ))}
                  {t.sections.length > 4 && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background:"var(--bg-hover)", color:"var(--text-muted)" }}>
                      +{t.sections.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 h-0.5 rounded-full w-0 group-hover:w-full transition-all duration-300"
              style={{ background: t.color }}/>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Builder ───────────────────────────────────────────────────────────────────
  const tid = sel?.id || "service";

  return (
    <div className="flex gap-4 animate-fade-up" style={{ height:"calc(100vh - 5rem)" }}>

      {/* ── Left Panel ── */}
      <div className="w-96 flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
        style={{ border:"1px solid var(--border)" }}>

        {/* Panel header */}
        <div className="p-4 flex-shrink-0"
          style={{ background:"var(--bg-surface)", borderBottom:"1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{sel?.emoji}</span>
              <h2 className="font-bold text-sm" style={{ color:"var(--text-primary)" }}>{sel?.name}</h2>
            </div>
            <button onClick={() => setStep("select")} className="text-xs"
              style={{ color:"var(--text-muted)" }}>← Templates</button>
          </div>
          <div className="flex gap-2">
            {[
              { k:"ai",     label:"✨ AI Generate" },
              { k:"manual", label:"✏️ Edit Content" },
              { k:"connect",label:"⚡ Deji Links" },
            ].map(t => (
              <button key={t.k} onClick={() => setEditTab(t.k)}
                className="flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition-all"
                style={{
                  background:  editTab === t.k ? "var(--primary)" : "transparent",
                  color:       editTab === t.k ? "#fff" : "var(--text-muted)",
                  borderColor: editTab === t.k ? "var(--primary)" : "var(--border)",
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{ background:"var(--bg-surface)" }}>

          {/* AI Tab */}
          {editTab === "ai" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl"
                style={{ background:"var(--primary-dim)", border:"1px solid var(--primary)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color:"var(--primary)" }}>
                  ✨ AI Website Generator
                </p>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                  Describe your business in plain English. AI will write your entire website — business name, tagline, services, testimonials, and more.
                </p>
              </div>
              <label className="deji-label">Describe your business</label>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                rows={5} className="deji-input resize-none"
                placeholder={`e.g. I run a luxury hair salon in Abuja called Glam Studio. We specialise in knotless braids, silk press, and hair treatments. Our target clients are professional women aged 25-45. We're known for our relaxing experience and premium products.`}/>
              <button onClick={generateWithAI}
                disabled={aiLoading || !aiPrompt.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                {aiLoading
                  ? <><Loader size={14} className="animate-spin"/> Generating your website...</>
                  : <><Sparkles size={14}/> Generate Full Website</>}
              </button>
              {aiLoading && (
                <p className="text-xs text-center" style={{ color:"var(--text-muted)" }}>
                  AI is writing your content... this takes about 10 seconds ✨
                </p>
              )}
            </div>
          )}

          {/* Manual Edit Tab */}
          {editTab === "manual" && (
            <div className="space-y-4">
              {/* Logo */}
              <div>
                <label className="deji-label">Business Logo</label>
                <div className="flex items-center gap-3">
                  {content.logoUrl ? (
                    <div className="relative">
                      <img src={content.logoUrl} alt="logo"
                        className="w-14 h-14 rounded-xl object-contain"
                        style={{ background:"var(--bg-hover)", border:"1px solid var(--border)" }}/>
                      <button onClick={() => setContent(p => ({...p, logoUrl:""}))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center">
                        <X size={8}/>
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer"
                      style={{ borderColor:"var(--border)", color:"var(--text-muted)" }}
                      onClick={() => logoRef.current?.click()}>
                      <Upload size={14}/>
                    </div>
                  )}
                  <button onClick={() => logoRef.current?.click()}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                    <Upload size={11}/> Upload Logo
                  </button>
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = ev => setContent(p => ({...p, logoUrl: ev.target.result}));
                    r.readAsDataURL(f);
                  }}/>
              </div>

              {/* Basic */}
              <div><label className="deji-label">Business Name</label>
                <input value={content.businessName || ""} onChange={upd("businessName")} className="deji-input" placeholder="Eko Kicks"/></div>
              <div><label className="deji-label">Tagline</label>
                <input value={content.tagline || ""} onChange={upd("tagline")} className="deji-input" placeholder="Quality You Can Feel"/></div>
              <div><label className="deji-label">Description</label>
                <textarea value={content.description || ""} onChange={upd("description")} rows={3} className="deji-input resize-none" placeholder="What makes your business special..."/></div>
              <div><label className="deji-label">CTA Button Text</label>
                <input value={content.ctaText || ""} onChange={upd("ctaText")} className="deji-input" placeholder="Shop Now"/></div>
              <div><label className="deji-label">WhatsApp Number</label>
                <input value={content.whatsapp || ""} onChange={upd("whatsapp")} className="deji-input" placeholder="2348012345678"/></div>

              {/* Brand color */}
              <div>
                <label className="deji-label">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={content.primaryColor || "#22c55e"} onChange={upd("primaryColor")}
                    className="w-10 h-10 rounded-xl border cursor-pointer" style={{ borderColor:"var(--border)" }}/>
                  <input value={content.primaryColor || ""} onChange={upd("primaryColor")}
                    className="deji-input flex-1 font-mono" placeholder="#22c55e"/>
                </div>
              </div>

              {/* Template-specific fields */}
              {tid === "ecommerce" && (
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Products</p>
                    <button onClick={() => setContent(p => ({...p, products:[...(p.products||[]),{name:"",price:"",description:""}]}))}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ color:"var(--primary)", background:"var(--primary-dim)" }}>
                      <Plus size={10}/> Add
                    </button>
                  </div>
                  {(content.products || []).map((p, i) => (
                    <div key={i} className="p-3 rounded-xl mb-2 space-y-2" style={{ background:"var(--bg-hover)" }}>
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold" style={{ color:"var(--text-muted)" }}>Product {i+1}</p>
                        {i > 0 && <button onClick={() => setContent(prev => ({...prev, products: prev.products.filter((_,j)=>j!==i)}))} className="text-red-400"><X size={12}/></button>}
                      </div>
                      <input value={p.name} onChange={e => setContent(prev => ({...prev, products: prev.products.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Product name"/>
                      <input value={p.price} onChange={e => setContent(prev => ({...prev, products: prev.products.map((x,j)=>j===i?{...x,price:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Price (₦)"/>
                      <input value={p.description} onChange={e => setContent(prev => ({...prev, products: prev.products.map((x,j)=>j===i?{...x,description:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Short description"/>
                    </div>
                  ))}
                </div>
              )}

              {tid === "restaurant" && (
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Menu Items</p>
                    <button onClick={() => setContent(p => ({...p, menuItems:[...(p.menuItems||[]),{name:"",price:"",category:"Main",description:""}]}))}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ color:"var(--primary)", background:"var(--primary-dim)" }}>
                      <Plus size={10}/> Add
                    </button>
                  </div>
                  {(content.menuItems || []).map((m, i) => (
                    <div key={i} className="p-3 rounded-xl mb-2 space-y-2" style={{ background:"var(--bg-hover)" }}>
                      <div className="flex justify-between">
                        <p className="text-xs font-bold" style={{ color:"var(--text-muted)" }}>Item {i+1}</p>
                        {i > 0 && <button onClick={() => setContent(prev => ({...prev, menuItems: prev.menuItems.filter((_,j)=>j!==i)}))} className="text-red-400"><X size={12}/></button>}
                      </div>
                      <input value={m.name} onChange={e => setContent(prev => ({...prev, menuItems: prev.menuItems.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Item name"/>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={m.price} onChange={e => setContent(prev => ({...prev, menuItems: prev.menuItems.map((x,j)=>j===i?{...x,price:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Price (₦)"/>
                        <select value={m.category} onChange={e => setContent(prev => ({...prev, menuItems: prev.menuItems.map((x,j)=>j===i?{...x,category:e.target.value}:x)}))} className="deji-input text-sm">
                          {["Main","Starter","Drinks","Sides"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tid === "realestate" && (
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Listings</p>
                    <button onClick={() => setContent(p => ({...p, listings:[...(p.listings||[]),{title:"",location:"",price:"",type:"For Sale",beds:3,baths:2}]}))}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ color:"var(--primary)", background:"var(--primary-dim)" }}>
                      <Plus size={10}/> Add
                    </button>
                  </div>
                  {(content.listings || []).map((l, i) => (
                    <div key={i} className="p-3 rounded-xl mb-2 space-y-2" style={{ background:"var(--bg-hover)" }}>
                      <div className="flex justify-between">
                        <p className="text-xs font-bold" style={{ color:"var(--text-muted)" }}>Listing {i+1}</p>
                        {i > 0 && <button onClick={() => setContent(prev => ({...prev, listings: prev.listings.filter((_,j)=>j!==i)}))} className="text-red-400"><X size={12}/></button>}
                      </div>
                      <input value={l.title} onChange={e => setContent(prev => ({...prev, listings: prev.listings.map((x,j)=>j===i?{...x,title:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Property title"/>
                      <input value={l.location} onChange={e => setContent(prev => ({...prev, listings: prev.listings.map((x,j)=>j===i?{...x,location:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Location"/>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={l.price} onChange={e => setContent(prev => ({...prev, listings: prev.listings.map((x,j)=>j===i?{...x,price:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Price"/>
                        <select value={l.type} onChange={e => setContent(prev => ({...prev, listings: prev.listings.map((x,j)=>j===i?{...x,type:e.target.value}:x)}))} className="deji-input text-sm">
                          <option>For Sale</option><option>For Rent</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tid === "service" && (
                <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Services</p>
                    <button onClick={() => setContent(p => ({...p, services:[...(p.services||[]),{name:"",price:"",description:"",icon:"⚡"}]}))}
                      className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                      style={{ color:"var(--primary)", background:"var(--primary-dim)" }}>
                      <Plus size={10}/> Add
                    </button>
                  </div>
                  {(content.services || []).map((s, i) => (
                    <div key={i} className="p-3 rounded-xl mb-2 space-y-2" style={{ background:"var(--bg-hover)" }}>
                      <div className="flex justify-between">
                        <p className="text-xs font-bold" style={{ color:"var(--text-muted)" }}>Service {i+1}</p>
                        {i > 0 && <button onClick={() => setContent(prev => ({...prev, services: prev.services.filter((_,j)=>j!==i)}))} className="text-red-400"><X size={12}/></button>}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <input value={s.icon} onChange={e => setContent(prev => ({...prev, services: prev.services.map((x,j)=>j===i?{...x,icon:e.target.value}:x)}))} className="deji-input text-sm col-span-1 text-center" placeholder="💼"/>
                        <input value={s.name} onChange={e => setContent(prev => ({...prev, services: prev.services.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} className="deji-input text-sm col-span-3" placeholder="Service name"/>
                      </div>
                      <input value={s.price} onChange={e => setContent(prev => ({...prev, services: prev.services.map((x,j)=>j===i?{...x,price:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Price (e.g. 50,000)"/>
                      <input value={s.description} onChange={e => setContent(prev => ({...prev, services: prev.services.map((x,j)=>j===i?{...x,description:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Short description"/>
                    </div>
                  ))}
                </div>
              )}

              {/* Testimonials */}
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:"1rem" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>Testimonials</p>
                  <button onClick={() => setContent(p => ({...p, testimonials:[...(p.testimonials||[]),{name:"",text:"",rating:5}]}))}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{ color:"var(--primary)", background:"var(--primary-dim)" }}>
                    <Plus size={10}/> Add
                  </button>
                </div>
                {(content.testimonials || []).map((t, i) => (
                  <div key={i} className="p-3 rounded-xl mb-2 space-y-2" style={{ background:"var(--bg-hover)" }}>
                    <div className="flex justify-between">
                      <p className="text-xs font-bold" style={{ color:"var(--text-muted)" }}>Review {i+1}</p>
                      {i > 0 && <button onClick={() => setContent(p => ({...p, testimonials: p.testimonials.filter((_,j)=>j!==i)}))} className="text-red-400"><X size={12}/></button>}
                    </div>
                    <input value={t.name} onChange={e => setContent(prev => ({...prev, testimonials: prev.testimonials.map((x,j)=>j===i?{...x,name:e.target.value}:x)}))} className="deji-input text-sm" placeholder="Customer name"/>
                    <textarea value={t.text} onChange={e => setContent(prev => ({...prev, testimonials: prev.testimonials.map((x,j)=>j===i?{...x,text:e.target.value}:x)}))} className="deji-input text-sm resize-none" rows={2} placeholder="What they said..."/>
                    <select value={t.rating} onChange={e => setContent(prev => ({...prev, testimonials: prev.testimonials.map((x,j)=>j===i?{...x,rating:Number(e.target.value)}:x)}))} className="deji-input text-sm">
                      <option value={5}>⭐⭐⭐⭐⭐ 5 stars</option>
                      <option value={4}>⭐⭐⭐⭐ 4 stars</option>
                      <option value={3}>⭐⭐⭐ 3 stars</option>
                    </select>
                  </div>
                ))}
              </div>

              <div><label className="deji-label">Footer Text</label>
                <input value={content.footerText || ""} onChange={upd("footerText")} className="deji-input" placeholder="Powered by Deji."/></div>
            </div>
          )}

          {/* Deji Connections Tab */}
          {editTab === "connect" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl"
                style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)" }}>
                <p className="text-xs font-bold mb-1" style={{ color:"#22c55e" }}>⚡ Deji-Powered Actions</p>
                <p className="text-xs" style={{ color:"var(--text-muted)" }}>
                  Toggle which website actions automatically trigger actions inside Deji.
                </p>
              </div>

              {[
                { key:"contactToLead",        icon:"👥", label:"Contact Form → CRM Lead",      desc:"Every form submission creates a lead in your pipeline automatically" },
                { key:"productFromInventory", icon:"📦", label:"Products → Deji Inventory",     desc:"Product grid pulls live stock and prices from your Deji inventory" },
                { key:"checkoutToPOS",        icon:"🛒", label:"Checkout → Deji POS Order",     desc:"Every purchase creates a POS order and deducts stock automatically" },
                { key:"bookingToCRM",         icon:"📅", label:"Booking/Reservation → CRM",     desc:"Booking forms create appointment entries in your CRM pipeline" },
              ].map(item => {
                const on = content.dejiConnect?.[item.key];
                return (
                  <div key={item.key}
                    className="p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: on ? "rgba(34,197,94,0.06)" : "var(--bg-hover)", border: `1px solid ${on ? "rgba(34,197,94,0.2)" : "var(--border)"}` }}
                    onClick={() => setContent(p => ({...p, dejiConnect: {...(p.dejiConnect||{}), [item.key]: !on}}))}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="text-lg flex-shrink-0">{item.icon}</span>
                        <div>
                          <p className="text-sm font-semibold" style={{ color:"var(--text-primary)" }}>{item.label}</p>
                          <p className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>{item.desc}</p>
                        </div>
                      </div>
                      <div className="w-9 h-5 rounded-full relative transition-all flex-shrink-0 mt-0.5"
                        style={{ background: on ? "var(--primary)" : "var(--border)" }}>
                        <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                          style={{ left: on ? "calc(100% - 18px)" : "2px" }}/>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="p-3 rounded-xl"
                style={{ background:"rgba(234,179,8,0.06)", border:"1px solid rgba(234,179,8,0.2)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color:"#eab308" }}>
                  🔗 Webhook URL for this site
                </p>
                <p className="text-[10px] font-mono break-all" style={{ color:"var(--text-muted)" }}>
                  {process.env.NEXT_PUBLIC_API_URL}/api/webhooks/generic/YOUR_TENANT_ID
                </p>
                <p className="text-[10px] mt-1" style={{ color:"var(--text-muted)" }}>
                  All form submissions on your published site post to this endpoint.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Publish button */}
        <div className="p-4 flex-shrink-0"
          style={{ borderTop:"1px solid var(--border)", background:"var(--bg-surface)" }}>
          <button onClick={publish} disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {saving
              ? <><Loader size={14} className="animate-spin"/> Publishing...</>
              : <><Globe size={14}/> Publish Website</>}
          </button>
        </div>
      </div>

      {/* ── Right Panel: Live Preview ── */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl"
        style={{ border:"1px solid var(--border)" }}>
        {/* Browser chrome */}
        <div className="h-10 flex items-center gap-2 px-4 flex-shrink-0"
          style={{ background:"var(--bg-hover)", borderBottom:"1px solid var(--border)" }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"/>
            <div className="w-3 h-3 rounded-full bg-yellow-400"/>
            <div className="w-3 h-3 rounded-full" style={{ background:"var(--primary)" }}/>
          </div>
          <div className="flex-1 text-xs font-mono px-3 py-1 rounded-lg truncate"
            style={{ background:"var(--bg-card)", color:"var(--text-muted)" }}>
            deji.app/store/{content.businessName
              ? content.businessName.toLowerCase().replace(/\s+/g, "-")
              : "your-store"}
          </div>
          <div className="flex gap-1.5">
            {[
              { k:"desktop", icon:"🖥️" },
              { k:"mobile",  icon:"📱" },
            ].map(m => (
              <button key={m.k} onClick={() => setPreviewMode(m.k)}
                className="text-xs px-2 py-1 rounded-lg transition-all"
                style={{
                  background: previewMode === m.k ? "var(--primary)" : "transparent",
                  color:      previewMode === m.k ? "#fff" : "var(--text-muted)",
                }}>
                {m.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex items-start justify-center"
          style={{ background:"#e5e7eb", padding: previewMode === "mobile" ? "20px" : "0" }}>
          <div style={{
            width:      previewMode === "mobile" ? "375px" : "100%",
            height:     previewMode === "mobile" ? "667px" : "100%",
            overflow:   "hidden",
            borderRadius: previewMode === "mobile" ? "24px" : "0",
            boxShadow:  previewMode === "mobile" ? "0 20px 60px #0003" : "none",
          }}>
            <Preview content={content} template={sel}/>
          </div>
        </div>
      </div>
    </div>
  );
}