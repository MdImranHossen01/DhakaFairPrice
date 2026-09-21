# Swapnobaz - Enterprise B2B + B2C Multi-Tenant Dropshipping Platform and SaaS

---

## Introduction and Abstraction

Swapnobaz is an enterprise-grade, multi-tenant SaaS e-commerce and dropshipping platform designed specifically to modernize and scale online retail businesses in Bangladesh and emerging markets. It serves as a unified digital ecosystem connecting manufacturers, wholesalers, independent resellers, and end consumers under a single, highly optimized technological infrastructure.

Built on the latest Next.js 15 App Router, MongoDB, Tailwind CSS, and shadcn/ui, Swapnobaz eliminates the need for individual storefront hosting, inventory holding, and manual order dispatching. Approved resellers automatically receive a dedicated, customizable storefront operating under their own subdomain or custom domain, complete with isolated customer records, branded invoicing, and automated financial accounting. By automating everything from product sync and courier dispatch to double-entry ledger bookkeeping, Swapnobaz transforms traditional commerce into an automated, zero-inventory business engine.

---

## Unique Selling Point (USP)

Swapnobaz separates itself from standard e-commerce scripts and generic Shopify clones through several architectural and operational breakthroughs:

- Multi-Tenant Subdomain and Custom Domain Engine: Each reseller receives an independent storefront with isolated branding and data partitioning, hosted dynamically on a single Next.js codebase without requiring separate servers or manual DNS provisioning.
- Reverse Order Routing Workflow: Resellers never handle stock or pack products. When a customer orders on a reseller storefront, the system automatically routes the order to the mother warehouse, books the courier shipment, attaches tracking numbers, and calculates commissions in real time.
- Real-Time BD Courier Fraud Detection: The platform analyzes customer phone numbers against historical delivery data across major Bangladeshi couriers, scoring every incoming order for RTO (Return to Origin) risk before shipment.
- Integrated Double-Entry Accounting and Virtual Wallets: Every taka earned, held in pending status, transferred, or withdrawn is tracked through an immutable financial ledger, giving administrators and resellers total financial transparency.

---

## Main Goal of the Project

The central objective of Swapnobaz is to democratize e-commerce entrepreneurship by removing the four traditional barriers to entry: capital investment for inventory, warehousing and logistics management, technical web development expertise, and complex payment gateway licensing.

The platform establishes a self-sustaining network where:
- Manufacturers and wholesalers expand their distribution footprint overnight across hundreds of active reseller storefronts.
- Aspiring entrepreneurs launch fully operational, branded e-commerce stores within minutes with zero startup inventory.
- Retail and wholesale customers enjoy dependable delivery, transparent order tracking, and high product quality.

---

## Problems Solved by the Platform

1. High Upfront Inventory and Warehousing Costs:
Starting an e-commerce brand traditionally requires thousands of dollars in bulk stock and warehouse leasing. Swapnobaz completely removes this barrier through a centralized mother inventory model.

2. Courier Returns (RTO) and Fraudulent Fake Orders:
Cash on Delivery (COD) in Bangladesh experiences return rates exceeding 25% due to fake orders, causing significant courier fee losses. Swapnobaz integrates fraud detection to flag high-risk customers before parcel dispatch.

3. Complex Financial Accounting Across Distributed Channels:
Managing commissions, supplier payouts, shipping deductions, and customer returns across multiple sales channels frequently results in calculation errors and lost revenue. Swapnobaz automates this with an internal double-entry ledger.

4. Technical and Financial Barriers to Creating Online Stores:
Traditional SaaS platforms charge expensive monthly fees in USD, which are difficult to pay in emerging markets, and require technical expertise to maintain. Swapnobaz provisions localized stores instantly with zero server setup.

5. Fragmented Logistics and Manual Courier Booking:
Manually copying order details into courier merchant panels (Steadfast, Pathao, RedX) causes delays and human error. Swapnobaz provides a single unified courier abstraction layer with one-click automated booking and thermal label printing.

---

## Solution and Real-World Impact

Swapnobaz provides an all-in-one platform where suppliers upload products once to the mother catalog, and resellers select items to showcase in their custom storefronts with their own profit margins.

- For Resellers: Instant store creation, zero inventory overhead, automated order fulfillment, automated profit calculation, and verified payouts to bKash, Nagad, or Bank accounts.
- For Suppliers & Mother Business: Rapid sales scaling through a distributed network of motivated sellers, centralized inventory control, and automated dispatch operations.
- For End Buyers: A seamless, high-speed shopping experience with real-time SMS tracking, responsive interfaces, and dependable courier delivery.

---

## Key Features Breakdown

### 1. Multi-Tenant SaaS Subdomain and Custom Domain Engine

Swapnobaz dynamically provisions a branded, fully isolated storefront for every approved reseller. The storefront operates on a unique subdomain (e.g., storename.swapnobaz.com) or maps to a custom domain via CNAME. All tenant records (products, orders, customers, banner sliders, theme settings) are logically isolated in MongoDB using a strict resellerId partition key.

- How it Works: Next.js middleware intercepts incoming HTTP requests, parses the Host header, resolves the tenant identity from MongoDB, and rewrites the internal request URL to the reseller storefront path without altering the browser address bar.
- User Benefit: Resellers build an independent brand identity with custom themes, logos, and domain names without paying third-party hosting fees.
- Technical Challenge and Solution: Next.js App Router does not natively provide multi-tenant dynamic routing. A custom edge proxy middleware was engineered to perform fast in-memory and cached domain lookups and handle URL rewrites transparently.
- Non-Technical Challenge and Solution: Non-technical resellers needed a simple onboarding experience. A step-by-step store setup wizard with real-time preview was implemented in the reseller dashboard.
- Technologies Used: Next.js 15 Middleware, MongoDB, Mongoose, NextAuth.js, Tailwind CSS.

---

### 2. Automated Reverse Order Routing Workflow

When a retail customer places an order on any reseller storefront, the system initiates an automated fulfillment workflow that coordinates inventory, logistics, and financial tracking without requiring manual reseller intervention.

- How it Works: The order is recorded under the reseller namespace while simultaneously checking the mother catalog stock. The system triggers the configured courier API (Steadfast, Pathao, or RedX), receives a consignment tracking code, attaches it to the order, and updates the reseller virtual wallet with a pending commission. Once the courier confirms delivery, the funds move automatically from pending to cleared balance.
- User Benefit: Resellers focus exclusively on marketing and sales while the mother warehouse and automated background workers handle all picking, packing, shipping, and collection.
- Technical Challenge and Solution: Courier providers have incompatible API schemas, auth flows, and status codes. A unified courier interface pattern was built to normalize payloads and status webhooks into a standard internal state machine.
- Non-Technical Challenge and Solution: Managing API rate limits and network timeouts during peak sales hours. A BullMQ and Redis asynchronous queue was integrated to manage dispatch jobs with exponential backoff retries.
- Technologies Used: Next.js Route Handlers, MongoDB Atomic Operations, BullMQ, Redis, Steadfast API, Pathao API, RedX API.

---

### 3. BD Courier Fraud Detection and Risk Scoring Engine

To combat fraudulent Cash-on-Delivery orders, Swapnobaz features an integrated fraud prevention engine that checks customer phone numbers against delivery history records across major Bangladeshi courier networks.

- How it Works: When an order is placed, an asynchronous worker queries the courier fraud intelligence API using the customer phone number. It calculates a risk score based on total delivered vs. returned parcels and displays a color-coded fraud badge (Safe, Moderate Risk, High Risk) directly on the admin and reseller order management screens.
- User Benefit: Store owners and admins identify fake or serial-return customers before dispatching parcels, saving substantial shipping and return penalty fees.
- Technical Challenge and Solution: Live API lookups during checkout could cause checkout latency. The fraud analysis is decoupled from the checkout response and executed as a background task, with results cached in Redis for 24 hours.
- Non-Technical Challenge and Solution: Setting accurate risk thresholds to avoid canceling genuine orders. Thresholds were calibrated against real delivery data to minimize false positives.
- Technologies Used: BD Courier Fraud API, Redis Caching, Next.js Server Actions, MongoDB.

---

### 4. Dynamic System Design and Live UI Theme Switcher

Platform super administrators have complete control over the visual presentation of the storefronts through a centralized System Design configuration panel.
- User Benefit: Complete visual redesigns and holiday marketing themes can be applied instantly across the entire platform without modifying source code or triggering server deployments.
- Technical Challenge and Solution: Dynamically updating colors without triggering CSS build steps. Implemented by binding all shadcn/ui components and custom styles to CSS custom properties injected directly into the HTML root element.
- Non-Technical Challenge and Solution: Ensuring consistent aesthetic quality across all 216 possible component combinations. Each version was designed with strict modular constraints to ensure visual harmony regardless of combination.
- Technologies Used: Next.js App Router, CSS Variables, Tailwind CSS, shadcn/ui, Lucide Icons, MongoDB GlobalSettings Model.

---

### 5. Automated Double-Entry Ledger and Virtual Wallet System

Financial reliability is guaranteed through an integrated double-entry accounting engine and virtual wallet architecture for every reseller.

- How it Works: Every financial transaction creates balanced debit and credit entries in the LedgerTransaction collection. Reseller wallets maintain both cleared (available for withdrawal) and pending (awaiting courier delivery confirmation) balances. When an order completes, pending balances automatically transition to cleared funds. Resellers can request payouts to bKash, Nagad, Rocket, or Bank accounts, which admins review and approve directly from the accounting dashboard.
- User Benefit: Complete transparency with zero discrepancies. Resellers track every paisa earned, while platform owners maintain a centralized balance sheet of cash, bank, and mobile financial services (MFS) accounts.
- Technical Challenge and Solution: Preventing race conditions and double-spending during concurrent order updates or payout requests. MongoDB atomic operators ($inc) combined with database-level transactions were implemented in the financial service layer.
- Non-Technical Challenge and Solution: Designing an intuitive financial interface for non-accountant users. A dual-interface approach was created: a simplified wallet UI for resellers and a full double-entry ledger view for administrators.
- Technologies Used: MongoDB Atomic Operators, Mongoose Transactions, Next.js Server Actions, LedgerAccount and LedgerTransaction Models.

---

### 6. B2B Wholesale Bulk Order Matrix

For wholesale and corporate buyers who purchase goods in bulk, Swapnobaz provides an interactive 2-dimensional variant matrix order interface.

- How it Works: Instead of adding each size and color variation to a cart individually, buyers are presented with a matrix where rows represent colors and columns represent sizes. Buyers enter quantities directly into each cell and add dozens of variant combinations to the cart with a single click.
- User Benefit: Reduces wholesale ordering time from ten minutes to under thirty seconds, minimizing errors and improving buyer satisfaction.
- Technical Challenge and Solution: Dynamically rendering matrix grids from arbitrary, irregular variant data (such as sizes only available in certain colors) with live per-cell inventory validation. Built using reactive state machines that validate stock boundaries per matrix cell in real time.
- Non-Technical Challenge and Solution: Ensuring the interface remains responsive and readable on mobile devices. A responsive card-based fallback view was engineered for smaller screens.
- Technologies Used: React State Hooks, Next.js, MongoDB Product Model, Tailwind CSS.

---

### 7. Automated Thermal Sticker Courier Invoice Generator

Swapnobaz includes a built-in courier label generator that formats and prints standard 100mm x 100mm thermal shipping stickers directly from the browser.

- How it Works: The invoice generator pulls recipient details, order totals, Cash-on-Delivery amounts, and courier consignment IDs, rendering a printable label featuring a Code39 barcode of the Order ID and a dynamic QR code linking to live order tracking.
- User Benefit: Eliminates manual handwritten invoices and third-party label software, speeding up daily warehouse dispatch operations.
- Technical Challenge and Solution: Achieving pixel-perfect print dimensions that match physical thermal printer hardware across various operating systems. Implemented via dedicated print media queries and strict millimeter-based layout rules.
- Non-Technical Challenge and Solution: Ensuring barcode readability across standard laser and optical courier scanners. Verified through barcode contrast testing and error correction level tuning.
- Technologies Used: Browser Print API, React Barcode (Code39), Dynamic QR Code Generator, CSS Print Media Styles.

---

## User Roles, Permission Architecture & Default Test Credentials

Default Password for All Seeded Test Accounts: `Password123!`

### 1. Admin
- Role: `admin`
- Test Email: `admin1@swapnobaz.com`
- Permissions and Accessible Scope: Operational control: Orders, Inventory, Reseller Management, Fraud Checker, Payouts, Chalans, and Platform Settings.

### 2. Manager
- Role: `manager`
- Test Email: `manager1@swapnobaz.com`
- Permissions and Accessible Scope: Catalog management, Categories, Brands, Orders, Offers, Chalans, Client Bills, Blog CMS, Banners, and Subscribers.

### 3. Moderator
- Role: `moderator`
- Test Email: `moderator1@swapnobaz.com`
- Permissions and Accessible Scope: Catalog management, Categories, Brands, Orders, Offers, Chalans, Client Bills, Blog CMS, Banners, and Subscribers.

### 4. Reseller
- Role: `reseller`
- Test Email: `reseller1@swapnobaz.com`
- Permissions and Accessible Scope: Dedicated Reseller Panel (`/reseller/dashboard`), custom pricing & profit margins, product selection, virtual wallet, and profit logs.

### 5. User (Customer)
- Role: `user`
- Test Email: `user1@swapnobaz.com`
- Permissions and Accessible Scope: Storefront shopping, wishlist, cart, checkout, and live order tracking (`/track-order`).

---

## Comprehensive Technology Stack

### Frontend Layer
- Framework: Next.js 15 (React 19, App Router architecture)
- Styling: Tailwind CSS with dynamic CSS variable integration
- UI Components: shadcn/ui built on Radix UI primitives
- Icons: Lucide React
- Notifications: Sonner (toast notifications) and SweetAlert2 (administrative confirmations)
- Data Presentation: Custom responsive layouts, print-ready CSS stylesheets

### Backend and Server Architecture
- Runtime: Node.js (version 18.17.0+)
- Server Architecture: Next.js Route Handlers and Server Actions
- Multi-Tenancy: Edge middleware proxy with dynamic host-header resolution
- Asynchronous Processing: BullMQ with Redis for background sync and queue management
- PDF and Barcode Generation: jsPDF, React Barcode, QRCode engine

### Database and Caching Layer
- Primary Database: MongoDB Atlas / Community Edition
- ODM: Mongoose with strict schema validation and compound indexing
- Caching and Queues: Redis for session caching, courier rate limiting, and BullMQ queues
- Data Integrity: Atomic increments ($inc) and MongoDB transactions for ledger accounts

### Authentication and Security
- Authentication: NextAuth.js (Auth.js v5) with JWT session strategy
- OAuth Providers: Google OAuth 2.0 and Credentials provider
- Data Protection: Custom AES-256 encryption helper for sensitive third-party API keys
- Role Enforcement: Centralized route protection in middleware and server actions

### External Third-Party Integrations
- Courier Logistics: Steadfast Courier API, Pathao Logistics API, RedX API
- Fraud Prevention: BD Courier Intelligence API
- Image Storage: ImgBB Cloud API with dynamic multipart uploads
- Email Notifications: Nodemailer with secure SMTP transport

---

## End-to-End System Workflow

### 1. Storefront Resolution Workflow
- Step 1: Customer navigates to a store URL (e.g., myshop.swapnobaz.com or customdomain.com).
- Step 2: Next.js Middleware intercepts the request, reads the Host header, and queries the database for the active reseller tenant.
- Step 3: Middleware rewrites the request internally to the reseller storefront renderer while keeping the original URL in the user browser.
- Step 4: The storefront loads with the reseller branding, active theme, and configured margins.

### 2. Order Fulfillment Workflow
- Step 1: Customer submits an order via the storefront checkout.
- Step 2: An asynchronous BullMQ worker validates the customer phone number via the BD Courier Fraud API.
- Step 3: The order is logged under the reseller account and mother catalog inventory is decremented.
- Step 4: The configured courier API is triggered to create a parcel consignment and retrieve tracking IDs.
- Step 5: The reseller wallet is credited with a pending commission amount.
- Step 6: Warehouse staff print the 100mm x 100mm thermal sticker barcode and dispatch the parcel.
- Step 7: Upon courier delivery confirmation webhook, the pending commission automatically transitions to cleared balance in the reseller wallet.

---

## Complete Setup and Installation Guide

Follow these steps to set up, run, and deploy Swapnobaz from scratch.

### Step 1: Clone the Repository

```bash
git clone https://github.com/MdImranHossen01/swapnobaz2.git
cd swapnobaz2
```

### Step 2: Install Node.js Dependencies

Ensure you have Node.js version 18.17.0 or higher installed:

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a file named `.env.local` in the project root directory and add the following configuration:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/Swapnobaz?retryWrites=true&w=majority

# NextAuth Authentication
AUTH_SECRET=your_random_secret_string_minimum_32_characters
NEXTAUTH_SECRET=your_random_secret_string_minimum_32_characters
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Google OAuth Credentials
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret

# Platform Domain Settings
NEXT_PUBLIC_STORE_NAME=Swapnobaz
NEXT_PUBLIC_ROOT_DOMAIN=swapnobaz.com
NEXT_PUBLIC_API_URL=http://localhost:3000

# Email SMTP Settings
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Image Storage
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key

# Security and Automation
ENCRYPTION_KEY=your_exact_32_character_encryption_key
CRON_SECRET=your_cron_job_secret_key

# Redis Configuration (for background queues)
REDIS_URL=redis://localhost:6379
```

### Step 4: Seed Database with Initial Data

Execute the database seed scripts to populate default administrative accounts, categories, and catalog products:

```bash
node scripts/seed-users.js
node scripts/seed-categories.js
node scripts/seed-products.js
```

### Step 5: Run Development Server

Start the local Next.js development server:

```bash
npm run dev
```

The application will be accessible at:
- Storefront: `http://localhost:3000`
- Admin Dashboard: `http://localhost:3000/admin/dashboard`
- Reseller Dashboard: `http://localhost:3000/reseller/dashboard`

### Step 6: Build for Production

To create an optimized production bundle:

```bash
npm run build
```

### Step 7: Production Deployment on Linux VPS

Install PM2 process manager globally:

```bash
npm install -g pm2
```

Start the Next.js production server:

```bash
pm2 start npm --name "swapnobaz-app" -- start
pm2 save
pm2 startup
```

Start the BullMQ background queue worker (requires Redis running):

```bash
pm2 start npm --name "swapnobaz-worker" -- run worker
pm2 save
```

### Step 8: Configure Nginx Reverse Proxy

Create an Nginx configuration file for your domain (`/etc/nginx/sites-available/swapnobaz`):

```nginx
server {
    listen 80;
    server_name swapnobaz.com www.swapnobaz.com *.swapnobaz.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/swapnobaz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 9: Install Free SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d swapnobaz.com -d www.swapnobaz.com -d *.swapnobaz.com
```

---

## Future Roadmap and Planned Enhancements

- Reseller Mobile App: Dedicated React Native mobile application for resellers to track orders, sales, and wallet withdrawals on the go.
- AI-Powered Catalog Tagging and Marketing Copy: Integrated LLM tools for automatic product categorization and Bengali marketing description generation.
- Real-Time Supplier Inventory Sync: Webhook-based integration with supplier ERP and POS systems to update mother warehouse quantities instantly.
- Cross-Border Dropshipping: Multi-currency support and integration with international fulfillment partners for regional dropshipping expansion.

---

## Documentation Directory

Comprehensive architectural and user documentation is available in the `docs` directory:

- Database Schema Guide: [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) - Complete MongoDB collections, index structures, and data relations.
- API Reference Documentation: [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - Route endpoints, request bodies, and JSON responses.
- Linux VPS Deployment Manual: [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) - Server hardening, PM2, Redis, and Nginx setup.
- Admin Operations Manual: [ADMIN_MANUAL.md](./docs/ADMIN_MANUAL.md) - Guide for catalog management, courier settings, and accounting.
- Reseller Portal Manual: [RESELLER_MANUAL.md](./docs/RESELLER_MANUAL.md) - Guide for store customization, pricing, and withdrawals.

---

## Contributors and Credits

- Lead Developer: Md. Imran Hossen
- Client & Stakeholder: Reza and Swapnobaz Team
- License: Proprietary / Enterprise SaaS License