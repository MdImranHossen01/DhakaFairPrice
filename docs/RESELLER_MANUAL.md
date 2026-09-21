# Swapnobaz — Reseller Manual
**Version:** 1.0 | **Last Updated:** September 2026
**Access URL:** `/reseller/dashboard`
**Audience:** Registered Resellers / Tenant Store Owners

---

## 📋 Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Managing Your Products](#3-managing-your-products)
4. [Orders Management](#4-orders-management)
5. [Chalans (Delivery Notes)](#5-chalans-delivery-notes)
6. [Finance — Expenses & Incomes](#6-finance--expenses--incomes)
7. [Finance — Ledger](#7-finance--ledger)
8. [Wallet](#8-wallet)
9. [CMS — Your Store Content](#9-cms--your-store-content)
10. [Offers & Coupons](#10-offers--coupons)
11. [Marketing](#11-marketing)
12. [Bills](#12-bills)
13. [Low Stock & Upcoming Expiry](#13-low-stock--upcoming-expiry)
14. [Users (Your Customers)](#14-users-your-customers)
15. [Settings](#15-settings)
16. [Tips & Best Practices](#16-tips--best-practices)

---

## 1. Getting Started

### What is Swapnobaz Reseller?
As a reseller, you operate your own branded online storefront powered by the Swapnobaz platform. The Mother system provides you with a product catalog; you set your own retail prices and manage your own customers.

### Account Activation
1. Register at the main platform
2. Wait for **admin approval** of your reseller account
3. Once approved, log in and access your reseller dashboard at `/reseller/dashboard`

### Your Store URL
Each reseller gets a unique subdomain or URL path. Find yours in **Settings → Store Info**.

### What You Can and Cannot Do

| Action | Reseller |
|--------|----------|
| Set your own retail prices | ✅ Yes |
| Add products from Mother Catalog | ✅ Yes (if admin assigns) |
| Modify product base data (name, images) | ❌ No |
| Access other resellers' data | ❌ No |
| Access admin finance (admin accounts) | ❌ No |

---

## 2. Dashboard Overview

**URL:** `/reseller/dashboard`

Your dashboard shows:

- **Today's Sales** — Revenue collected today
- **Pending Orders** — Orders awaiting action
- **Total Products** — Active products in your store
- **Wallet Balance** — Available earnings
- **Recent Orders** — Latest customer activity
- **Quick Actions** — Add transaction, view orders, etc.

---

## 3. Managing Your Products

**URL:** `/reseller/products`

### Your Product Catalog
Products shown here are assigned to you from the Mother Catalog by the admin.

### Setting Your Retail Price
For each product, you can set:
- **Retail Price (Selling Price)** — What your customers pay
- **Markup** — Your profit margin on top of the base cost

> ⚠️ You cannot edit the base product name, images, or description — those are controlled by the Mother Catalog.

### Product Visibility
- **Active** — Visible in your storefront
- **Hidden** — Hidden from customers but still in your list
- Toggle visibility from the product list using the status switch

### Stock Levels
- View current stock levels per product/variant
- Low stock alerts appear on your dashboard when stock is low
- Contact your admin to restock

---

## 4. Orders Management

**URL:** `/reseller/orders`

### Viewing Orders
- See all orders placed in **your store only**
- Filter by **Status**: Pending → Processing → Shipped → Delivered → Cancelled
- Search by Order ID or customer name/phone

### Processing an Order
1. Click on an order to open its detail view
2. Confirm product availability
3. Change status to **Processing**
4. Once dispatched, change to **Shipped** and add tracking number
5. Mark as **Delivered** upon confirmation

### Order Detail Contains
- Customer name, phone, delivery address
- Ordered products with quantities and prices
- Payment method and status
- Order timeline / status history

> 💡 **Tip:** Process orders promptly. Delayed orders affect your store's rating.

---

## 5. Chalans (Delivery Notes)

**URL:** `/reseller/chalans`

A Chalan is a delivery document sent with each shipment.

### Generating a Chalan
- Chalans can be auto-generated when you confirm an order for shipping
- Or create manually from the Chalans page

### Chalan Contents
- Your store name and address
- Customer name and delivery address
- Product list with quantities
- Date and reference number

### Printing
- Each chalan has a **Print** button
- Optimized for A4 paper

---

## 6. Finance — Expenses & Incomes

**URL:** `/reseller/expenses-incomes`

Track your store's cash flow independently from the main admin finance.

### Adding a Transaction

The form has **2 tabs**:

**Journal Tab**
- **Type**: Income or Expense
- **Category**: Select from dropdown (use ↑↓ arrow keys to navigate)
- **Account**: Which wallet/cash account this affects
- **Amount**, **Date**, optional **Note**
- Title auto-fills based on selected category
- Press **Enter** to save quickly

**Transfer Tab**
- Transfer funds between your accounts
- Select From and To accounts, enter amount

> 💡 The form stays open after saving — great for entering multiple transactions in a row.

### Common Income Categories
- Customer Payment
- COD Collection
- Online Transfer Received

### Common Expense Categories
- Delivery Cost
- Packaging Material
- Marketing Spend
- Staff Salary

---

## 7. Finance — Ledger

**URL:** `/reseller/ledger`

A complete transaction-by-transaction history of all money movements in your store.

### Reading the Ledger
| Column | Meaning |
|--------|---------|
| Date | Transaction date |
| Description | What the transaction was for |
| Debit | Money going out |
| Credit | Money coming in |
| Balance | Running balance after this transaction |

### Filtering
- Filter by **Account** — See ledger for a specific cash or bank account
- Filter by **Date Range** — Monthly or custom range
- Filter by **Type** — Credits only or Debits only

---

## 8. Wallet

**URL:** `/reseller/wallet`

Your wallet represents your earnings from the Swapnobaz platform.

### How the Wallet Works
- When a customer order is confirmed and delivered, your profit margin is credited to your wallet
- The admin can also manually top up your wallet

### Viewing Your Wallet
- **Current Balance** — Available to withdraw
- **Pending** — Earnings from orders not yet fully confirmed
- **Transaction History** — All credits and debits with dates

### Requesting a Payout
1. Click **"Request Withdrawal"**
2. Enter the amount (must not exceed available balance)
3. Select your preferred payment method (bKash/Bank)
4. Submit the request
5. The admin will review and approve/reject
6. You will be notified once processed

> ⚠️ Payout requests are manually reviewed by the admin and may take 1–3 business days.

---

## 9. CMS — Your Store Content

**URL:** `/reseller/cms`

Customize how your storefront looks and what content it shows.

### What You Can Customize
- **Hero Banner** — Main banner image and text on your store homepage
- **Promotional Blocks** — Featured categories or offers
- **About Section** — Your store description
- **Contact Info** — Phone, address, social links shown to customers

### Editing Content
1. Go to CMS
2. Select the section you want to edit
3. Upload images, edit text
4. Click **Save**
5. Changes go live immediately

> 💡 Use high-quality banner images (1920×600px recommended) for best results.

---

## 10. Offers & Coupons

**URL:** `/reseller/offers` | `/reseller/coupons`

### Offers
Create time-limited promotional deals for your store:
- **Flash Sale** — Discount a product for a set time period
- **Percentage Off** — e.g. 20% off selected products
- **Fixed Discount** — e.g. ৳100 off

To create an offer:
1. Click **"Create Offer"**
2. Select products to include
3. Set discount type and value
4. Set start and end date/time
5. Save and activate

### Coupons
- Create unique coupon codes for your customers
- Set: Discount amount or percentage, Minimum cart value, Usage limit, Expiry date
- Share codes via WhatsApp, social media, or direct message

---

## 11. Marketing

**URL:** `/reseller/marketing`

Tools to promote your store:

- **Campaign Setup** — Configure email or SMS blasts to your customer list
- **Subscriber List** — Customers who opted in for updates
- **Referral Links** — Generate trackable links to share

---

## 12. Bills

**URL:** `/reseller/bills`

Track bills and invoices for your store operations:

- Supplier bills (if you source additional products yourself)
- Utility or overhead expenses
- Set due dates and mark as paid

---

## 13. Low Stock & Upcoming Expiry

### Low Stock
**URL:** `/reseller/low-stock`

- Shows all products where stock has fallen below the alert threshold
- Use this to request restocking from admin

### Upcoming Expiry
**URL:** `/reseller/upcoming-expiry`

- Shows perishable products expiring soon
- Take action: create offers to clear stock, or contact admin for returns

---

## 14. Users (Your Customers)

**URL:** `/reseller/users`

View and manage the customers who have registered or ordered from **your store only**.

- View customer profiles: Name, Email, Phone, Join Date
- Order history per customer
- You cannot see customers from other resellers' stores

---

## 15. Settings

**URL:** `/reseller/settings`

### Store Information
- Store Name
- Store Tagline / Description
- Store Logo
- Contact Email & Phone
- Physical Address (shown in invoices and chalans)

### Notification Preferences
- Enable/disable email alerts for new orders
- SMS notification settings (if configured)

### Password
- Change your login password from Settings

---

## 16. Tips & Best Practices

### 📦 Product Pricing
- Research competitor prices before setting your retail price
- Keep a healthy margin (at least 15–20%) to cover delivery and overhead
- Use offers strategically during peak seasons (Eid, New Year, etc.)

### 🚚 Order Fulfilment
- Process pending orders within **24 hours**
- Always generate a Chalan before dispatching
- Add tracking numbers promptly when you hand off to courier

### 💰 Finance
- Record all income and expenses — even small ones
- Review your ledger weekly to catch any discrepancies
- Request payouts regularly; don't let balance accumulate unnecessarily

### 🎯 Marketing
- Share your store link on your WhatsApp status and social media daily
- Use coupons for first-time buyers to build your customer base
- Create flash offers during local events to drive traffic

### ⚠️ Common Mistakes to Avoid
- **Don't ignore low stock alerts** — out-of-stock products lose you orders
- **Don't delay order processing** — customers abandon repeat purchases from slow sellers
- **Don't skip entering expenses** — you will not know your true profit

---

## 📞 Getting Help

If you face any issue:
1. Contact your **admin** through the platform messaging
2. For technical problems, use the **Support** link in your dashboard sidebar
3. Check your **Notification Center** for any alerts from the admin team

---

*This manual covers the Reseller panel at `/reseller/`. Features may vary based on your account tier and admin-configured permissions.*
