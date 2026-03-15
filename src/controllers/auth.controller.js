import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../config/prisma.js';

// ─── Mailer ───────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendEmail = ({ to, subject, html }) =>
  transporter.sendMail({
    from: `"Deji Business OS" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to, subject, html,
  });

// ─── Email templates ──────────────────────────────────────────────────────────

const emailShell = ({ preheader, body, footer }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>Deji Business OS</title>
</head>
<body style="margin:0;padding:0;background:#030c06;font-family:'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<!-- preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;&nbsp;‌&zwnj;</div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#030c06;">
<tr><td align="center" style="padding:32px 16px 48px;">

  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

    <!-- Logo bar -->
    <tr>
      <td style="padding:0 0 20px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:linear-gradient(135deg,#22c55e,#16a34a);width:38px;height:38px;border-radius:10px;text-align:center;vertical-align:middle;">
              <span style="font-size:18px;font-weight:900;color:#ffffff;line-height:38px;">D</span>
            </td>
            <td style="padding-left:10px;vertical-align:middle;">
              <span style="font-size:22px;font-weight:900;color:#f0fdf4;letter-spacing:-0.5px;">Deji<span style="color:#22c55e;">.</span></span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Main card -->
    <tr>
      <td style="background:#071810;border:1px solid #1a3322;border-radius:20px;overflow:hidden;">
        ${body}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:28px 0 0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#374151;line-height:1.6;">${footer}</p>
        <p style="margin:8px 0 0;font-size:11px;color:#1f2937;">
          © ${new Date().getFullYear()} Deji Business OS &nbsp;·&nbsp; The complete business operating system for African businesses.
        </p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body></html>`;

// ── Feature pill helper ────────────────────────────────────────────────────────
const featurePill = (icon, label, color = '#22c55e') =>
  `<span style="display:inline-block;background:${color}18;border:1px solid ${color}33;border-radius:20px;padding:5px 12px;margin:3px 3px;font-size:11px;font-weight:700;color:${color};">${icon} ${label}</span>`;

// ── What is Deji section (reused in invite + welcome) ─────────────────────────
const dejiFeaturesBlock = () => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:#040f08;border:1px solid #1a3322;border-radius:14px;padding:20px 24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:1px;">What is Deji?</p>
      <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">The all-in-one business operating system built for African businesses. Manage everything from one dashboard.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" style="vertical-align:top;padding:0 8px 12px 0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:32px;height:32px;background:#22c55e18;border-radius:8px;text-align:center;vertical-align:middle;font-size:15px;">🛒</td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:#f0fdf4;">Point of Sale</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#4b5563;">Fast checkout, receipts & cash tracking</p>
                </td>
              </tr>
            </table>
          </td>
          <td width="50%" style="vertical-align:top;padding:0 0 12px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:32px;height:32px;background:#6366f118;border-radius:8px;text-align:center;vertical-align:middle;font-size:15px;">📦</td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:#f0fdf4;">Inventory</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#4b5563;">Stock alerts, bundles & product tracking</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td width="50%" style="vertical-align:top;padding:0 8px 12px 0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:32px;height:32px;background:#f9731618;border-radius:8px;text-align:center;vertical-align:middle;font-size:15px;">🎯</td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:#f0fdf4;">CRM & Leads</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#4b5563;">Pipeline, contacts & follow-up automation</p>
                </td>
              </tr>
            </table>
          </td>
          <td width="50%" style="vertical-align:top;padding:0 0 12px 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:32px;height:32px;background:#eab30818;border-radius:8px;text-align:center;vertical-align:middle;font-size:15px;">💰</td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:#f0fdf4;">Finance</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#4b5563;">Invoices, expenses & ledger</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td width="50%" style="vertical-align:top;padding:0 8px 0 0;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:32px;height:32px;background:#3b82f618;border-radius:8px;text-align:center;vertical-align:middle;font-size:15px;">📊</td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:#f0fdf4;">Analytics</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#4b5563;">Revenue charts, funnels & team reports</p>
                </td>
              </tr>
            </table>
          </td>
          <td width="50%" style="vertical-align:top;padding:0 0 0 8px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:32px;height:32px;background:#25D36618;border-radius:8px;text-align:center;vertical-align:middle;font-size:15px;">💬</td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <p style="margin:0;font-size:12px;font-weight:700;color:#f0fdf4;">WhatsApp</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#4b5563;">Message customers & run broadcasts</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

// ── CTA button ─────────────────────────────────────────────────────────────────
const ctaBtn = (url, label) =>
  `<table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:14px;">
        <a href="${url}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">${label}</a>
      </td>
    </tr>
  </table>`;

// ── INVITE email ───────────────────────────────────────────────────────────────
const inviteHtml = ({ firstName, inviteUrl, businessName, role }) => emailShell({
  preheader: `${businessName} invited you to join as ${role} on Deji Business OS`,
  footer: `You received this because ${businessName} invited you to join their Deji workspace. If this was unexpected, you can safely ignore this email.`,
  body: `
    <!-- Hero gradient strip -->
    <div style="background:linear-gradient(135deg,#0d2818 0%,#071810 60%,#0a1f0a 100%);padding:40px 40px 32px;border-bottom:1px solid #1a3322;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:1.5px;">You've been invited 🎉</p>
      <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#f0fdf4;line-height:1.2;">Hey ${firstName}, <br/>welcome to the team!</h1>
      <p style="margin:0;font-size:15px;color:#86efac;line-height:1.6;">
        <strong style="color:#4ade80;">${businessName}</strong> has invited you to join as
        <span style="display:inline-block;background:#22c55e22;border:1px solid #22c55e44;border-radius:6px;padding:2px 10px;font-weight:700;color:#22c55e;font-size:13px;margin-left:4px;">${role}</span>
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px 40px;">

      ${dejiFeaturesBlock()}

      <!-- CTA -->
      <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.7;">
        Click below to set your password and access your new workspace. Your team is waiting!
      </p>
      ${ctaBtn(inviteUrl, 'Set My Password &amp; Join →')}

      <!-- Expiry note -->
      <p style="margin:20px 0 0;font-size:12px;color:#4b5563;line-height:1.6;">
        ⏳ This invite expires in <strong style="color:#86efac;">7 days</strong>. Ignore if unexpected.
      </p>

      <!-- Fallback link -->
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1a3322;">
        <p style="margin:0 0 4px;font-size:11px;color:#374151;font-weight:600;">Can't click the button? Copy this link:</p>
        <p style="margin:0;font-size:11px;color:#22c55e;word-break:break-all;">${inviteUrl}</p>
      </div>
    </div>
  `,
});

// ── WELCOME email ──────────────────────────────────────────────────────────────
const welcomeHtml = ({ firstName, businessName }) => emailShell({
  preheader: `Your ${businessName} workspace is live — here's everything you can do with Deji`,
  footer: `You're receiving this because you just created a Deji Business OS account for ${businessName}.`,
  body: `
    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#0d2818 0%,#071810 60%,#081a0c 100%);padding:40px 40px 32px;border-bottom:1px solid #1a3322;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:1.5px;">You're all set 🚀</p>
      <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:#f0fdf4;line-height:1.2;">Welcome to Deji,<br/>${firstName}!</h1>
      <p style="margin:0;font-size:15px;color:#86efac;line-height:1.6;">
        Your workspace <strong style="color:#4ade80;">${businessName}</strong> is live and ready to go.
      </p>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px 40px;">

      <!-- Tagline -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:linear-gradient(135deg,#22c55e18,#16a34a08);border:1px solid #22c55e22;border-radius:14px;padding:18px 22px;margin-bottom:24px;">
            <p style="margin:0;font-size:14px;font-weight:700;color:#4ade80;line-height:1.5;">
              "One dashboard to run your entire business — from your first sale to your 10,000th."
            </p>
          </td>
        </tr>
      </table>

      ${dejiFeaturesBlock()}

      <!-- Quick start steps -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
        <tr>
          <td style="background:#040f08;border:1px solid #1a3322;border-radius:14px;padding:20px 24px;">
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:1px;">Recommended first steps</p>
            ${[
              ['1','Add your first product','Go to Inventory → Add Product'],
              ['2','Import or add a contact','Go to CRM → Contacts → Add'],
              ['3','Create your first invoice','Go to Finance → New Invoice'],
              ['4','Make a test POS sale','Go to Point of Sale → New Sale'],
            ].map(([n, title, hint]) => `
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
              <tr>
                <td style="width:26px;height:26px;background:#22c55e;border-radius:50%;text-align:center;vertical-align:middle;font-size:12px;font-weight:900;color:#fff;">${n}</td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <p style="margin:0;font-size:13px;font-weight:700;color:#f0fdf4;">${title}</p>
                  <p style="margin:1px 0 0;font-size:11px;color:#4b5563;">${hint}</p>
                </td>
              </tr>
            </table>`).join('')}
          </td>
        </tr>
      </table>

      ${ctaBtn(`${process.env.APP_URL || '#'}/dashboard`, 'Open My Dashboard →')}

    </div>
  `,
});

// ── VERIFY email ───────────────────────────────────────────────────────────────
const verifyHtml = ({ firstName, verifyUrl }) => emailShell({
  preheader: `Verify your email to activate your Deji workspace — takes 5 seconds`,
  footer: `You're receiving this because you signed up for Deji Business OS. If you didn't, ignore this email.`,
  body: `
    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#0d2818 0%,#071810 100%);padding:40px 40px 32px;border-bottom:1px solid #1a3322;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#22c55e;text-transform:uppercase;letter-spacing:1.5px;">Almost there ✉️</p>
      <h1 style="margin:0 0 10px;font-size:26px;font-weight:900;color:#f0fdf4;line-height:1.2;">Confirm your email,<br/>${firstName}</h1>
      <p style="margin:0;font-size:14px;color:#86efac;line-height:1.6;">One quick click and your Deji workspace is activated.</p>
    </div>
    <div style="padding:32px 40px 40px;">
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">
        Thanks for signing up! Click below to verify your email and unlock your full business operating system.
      </p>
      ${ctaBtn(verifyUrl, 'Verify My Email →')}
      <p style="margin:20px 0 24px;font-size:12px;color:#4b5563;">
        ⏳ Expires in <strong style="color:#86efac;">24 hours</strong>.
      </p>
      ${dejiFeaturesBlock()}
      <div style="margin-top:8px;padding-top:20px;border-top:1px solid #1a3322;">
        <p style="margin:0 0 4px;font-size:11px;color:#374151;font-weight:600;">Can't click the button? Copy this link:</p>
        <p style="margin:0;font-size:11px;color:#22c55e;word-break:break-all;">${verifyUrl}</p>
      </div>
    </div>
  `,
});

// ── RESET PASSWORD email ───────────────────────────────────────────────────────
const resetHtml = ({ firstName, resetUrl }) => emailShell({
  preheader: `Reset your Deji password — this link expires in 1 hour`,
  footer: `You're receiving this because a password reset was requested for your Deji account. If you didn't request this, ignore this email — your password won't change.`,
  body: `
    <!-- Hero -->
    <div style="background:linear-gradient(135deg,#1a0d08 0%,#130a06 60%,#0f1208 100%);padding:40px 40px 32px;border-bottom:1px solid #2a1a10;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:1.5px;">Password Reset 🔑</p>
      <h1 style="margin:0 0 10px;font-size:26px;font-weight:900;color:#f0fdf4;line-height:1.2;">Let's get you<br/>back in, ${firstName}</h1>
      <p style="margin:0;font-size:14px;color:#fdba74;line-height:1.6;">Your Deji account password reset was requested.</p>
    </div>
    <div style="padding:32px 40px 40px;">
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">
        Click the button below to set a new password for your Deji Business OS account. This link is valid for <strong style="color:#fdba74;">1 hour</strong>.
      </p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background:linear-gradient(135deg,#f97316,#ea580c);border-radius:14px;">
            <a href="${resetUrl}" style="display:inline-block;padding:15px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Reset My Password →</a>
          </td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#4b5563;line-height:1.6;">
        🔒 If you didn't request a password reset, please ignore this email. Your account remains secure.
      </p>
      <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1a3322;">
        <p style="margin:0 0 4px;font-size:11px;color:#374151;font-weight:600;">Can't click the button? Copy this link:</p>
        <p style="margin:0;font-size:11px;color:#f97316;word-break:break-all;">${resetUrl}</p>
      </div>
    </div>
  `,
});

// ─── Role permissions ─────────────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: {
    dashboard: true, leads: true, contacts: true, pipeline: true,
    inventory: true, pos: true, finance: true, analytics: true,
    whatsapp: true, forms: true, settings: true, staff: true,
    canManageStaff: true, canDeleteRecords: true, canExport: true, canViewAllRecords: true,
  },
  manager: {
    dashboard: true, leads: true, contacts: true, pipeline: true,
    inventory: true, pos: true, finance: true, analytics: true,
    whatsapp: true, forms: true, settings: false, staff: false,
    canManageStaff: false, canDeleteRecords: true, canExport: true, canViewAllRecords: true,
  },
  sales: {
    dashboard: true, leads: true, contacts: true, pipeline: true,
    inventory: false, pos: true, finance: false, analytics: false,
    whatsapp: true, forms: false, settings: false, staff: false,
    canManageStaff: false, canDeleteRecords: false, canExport: false, canViewAllRecords: false,
  },
  support: {
    dashboard: true, leads: true, contacts: true, pipeline: false,
    inventory: false, pos: false, finance: false, analytics: false,
    whatsapp: true, forms: false, settings: false, staff: false,
    canManageStaff: false, canDeleteRecords: false, canExport: false, canViewAllRecords: false,
  },
  marketer: {
    dashboard: true, leads: true, contacts: false, pipeline: true,
    inventory: false, pos: false, finance: false, analytics: true,
    whatsapp: false, forms: true, settings: false, staff: false,
    canManageStaff: false, canDeleteRecords: false, canExport: true, canViewAllRecords: false,
  },
  accountant: {
    dashboard: true, leads: false, contacts: true, pipeline: false,
    inventory: true, pos: false, finance: true, analytics: true,
    whatsapp: false, forms: false, settings: false, staff: false,
    canManageStaff: false, canDeleteRecords: false, canExport: true, canViewAllRecords: true,
  },
  inventory: {
    dashboard: true, leads: false, contacts: false, pipeline: false,
    inventory: true, pos: true, finance: false, analytics: false,
    whatsapp: false, forms: false, settings: false, staff: false,
    canManageStaff: false, canDeleteRecords: false, canExport: false, canViewAllRecords: false,
  },
  staff: {
    dashboard: true, leads: true, contacts: true, pipeline: true,
    inventory: false, pos: true, finance: false, analytics: false,
    whatsapp: true, forms: false, settings: false, staff: false,
    canManageStaff: false, canDeleteRecords: false, canExport: false, canViewAllRecords: false,
  },
};

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTER
// FIX: removed plan from tenant.create (plan is on Subscription, not Tenant)
// ══════════════════════════════════════════════════════════════════════════════
export const registerUser = async (req, res) => {
  try {
    const { email, password, tenantName, businessType, role = 'admin', firstName, lastName, phone } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });
    if (!tenantName)         return res.status(400).json({ message: 'Business name is required.' });

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });

    // Check tenant name uniqueness
    const existingTenant = await prisma.tenant.findUnique({ where: { name: tenantName } });
    if (existingTenant) {
      return res.status(409).json({ message: 'A workspace with this business name already exists. Please choose a different name.' });
    }

    const hashed       = await bcrypt.hash(password, 12);
    const defaultPerms = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['staff'];
    const fname        = firstName || email.split('@')[0];

    // Transaction — tenant + user + settings + subscription + warehouse created atomically
    let createdUser;
    await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName, language: 'en' },
      });

      createdUser = await tx.user.create({
        data: {
          email, password: hashed, role,
          firstName: fname,
          lastName:  lastName || '',
          phone,
          tenantId:      tenant.id,
          permissions:   defaultPerms,
          isActive:      true,   // ✅ Active immediately — no email gate
          emailVerified: true,   // ✅ Verified immediately
          verifyToken:   null,
          verifyExpiry:  null,
        },
        include: { tenant: true },
      });

      // ── TenantSettings (needed by settings page, invoices, etc.) ──
      await tx.tenantSettings.create({
        data: {
          tenantId:     tenant.id,
          businessName: tenantName,
          currency:     'NGN',
          language:     'en',
          timezone:     'Africa/Lagos',
          invoicePrefix: 'INV-',
          invoiceStart:  1000,
          invoiceDueDays: 30,
          taxRate:       0,
          notifyByEmail: true,
          notifyByWhatsApp: false,
        },
      });

      // ── FREE subscription (needed by plan-limit middleware) ──
      const now      = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);
      await tx.subscription.create({
        data: {
          tenantId:           tenant.id,
          plan:               'FREE',
          status:             'ACTIVE',
          startedAt:          now,
          currentPeriodStart: now,
          currentPeriodEnd:   periodEnd,
        },
      });

      // ── Default warehouse (needed by inventory from day one) ──
      await tx.warehouse.create({
        data: {
          tenantId:  tenant.id,
          name:      'Main Warehouse',
          code:      'MAIN',
          type:      'local',
          country:   'Nigeria',
          city:      'Lagos',
          currency:  'NGN',
          isActive:  true,
          isDefault: true,
          notes:     'Default warehouse — all new stock lands here first',
        },
      });
    });

    // Send welcome email in background — never blocks or crashes signup
    setImmediate(async () => {
      try {
        await sendEmail({
          to:      email,
          subject: `Welcome to Deji Business OS, ${fname}!`,
          html:    welcomeHtml({ firstName: fname, businessName: tenantName }),
        });
      } catch (e) {
        console.error('Welcome email failed (non-critical):', e.message);
      }
    });

    // Issue JWT and log them straight in
    const token = generateToken(createdUser);
    res.status(201).json({
      message: 'Workspace created successfully!',
      token,
      user: {
        id:          createdUser.id,
        email:       createdUser.email,
        role:        createdUser.role,
        firstName:   createdUser.firstName,
        lastName:    createdUser.lastName,
        tenantId:    createdUser.tenantId,
        tenantName:  createdUser.tenant?.name,
        permissions: createdUser.permissions || defaultPerms,
        isActive:    true,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 'P2002') {
      const field = err.meta?.target?.[0];
      if (field === 'name')  return res.status(409).json({ message: 'A workspace with this business name already exists.' });
      if (field === 'email') return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// FIX: existing users (emailVerified = null/false in DB) are allowed through
// so pre-existing accounts aren't locked out after the migration
// ══════════════════════════════════════════════════════════════════════════════
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required.' });

    const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

    // Only block if emailVerified is explicitly false AND verifyToken exists
    // (meaning they just registered and haven't verified yet)
    // Pre-existing users have emailVerified=false but no verifyToken — let them through
    if (user.emailVerified === false && user.verifyToken) {
      return res.status(403).json({
        message: 'Please verify your email before logging in. Check your inbox.',
        requiresVerification: true,
      });
    }

    if (user.invitePending) {
      return res.status(403).json({
        message: 'Please accept your invite first. Check your email for the invite link.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated. Contact your admin.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials.' });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = generateToken(user);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName,
        tenantId: user.tenantId, tenantName: user.tenant?.name,
        permissions: user.permissions || ROLE_PERMISSIONS[user.role],
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// VERIFY EMAIL  GET /auth/verify-email?token=xxx
// ══════════════════════════════════════════════════════════════════════════════
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Token required.' });

    const user = await prisma.user.findFirst({
      where: { verifyToken: token, verifyExpiry: { gt: new Date() } },
      include: { tenant: true },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired verification link.' });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, isActive: true, verifyToken: null, verifyExpiry: null },
    });

    const jwtToken = generateToken(user);
    res.json({
      message: 'Email verified! You are now logged in.',
      token:   jwtToken,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName,
        tenantId: user.tenantId, tenantName: user.tenant?.name,
        permissions: user.permissions || ROLE_PERMISSIONS[user.role],
      },
    });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ message: 'Verification failed.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// RESEND VERIFICATION  POST /auth/resend-verification
// ══════════════════════════════════════════════════════════════════════════════
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) {
      return res.json({ message: 'If that email exists and is unverified, we sent a new link.' });
    }
    const verifyToken  = crypto.randomBytes(32).toString('hex');
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { verifyToken, verifyExpiry } });
    const verifyUrl = `${process.env.APP_URL}/verify-email?token=${verifyToken}`;
    await sendEmail({
      to: email, subject: 'Verify your Deji workspace email',
      html: verifyHtml({ firstName: user.firstName || 'there', verifyUrl }),
    });
    res.json({ message: 'Verification email resent.' });
  } catch (err) { res.status(500).json({ message: 'Failed to resend.' }); }
};

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD  POST /auth/forgot-password
// ══════════════════════════════════════════════════════════════════════════════
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required.' });

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const resetToken  = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken: resetToken, verifyExpiry: resetExpiry },
      // Reusing verifyToken/verifyExpiry fields for password reset
    });

    const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to:      email,
      subject: 'Reset your Deji password',
      html:    resetHtml({ firstName: user.firstName || 'there', resetUrl }),
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Failed to send reset email.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// RESET PASSWORD  POST /auth/reset-password
// ══════════════════════════════════════════════════════════════════════════════
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required.' });
    if (password.length < 8)  return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const user = await prisma.user.findFirst({
      where: { verifyToken: token, verifyExpiry: { gt: new Date() } },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset link.' });

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password:      hashed,
        verifyToken:   null,
        verifyExpiry:  null,
        emailVerified: true,  // ensure they're verified after reset
        isActive:      true,
      },
    });

    res.json({ message: 'Password reset successfully! You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// INVITE STAFF  POST /auth/invite
// ══════════════════════════════════════════════════════════════════════════════
export const inviteStaffMember = async (req, res) => {
  try {
    const { email, role = 'staff', firstName, lastName, phone, permissions } = req.body;
    const tenantId = req.user.tenantId;

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'First name, last name and email are required.' });
    }
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only admins and managers can invite staff.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use.' });

    const inviteToken  = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const defaultPerms = permissions || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['staff'];

    const user = await prisma.user.create({
      data: {
        email, firstName, lastName, phone,
        role, tenantId,
        password:      'INVITE_PENDING',
        permissions:   defaultPerms,
        emailVerified: true,
        isActive:      false,
        invitePending: true,
        inviteToken,
        inviteExpiry,
      },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, phone: true,
        isActive: true, invitePending: true, permissions: true, createdAt: true,
      },
    });

    const tenant    = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const inviteUrl = `${process.env.APP_URL}/invite?token=${inviteToken}`;

    // Send invite email — non-blocking, staff is created regardless
    let emailSent = false;
    try {
      await sendEmail({
        to:      email,
        subject: `You've been invited to join ${tenant?.name || 'Deji'} on Deji Business OS`,
        html:    inviteHtml({ firstName, inviteUrl, businessName: tenant?.name || 'your workspace', role }),
      });
      emailSent = true;
    } catch (emailErr) {
      console.warn('Invite email failed (non-critical):', emailErr.message);
    }

    res.status(201).json({
      message: emailSent
        ? `Invite email sent to ${email}.`
        : `Staff member created. Email not configured — share this invite link manually.`,
      emailSent,
      inviteUrl, // always returned so admin can share manually if email isn't set up
      data: user,
    });
  } catch (err) {
    console.error('Invite staff error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATE INVITE TOKEN  GET /auth/invite/:token
// ══════════════════════════════════════════════════════════════════════════════
export const validateInviteToken = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: { inviteToken: req.params.token, inviteExpiry: { gt: new Date() }, invitePending: true },
      include: { tenant: true },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired invite link.' });
    res.json({
      firstName: user.firstName, lastName: user.lastName,
      email: user.email, role: user.role, businessName: user.tenant?.name,
    });
  } catch (err) { res.status(500).json({ message: 'Failed to validate invite.' }); }
};

// ══════════════════════════════════════════════════════════════════════════════
// ACCEPT INVITE  POST /auth/accept-invite
// ══════════════════════════════════════════════════════════════════════════════
export const acceptInvite = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required.' });
    if (password.length < 8)  return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const user = await prisma.user.findFirst({
      where: { inviteToken: token, inviteExpiry: { gt: new Date() }, invitePending: true },
      include: { tenant: true },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired invite link.' });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password:      await bcrypt.hash(password, 12),
        inviteToken:   null,
        inviteExpiry:  null,
        invitePending: false,
        isActive:      true,
      },
    });

    const jwtToken = generateToken(user);
    res.json({
      message: 'Account activated!',
      token:   jwtToken,
      user: {
        id: user.id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName,
        permissions: user.permissions, tenantId: user.tenantId,
        tenantName: user.tenant?.name,
      },
    });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ message: 'Failed to accept invite.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// RESEND INVITE  POST /auth/resend-invite
// ══════════════════════════════════════════════════════════════════════════════
export const resendInvite = async (req, res) => {
  try {
    const { email } = req.body;
    const tenantId  = req.user.tenantId;
    const user      = await prisma.user.findFirst({ where: { email, tenantId, invitePending: true } });
    if (!user) return res.status(404).json({ message: 'No pending invite found for this email.' });

    const inviteToken  = crypto.randomBytes(32).toString('hex');
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { inviteToken, inviteExpiry } });

    const tenant    = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const inviteUrl = `${process.env.APP_URL}/invite?token=${inviteToken}`;

    // Try email — non-blocking, always return inviteUrl so admin can share manually
    let emailSent = false;
    try {
      await sendEmail({
        to:      email,
        subject: `Reminder: Join ${tenant?.name || 'Deji'} on Deji Business OS`,
        html:    inviteHtml({ firstName: user.firstName, inviteUrl, businessName: tenant?.name || 'your workspace', role: user.role }),
      });
      emailSent = true;
    } catch (emailErr) {
      console.warn('Resend invite email failed (non-critical):', emailErr.message);
    }

    res.json({
      message:   emailSent ? 'Invite resent via email.' : 'Invite link regenerated. Email not configured — share the link manually.',
      emailSent,
      inviteUrl, // always returned
    });
  } catch (err) {
    console.error('Resend invite error:', err);
    res.status(500).json({ message: 'Failed to resend invite.' });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// EXISTING FUNCTIONS — unchanged
// ══════════════════════════════════════════════════════════════════════════════

export const addStaffMember = (req, res) => inviteStaffMember(req, res);

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { tenant: true },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, phone: true,
        avatarUrl: true, isActive: true, permissions: true,
        lastLoginAt: true, createdAt: true,
        tenant: { select: { id: true, name: true } },
      },
    });
    res.json({ data: user });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const updateStaffMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, firstName, lastName, phone, isActive, permissions } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can update staff.' });
    const staff = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!staff) return res.status(404).json({ message: 'Staff not found.' });
    const updatedPerms = permissions || (role ? ROLE_PERMISSIONS[role] : undefined);
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(role      !== undefined && { role }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName  !== undefined && { lastName }),
        ...(phone     !== undefined && { phone }),
        ...(isActive  !== undefined && { isActive }),
        ...(updatedPerms             && { permissions: updatedPerms }),
      },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, phone: true,
        isActive: true, permissions: true, createdAt: true, lastLoginAt: true,
      },
    });
    res.json({ message: 'Staff updated', data: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const deleteStaffMember = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Only admins can remove staff.' });
    if (id === req.user.id) return res.status(400).json({ message: 'Cannot remove yourself.' });
    const staff = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!staff) return res.status(404).json({ message: 'Staff not found.' });
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json({ message: 'Staff member deactivated.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getStaffMembers = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, phone: true,
        isActive: true, invitePending: true, permissions: true,
        lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: staff });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

export const getRolePermissions = async (req, res) => {
  res.json({ data: ROLE_PERMISSIONS });
};
// ── Change Password ───────────────────────────────────────────────────────────
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Current and new password are required' });
    if (newPassword.length < 8)
      return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const user = await prisma.user.findUnique({ where: { id: req.user.userId || req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[CHANGE PASSWORD]', err.message);
    res.status(500).json({ message: 'Failed to update password' });
  }
}
