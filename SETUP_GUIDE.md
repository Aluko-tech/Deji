# Deji Multi-Tenant Setup Guide

## 🚀 Quick Start

### Backend is Running ✅
- **URL**: http://localhost:3000/api
- **Status**: Running on port 3000

### Frontend Setup

1. **Install dependencies** (if not already done):
   ```bash
   cd /workspaces/Deji/deji-frontend
   npm install
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```
   - Frontend will be on: http://localhost:5173

## 🗄️ Database Setup (Required)

The application requires a PostgreSQL database. Choose one of these options:

### Option A: Local PostgreSQL (Recommended for Development)

1. **Install PostgreSQL** (if not installed):
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

2. **Start PostgreSQL**:
   ```bash
   sudo service postgresql start
   ```

3. **Create a database**:
   ```bash
   sudo -u postgres psql -c "CREATE DATABASE deji;"
   ```

4. **Update `.env`** with your database URL:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/deji"
   ```

5. **Run migrations**:
   ```bash
   cd /workspaces/Deji
   npm run prisma:migrate
   ```

### Option B: Use a Cloud Database

1. **Create a free PostgreSQL database** at:
   - [Railway.app](https://railway.app) (recommended for free tier)
   - [Supabase.com](https://supabase.com)
   - [Render.com](https://render.com)

2. **Update `.env`** with the connection string from your provider:
   ```
   DATABASE_URL="postgresql://user:password@host:port/dbname"
   ```

3. **Run migrations**:
   ```bash
   npm run prisma:migrate
   ```

## 📝 Create Your First Account

### Method 1: Through the UI (Easiest)

1. Open http://localhost:5173
2. Click **"Create one"** on the login page
3. Fill in the registration form:
   - **Email**: your@email.com
   - **Password**: your-secure-password
   - **Organization Name**: My Company
   - **Role**: admin (or manager/staff/viewer)
4. Click **"Create Account"**
5. You'll be logged in automatically

### Method 2: Using Seed Script (After Database Setup)

```bash
cd /workspaces/Deji
node seed-demo-user.js
```

This creates a demo account:
- **Email**: demo@example.com
- **Password**: demo123456
- **Organization**: Demo Company
- **Role**: admin

## 🔌 Multi-Tenant Architecture

Each user registration creates:
1. ✅ A new **Tenant** (organization/workspace)
2. ✅ A new **User** (with role: admin, manager, staff, or viewer)
3. ✅ JWT token for authentication (7-day expiry)

Users in the same tenant can collaborate on:
- Contacts
- Products
- Invoices
- Leads
- WhatsApp Messages
- Custom Fields
- And more!

## 🔑 Features Accessible After Login

- **Dashboard**: Overview of your business
- **Contacts**: Manage customer contacts
- **Products**: Manage inventory
- **Invoices**: Create and manage invoices
- **Leads**: Track sales leads
- **WhatsApp**: Integrate WhatsApp messaging
- **Settings**: Configure tenant preferences
- **Reports**: View business analytics

## 🛠️ Troubleshooting

### "Error forwarding port"
- Make sure backend is running: `npm run dev` in `/workspaces/Deji`
- Make sure frontend is running: `npm run dev` in `/workspaces/Deji/deji-frontend`

### "Database connection failed"
- Check `.env` DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run migrations: `npm run prisma:migrate`

### "CORS error"
- Make sure frontend URL is in the CORS whitelist in `index.js`
- Default allowed: localhost:5173, 127.0.0.1:5173

### "Cannot find module" errors
- Run: `npm install` in both root and frontend directories

## 📚 Environment Variables

Your `.env` file includes:
- `DATABASE_URL`: PostgreSQL connection
- `OPENAI_API_KEY`: For AI features
- `JWT_SECRET`: Token signing (change in production!)
- `WHATSAPP_TOKEN`: WhatsApp integration
- `CLOUDINARY_*`: Image storage
- `STRIPE_*`: Payment processing

## 🚀 Next Steps

1. Set up your database
2. Start the backend (`npm run dev` in root)
3. Start the frontend (`npm run dev` in `deji-frontend`)
4. Register your account or use demo credentials
5. Explore the dashboard!

---

**Need help?** Check the logs in the terminal for detailed error messages.
