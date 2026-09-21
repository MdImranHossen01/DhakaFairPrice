# Swapnobaz — Admin Manual
**Version:** 1.0 | **Last Updated:** September 2026
**Access URL:** `/admin/dashboard`
**Roles Covered:** `super_admin`, `admin`, `manager`, `moderator`

---

## 📋 Table of Contents

1. [Role Hierarchy & Permissions](#1-role-hierarchy--permissions)
2. [Dashboard](#2-dashboard)
3. [Orders Management](#3-orders-management)
4. [Product Catalog](#4-product-catalog)
5. [Categories & Brands](#5-categories--brands)
6. [Reseller Management](#6-reseller-management)
7. [Supplier & Bills](#7-supplier--bills)
8. [Finance — Accounts & Ledger](#8-finance--accounts--ledger)
9. [Finance — Expenses & Incomes](#9-finance--expenses--incomes)
10. [Finance — Loans](#10-finance--loans)
11. [Warehouse & Stock](#11-warehouse--stock)
12. [Chalans (Delivery Notes)](#12-chalans-delivery-notes)
13. [Reports](#13-reports)
14. [CMS & Landing Pages](#14-cms--landing-pages)
15. [Marketing, Offers & Coupons](#15-marketing-offers--coupons)
16. [Users & User Management](#16-users--user-management)
17. [Reviews & Subscribers](#17-reviews--subscribers)
18. [Blogs](#18-blogs)
19. [Payouts](#19-payouts)
20. [System Design (Super Admin)](#20-system-design-super-admin)
21. [Settings](#21-settings)
22. [Activity Logs](#22-activity-logs)

---

## 1. Role Hierarchy & Permissions

| Role | Dashboard | Orders | Finance | Users |
|------|-----------|--------|---------|-------|
| `admin` | ✅ Full | ✅ Full | ✅ Full | ✅ Assign Roles |
| `manager` | ✅ View | ✅ View/Edit | ✅ View | ❌ |
| `moderator` | ✅ View | ✅ View | ❌ | ❌ |

> **Admin Assignment:**  `admin` can assign the `admin` role to any user by email from the Users page.

---

## 2. Dashboard

**URL:** `/admin/dashboard`

The central command center showing real-time KPIs:

- **Revenue Overview** — Today, This Week, This Month totals
- **Order Stats** — Pending, Processing, Delivered, Cancelled
- **Low Stock Alerts** — Products nearing depletion
- **Recent Orders** — Quick-view table of latest activity
- **Reseller Activity** — Active resellers and their sales
- **Quick Links** — Jump to commonly used sections

---

## 3. Orders Management

**URL:** `/admin/orders`

### Viewing Orders
- Filter by **Status**: Pending → Processing → Shipped → Delivered → Cancelled
- Filter by **Date Range**, **Reseller**, or **Search** by order ID / customer name
- Click any order row to view full order details

### Order Detail
- Customer info, shipping address, line items
- Change order **status** with one click
- Assign **Courier** and add tracking number
- Generate **Chalan** (delivery note) from order detail

### Abandoned Carts
**URL:** `/admin/abandoned-carts`
View customers who added items to cart but did not checkout. Use for remarketing.

---

## 4. Product Catalog

**URL:** `/admin/catalog` | `/admin/products`

### Mother Catalog (`/admin/catalog`)
The master product repository. All products here are the source of truth.

- **Add Product** — Fill Name, SKU, Category, Brand, Cost Price, Images, Description, Variants
- **Edit Product** — Update any field; changes sync to reseller products via queue
- **Import/Export** — Bulk upload via CSV
- **Stock Management** — Update stock levels per variant

### Products (`/admin/products`)
Filtered view of products by reseller context.

> ⚠️ **Important:** Never delete a product from the Mother Catalog if resellers have active stock. Archive it instead.

---

## 5. Categories & Brands

**URL:** `/admin/categories` | `/admin/brands`

- **Categories** — Hierarchical (Parent → Child). Assign icons and SEO slugs.
- **Brands** — Add brand name, logo, and description.
- Both support **reordering** via drag-and-drop.

---

## 6. Reseller Management

**URL:** `/admin/resellers`

### Viewing Resellers
- See all registered resellers with their status (Active / Suspended)
- View each reseller's: total orders, wallet balance, product count

### Reseller Actions
- **Approve / Suspend** a reseller account
- **Top-up Wallet** — Credit reseller wallet manually
- **View Storefront** — Open their public-facing store
- **Assign Products** — Add Mother Catalog products to their catalog

### Payouts
**URL:** `/admin/payouts`
Manage withdrawal requests from resellers. Approve or reject payout requests. Each action updates the reseller's wallet ledger.

---

## 7. Supplier & Bills

**URL:** `/admin/suppliers` | `/admin/supplier-bills`

### Suppliers
- Add supplier profiles: Name, Contact, Address, Payment Terms
- Each supplier links to products they supply

### Supplier Bills
- Record purchase invoices from suppliers
- Track: Bill Date, Due Date, Amount, Paid Status
- Mark bills as **Paid** (links to accounts/payment method)

---

## 8. Finance — Accounts & Ledger

**URL:** `/admin/accounts` | `/admin/ledger`

### Account Types

| Category | Examples | Can Credit/Debit Directly? |
|----------|----------|-----------------------------|
| **Bank** | Dutch Bangla, City Bank | ✅ Yes |
| **Cash** | Cash in Hand | ✅ Yes |
| **MFS** | bKash Merchant, Nagad | ✅ Yes |

### Creating an Account
1. Click **"+ Add Account"**
2. Fill in **Account Name** and unique **Account Code**
3. Select **Account Type**: MFS / Bank / Cash
   - **MFS**: Choose Provider (bKash/Nagad/Rocket) and Type (Merchant/Agent/Personal)
   - **Bank**: Add Bank Name, Branch, and Account Type (Savings/Current)
4. Add **Account Number** (Bank/MFS only)
5. Set **Opening Balance** (existing balance when entering into system)
6. Optional **Note**
7. Click **Save Account**

### Account Actions (3-dot menu per row)
- **Credit + (Add Money)** — Record incoming funds
- **Debit - (Expense)** — Record outgoing funds
- **Transfer Funds** — Move money between accounts
- **View Ledger** — See full transaction history for that account

### Ledger (`/admin/ledger`)
- Full double-entry style transaction log
- Filter by **Account**, **Date Range**, **Type** (Credit/Debit)
- Every transaction shows: Date, Description, Debit, Credit, Running Balance

---

## 9. Finance — Expenses & Incomes

**URL:** `/admin/expenses-incomes`

### Adding a Transaction
The form has **2 tabs**:

**Journal Tab** (Income / Expense)
- Select **Type**: Income or Expense
- Choose **Category** (dropdown, keyboard-navigable with ↑↓ arrows)
- Select **Payment Account** (which bank/cash/MFS account)
- Enter **Amount**, **Date**, optional **Reference/Note**
- Title auto-fills when category is selected
- Press **Enter** to submit

**Transfer Tab**
- Move funds from one account to another
- Select **From Account** and **To Account**
- Enter **Amount** and **Date**

> 💡 **Tip:** The form stays open after submission so you can add multiple transactions quickly.

---

## 10. Finance — Loans

**URL:** `/admin/loans`

- Record loans given or received
- Track: Borrower/Lender, Amount, Interest Rate, Due Date, Repayment Status
- Each repayment entry updates the loan balance

---

## 11. Warehouse & Stock

**URL:** `/admin/warehouse`

- View all stock by location/warehouse
- Transfer stock between warehouses
- Stock-in / Stock-out recording

### Low Stock Alerts
**URL:** `/admin/low-stock`
Products where current stock falls below the configured threshold.

### Upcoming Expiry
**URL:** `/admin/upcoming-expiry`
Perishable products expiring within the configured warning window.

---

## 12. Chalans (Delivery Notes)

**URL:** `/admin/chalans`

- Auto-generated from orders or created manually
- Contains: Customer info, product list, quantities, delivery address
- Printable PDF format

---

## 13. Reports

**URL:** `/admin/reports`

Available report types:
- **Sales Report** — Revenue by date range, category, or reseller
- **Purchase Report** — Supplier bills summary
- **Expense Report** — All outgoing costs
- **Profit & Loss** — Net financial position
- **Stock Report** — Current inventory valuation

All reports are **exportable** as CSV or PDF.

---

## 14. CMS & Landing Pages

**URL:** `/admin/cms` | `/admin/landing-pages`

### CMS
Manage website content sections:
- Hero banners, promotional blocks, footer content
- Rich text editor with image upload

### Landing Pages
- Create custom marketing pages with drag-and-drop sections
- Set custom URL slugs
- Toggle pages live/draft

---

## 15. Marketing, Offers & Coupons

**URL:** `/admin/marketing` | `/admin/offers` | `/admin/coupons`

### Marketing
Campaign management — email/SMS blast configurations.

### Offers
- Flash sale configuration (time-limited)
- Bundle offers (buy X get Y)
- Set discount percentage or fixed amount

### Coupons
- Create coupon codes with usage limits
- Set minimum cart value, expiry date
- Track usage count per coupon

---

## 16. Users & User Management

**URL:** `/admin/users`

- View all registered users (customers and staff)
- **Assign Role**: Enter email → assign `admin` role
- **Suspend/Activate** user accounts
- View order history per user

---

## 17. Reviews & Subscribers

**URL:** `/admin/reviews` | `/admin/subscribers`

### Reviews
- Moderate product reviews
- Approve, reject, or reply to customer reviews

### Subscribers
- View newsletter/notification subscriber list
- Export for email campaigns

---

## 18. Blogs

**URL:** `/admin/blogs`

- Write and publish blog posts
- SEO fields: Meta Title, Meta Description, Slug
- Tags and categories for organization
- Schedule publish date

---

## 19. Payouts

**URL:** `/admin/payouts`

- View all reseller payout requests
- **Approve** — Marks as paid, deducts from reseller wallet
- **Reject** — Returns balance, notifies reseller
- Filter by: Pending / Approved / Rejected / Date

---

## 20. System Design (Super Admin)

**URL:** `/admin/system-design`

> ⚠️ **Super Admin Only** — This section is protected and only accessible to `super_admin`.

Configure platform-wide settings:

| Setting | Description |
|---------|-------------|
| **Theme & Branding** | Logo, primary/secondary colors, typography |
| **Navbar Version** | Select Navbar V1–V6 for the storefront |
| **Footer Version** | Select Footer V1–V6 |
| **Product Card Version** | Select Product Card V1–V6 |
| **Project Expiration Date** | Set when the platform license expires |
| **Site Name & Meta** | Global SEO title and description |
| **Contact & Social** | Phone, email, social media links |

> **CSS Variables** — All colors use `src/app/theme.css` CSS variables. Changes here affect the entire storefront dynamically.

---

## 21. Settings

**URL:** `/admin/settings`

- **General Settings** — Store name, currency, timezone
- **Shipping Settings** — Default shipping rates, zones
- **Payment Gateways** — Configure bKash, Nagad, Stripe credentials (per reseller context)
- **Notification Settings** — Email/SMS templates and triggers
- **Tax Configuration** — VAT/TAX rates by category

---

## 22. Activity Logs

**URL:** `/admin/activity-logs`

Full audit trail of all admin actions:
- Who did what and when
- IP address and session info
- Filter by User, Action Type, Date Range

> 💡 Use activity logs to investigate unauthorized changes or trace data issues.

---

## 🔐 Security Best Practices

1. **Never share** `super_admin` credentials
2. **Use strong passwords** — minimum 12 characters
3. **Review activity logs** weekly for suspicious actions
4. **Assign minimum required roles** — do not give `admin` when `manager` suffices
5. **Set project expiration** correctly to avoid unexpected lockouts

---

## 📞 Support

For technical issues, refer to:
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — Data model reference
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — API endpoint reference
- [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) — Infrastructure guide
