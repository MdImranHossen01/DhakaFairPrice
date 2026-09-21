# Project Proposal: Swapnobaz – Premium B2B + B2C Multi-Vendor Dropshipping Platform & SaaS

**Prepared For:** Reza (Client) & Swapnobaz Team  
**Prepared By:** Md. Imran Hossen  
**Date:** July 19, 2026  
**Subject:** Updated Project Proposal & Agreement with Clarification Checklist  

---

## 1. Project Overview
The goal of this project is to build a premium, highly automated, and high-performance **B2B + B2C Multi-Vendor Dropshipping Platform** under a **SaaS (Software-as-a-Service) model**. The system empowers resellers to run their own storefronts under subdomains/custom domains, syncs products in real-time from the Mother Website, and automates order fulfillment and financial payouts.

This document serves as the formal agreement, detailing all features requested in the checklist and indicating their implementation status (Included, Partially Included, or Excluded/Additional) for the quoted price.

---

## 2. Technology Stack (Tech Stack)
*   **Frontend Framework:** Next.js (React, App Router, SSR/ISR optimized for speed & SEO).
*   **Backend Framework:** Next.js (Route Handlers & Server Actions, Node.js runtime).
*   **Styling:** Tailwind CSS (Modern, fluid layout styling using CSS variables).
*   **UI Components:** shadcn/ui (Sleek components, Sonner for toast alerts).
*   **Administrative Alerts:** SweetAlert2 (Admin validations and confirmations).
*   **Icons:** Lucide React.
*   **Database:** MongoDB (Scalable database with tenant-keyed data isolation).
*   **Caching & Queue:** Redis + BullMQ (For background synchronization, webhooks, and API optimization).
*   **Hosting Compatibility:** Node-supported VPS (DigitalOcean, AWS, or local hostings).

---

## 3. Feature Matrix & Clarification Checklist

Below is the complete status breakdown of all requested features under the **Base Project Scope (BDT 30,000)**:

### A. Core Platform & Infrastructure

*   **1. Multi-Tenant SaaS**
    *   **Unlimited Reseller Websites** `[Included]` – Resellers can register and automatically get their own stores.
    *   **Custom Domain Mapping** `[Included]` – DNS CNAME configuration support for resellers to point their custom domains.
    *   **Subdomain Support** `[Included]` – Dynamic subdomains (e.g., `reseller.swapnobaz.com`).
    *   **Individual Admin Panel** `[Included]` – Private dashboard for each reseller to customize settings, logos, and check sales.
    *   **Independent Database Isolation** `[Partially Included]` – **Logical Isolation:** MongoDB scopes all queries by `tenantId`/`resellerId` to ensure complete data security. *Physical Database Isolation (separate database per tenant)* is excluded as it requires enterprise cloud clusters and high infrastructure budgets.

*   **2. Mother Inventory Management**
    *   **Single Product Database** `[Included]` – Main master catalog controlled by the Super Admin.
    *   **SKU Management** `[Included]` – Automatic and manual unique SKU generation.
    *   **Barcode Support** `[Partially Included]` – Generates and displays barcodes/QR codes on invoices and products. Hardware scanner integration is excluded.
    *   **Stock Synchronization** `[Included]` – Real-time master inventory tracking.
    *   **Warehouse Management** `[Included]` – Main inventory hub tracking.
    *   **Multi-Warehouse Support** `[Not Included]` – *Requires additional development.* Base scope supports a centralized main warehouse.

*   **3. Real-Time Product Synchronization**
    *   **Automatic Sync Engine** `[Included]` – Instant sync to tagged reseller storefronts for: Product Creation, Product Update, Price Update, Stock Update, Image Update, Description Update, Category Update, and Product Status (Active/Inactive) via Webhooks/API.

---

### B. Order Routing & Pricing

*   **4. Reverse Order Routing**
    *   **Reverse Order Pipeline** `[Included]` – Fully automated workflow: Customer $\rightarrow$ Reseller $\rightarrow$ Mother Website $\rightarrow$ Supplier $\rightarrow$ Courier API $\rightarrow$ Auto Tracking $\rightarrow$ Reseller Wallet $\rightarrow$ Customer Delivery.

*   **5. Multi-Level Pricing Engine**
    *   **Dynamic Calculations** `[Included]` – Stores and calculates Supplier Price, Mother Price, Reseller Cost, Retail Price, and Net Profit Margins dynamically.

*   **6. Wallet & Settlement System**
    *   **Reseller & Supplier Wallet** `[Included]` – Virtual wallets tracking lifetime earnings, cleared balances, and pending settlements.
    *   **Commission Ledger & History** `[Included]` – Detailed ledger tracking every transaction, order ID, and credit/debit.
    *   **Due Balance & Payments** `[Included]` – Outstanding balance tracking and payment logs.
    *   **Auto Settlement** `[Partially Included]` – System auto-calculates and queues payout requests; Super Admin manually/semi-automatically releases money via MFS/Bank transfer upload for security auditing.

*   **7. API-First Architecture**
    *   **REST Endpoints** `[Included]` – Complete REST API endpoints for: Product, Order, Inventory, Wallet, Courier, Payment, Customer, and Authentication.

*   **8. Webhook System**
    *   **Event Hooks** `[Included]` – Automated webhooks trigger on: Product/Stock Updated, Order Created/Cancelled, Payment Received, and Courier Tracking Updated.

---

### C. Advanced Modules & Integrations

*   **9. AI Automation**
    *   **AI Product Description** `[Partially Included]` – Integrated with OpenAI / Gemini API (Client to provide API keys; system generates descriptions on click).
    *   **AI SEO & FAQ** `[Not Included]` – *Requires additional development.*
    *   **AI Image Optimization** `[Partially Included]` – Automated compression, resizing, and WebP conversion. (Advanced generative AI editing is excluded).
    *   **AI Customer Reply & Auto Translation** `[Not Included]` – *Requires additional development.*

*   **10. CRM**
    *   **Customer & Lead Management** `[Partially Included]` – Customer directories, purchase histories, and simple contact form lead generation.
    *   **Corporate Sales, Quotation, Follow-up** `[Not Included]` – B2B wholesale pricing is included; corporate pipelines and lead follow-up flows are excluded.

*   **11. ERP**
    *   **Purchase & Supplier** `[Included]` – Basic Supplier purchase tracking and supplier profiles.
    *   **Warehouse** `[Included]` – Central stock control.
    *   **Accounts, Expenses, Income, Profit** `[Included]` – Dynamic tracking of expenses, revenues, and net platform profit metrics.

*   **12. Accounting**
    *   **General Ledger** `[Partially Included]` – Ledger of system-wide incomes, payout settlements, and order costs.
    *   **Profit & Loss** `[Partially Included]` – High-level summary of Cost of Goods Sold (COGS), payouts, and net income.
    *   **Cash Book, Bank Book, VAT, Tax, Balance Sheet** `[Not Included]` – Standard corporate double-entry accounting features are excluded.

*   **13. HRM**
    *   **Role Permission** `[Included]` – Role-Based Access Control (RBAC) for Super Admin, Manager, Moderator, Supplier, Reseller.
    *   **Employee, Attendance, Leave, Payroll** `[Not Included]` – *Requires additional development.*

*   **14. Marketing**
    *   **Facebook Pixel, Google Analytics, TikTok Pixel** `[Included]` – Integration ready. (Client provides Pixel/Analytics IDs).
    *   **Email Marketing & SMS Integration** `[Not Included]` – Excluded from this scope and requires additional development (No SMS notifications or promotional email flows will be developed).
    *   **WhatsApp & Affiliate System** `[Not Included]` – *Requires additional development.*

*   **15. Mobile API Ready**
    *   **Cross-Platform Mobile APIs** `[Included]` – Structured JSON REST APIs ready to connect with future mobile applications (Android, iOS, Flutter, React Native).
    *   **Android & iOS Mobile Applications (App Development)** `[Not Included]` – Building the actual mobile applications themselves is excluded from this scope and requires a separate contract/budget.

*   **16. Courier Integration**
    *   **Steadfast, Pathao, RedX** `[Included]` – Full API integration for automatic order booking and tracking sync.
    *   **Paperfly, eCourier** `[Not Included]` – Excluded from this scope and requires additional development.
    *   **Sundarban Courier** `[Not Included]` – Excluded from this scope (Sundarban Courier does not support public API automation).

*   **17. Payment Gateway**
    *   **bKash, Nagad, SSLCommerz, Stripe** `[Included]` – Full integration ready (Client must provide API credentials).
    *   **Rocket, ShurjoPay, PayPal** `[Not Included]` – Excluded from this scope and requires additional development (Note: Rocket payments can still be received indirectly if SSLCommerz has Rocket activated in their channel).

*   **18. Supplier Portal**
    *   **Supplier Admin** `[Included]` – Portal for Supplier logins, inventory uploads, order view, and payout history.

*   **19. Reseller Dashboard**
    *   **Reseller Metrics** `[Included]` – Dashboard displaying Sales, Profits, Wallets, Commission logs, and performance analytics.

*   **20. Super Admin Dashboard**
    *   **Super Dashboard** `[Included]` – Analytics for Platform Revenue, Top Resellers, Top Products, Inventory Reports, and Financials.

---

### D. System Performance & Security

*   **Security** `[Included]` – Role-Based Permission, Activity logs, Login history. Basic database backup scripting. Two-Factor Authentication (2FA) is **Partially Included** via Email OTP verification.
*   **SEO** `[Included]` – Dynamic XML Sitemaps, Robots.txt, Canonical URLs, Meta Tag Injection, Open Graph (OG) tags, and Schema.org markup.
*   **Performance** `[Included]` – Redis cache, Queue management (BullMQ/Mongo Queue), CDN ready assets, Image optimization, Lazy loading of components.

---

### E. Project Documentation

*   **Documentation Deliverables** `[Included]` – Complete delivery of the following:
    *   **Database Schema & Collection Structure** – Since the system uses MongoDB (NoSQL), structured schema descriptions and collection definitions will be provided instead of a traditional visual ER Diagram.
    *   **API Documentation** – Interactive Swagger/Postman collection documentation for all backend endpoints.
    *   **Guides & Manuals** – Step-by-step Deployment Guide, Server Configuration Guide, Admin Manual, and Reseller/User guides.

---

### F. Premium Storefront, UX & Specialized Features

*   **1. Custom UX & Visual Experience**
    *   **Fully Responsive Design** `[Included]` – Seamless rendering across mobile, tablet, and desktop viewports.
    *   **Smooth Scrolling & Enhanced UX** `[Included]` – Smooth page transitions and fluid navigation.
    *   **Premium Animations** `[Included]` – Micro-interactions and polished UI animations using Framer Motion/CSS.
    *   **Splash Screen** `[Included]` – Beautiful, smooth entry loading screen for mobile/web app users.
    *   **Skeleton Loading** `[Included]` – Content placeholders during data fetching to reduce perceived latency.
    *   **Day and Night Mode (Dark Mode)** `[Included]` – One-click switcher for light and dark theme preferences.
    *   **Theme & Font Customization (থিম ওর ফন্ট পরিবর্তন)** `[Included]` – Dynamic system configuration panel for administrators.

*   **2. Storefront Modules & Conversions**
    *   **PWA Web APP** `[Included]` – Progressive Web App capabilities for app-like installation and offline caching.
    *   **Free Chatbot / AI Chatbot** `[Included]` – AI-powered customer assistant/chatbot for instant support.
    *   **Voice Search Functionality** `[Included]` – Integrated speech-to-text search engine for product queries.
    *   **Advanced Product Filtering** `[Included]` – Multi-attribute filters (price, categories, attributes, etc.).
    *   **Wishlist Functionality** `[Included]` – Customers can save products to purchase or view later.
    *   **Quick View Modal** `[Included]` – Modal overlay for rapid product detail review without page reload.
    *   **Customer Reviews & Ratings** `[Included]` – User-generated reviews, ratings, and feedback section.
    *   **Blog & CMS Support** `[Included]` – Content management system for posting updates, news, and SEO articles.
    *   **Landing Page Builder (ল্যান্ডিং পেজ)** `[Included]` – Dynamic landing page generation for single product promotion campaigns.
    *   **B2B Bulk Order Form (Grid)** `[Included]` – A unified interface allowing wholesale buyers to add multiple variants (sizes, colors, and quantities) to the cart in a single click.
    *   **Order Tracking Page** `[Included]` – Public order tracker using Order ID to display shipment stages (Pending, Shipped, Delivered).

*   **3. Sales, Orders & Operations**
    *   **Manual Order Processing (ম্যানুয়াল অর্ডার)** `[Included]` – Ability for admins/moderators to create orders on behalf of clients.
    *   **Delivery Challan (ডেলিভারি চালান)** `[Included]` – Automatically generated delivery slips and packaging slips.
    *   **Sticker Invoice** `[Included]` – Mini-format thermal sticker invoices for parcel shipping labels.
    *   **Dynamic Delivery Charge** `[Included]` – Zone-based/weight-based dynamic delivery fee calculation.
    *   **Offer & Discount Engine (ওফার তৈরি)** `[Included]` – Admin control panel to create limited-time promotional offers and deals.
    *   **Dynamic Discount Coupons** `[Included]` – Promo code system supporting percentage/fixed discounts.
    *   **Loyalty Program** `[Included]` – Customer reward points program based on purchase volumes.
    *   **Incomplete Orders Tag** `[Included]` – Ability to tag and track incomplete/draft/abandoned orders for reseller follow-up.
    *   **Reseller Personal Products & Shared Catalog** `[Included]` – Resellers can add their personal products to their store, which can optionally be opened/made visible for every reseller on the platform to sell. When an order is placed for such a product, it is automatically sent to the reseller who uploaded/owns the product (acting as the supplier for routing and fulfillment).

*   **4. Security, Accounts & Admin**
    *   **Map Integration** `[Included]` – Google Maps / OpenStreetMap integration for delivery address selection.
    *   **Abandoned Cart Recovery (Abandants Cart Check)** `[Included]` – System to track and report incomplete checkouts.
    *   **Fraud Detection Engine (Fraud Checker / Fraud Detect)** `[Included]` – Identifies potential duplicate orders, fake profiles, and return risks using BD Courier Fraud Checker APIs (Steadfast, Pathao, RedX, etc. to analyze customer delivery history).
    *   **Short Product / Low Stock Alert** `[Included]` – Dashboard and email alerts when stock drops below threshold.

*   **5. Marketing & SEO**
    *   **Free Server-Side Tracking** `[Included]` – High-accuracy server-to-server tracking APIs.
    *   **GTM Setup** `[Included]` – Google Tag Manager container setup.
    *   **CRO Optimization** `[Included]` – Conversion Rate Optimization updates to improve checkout funnel efficiency.
    *   **Twitter Cards** `[Included]` – Optimized previews on X (Twitter).

---


## 4. Contract Clauses & Ownership (All Mandatory Clauses Confirmed)

We explicitly confirm the following agreement clauses:
1.  **Complete Source Code Ownership:** 100% ownership of frontend and backend codebase will be transferred to the client.
2.  **No Hidden Fees:** No recurring development charges or hidden setup fees.
3.  **No Per-Reseller Charge:** The system supports unlimited resellers without licensing fees.
4.  **Unlimited Resellers, Products, and Orders:** Absolutely no limits enforced by the code; restricted only by server capacity.
5.  **Database & API Ownership:** Entire database schemas, collections, and API endpoints are 100% owned by the client.
6.  **Minimum One-Year Bug Warranty:** Free fixes for code-related bugs and errors for 365 days after delivery.
7.  **Free Deployment:** Complete initial deployment to the client's VPS, SSL installation, and configuration setup.
8.  **Free Data Migration:** Initial import of existing product catalog/inventories from CSV/Excel sheets.
9.  **Git Repository Access:** Full collaborator/ownership access to the private GitHub repository.
10. **Server Root Access & Admin Credentials:** All server management access keys and master admin credentials will be transferred upon project completion.
11. **Complete Documentation Included:** Delivering Database Schema/Collection Structure documentation, API Documentation (via Swagger/Postman), Deployment Guides, Server Setup Sheets, Admin Manuals, and Reseller/User guides.

---

## 5. Excluded Features (Optional Upgrade Packages)
The following enterprise modules are excluded from the BDT 30,000 quoted price but can be added now or in a future phase:

1.  **Full ERP & Advanced Corporate Accounting Module:** *+BDT 30,000*  
    *(Includes cash/bank books, Balance Sheet, VAT/Tax calculation systems, and detailed purchase cycle).*
2.  **HRM & Staff Attendance Management Module:** *+BDT 20,000*  
    *(Includes employee attendance logs, leave management, and monthly automated payroll).*
3.  **Advanced AI Suite & WhatsApp Automation:** *+BDT 15,000*  
    *(Includes AI-powered Customer Support Reply chat, Auto Translation, and WhatsApp API notifications).*

---

## 6. Financial Investment, Milestones & Timeline (4 Months)

*   **Total Development Cost (Base Scope):** 30,000 BDT (BDT Thirty Thousand only) – *This fee covers software development, database design, integration programming, and initial setup.*
*   **Advance Payment:** 5,000 BDT (BDT Five Thousand only) required to initiate the project.
*   **Timeline:** 3 Months (including architecture design, dashboard development, synchronization engines, integrations, and QA testing).
*   **Excluded Infrastructure Costs (Paid Separately by Client):**
    *   Domain registration and yearly renewal fees.
    *   Hosting server/VPS setup and recurring yearly subscription costs.
    *   Third-party API charges (e.g., SMS gateway credits, bulk SMTP email services, paid map APIs).
    *   Payment gateway setup, merchant registration fees, or transaction commission charges.

---

**Acceptance of Proposal:**
By proceeding with the advance deposit, both parties agree to the scope of work, features, and terms detailed in this proposal.

*Md. Imran Hossen*  
*Lead Full-Stack Developer*
