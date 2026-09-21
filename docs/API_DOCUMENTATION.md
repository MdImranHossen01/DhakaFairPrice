# Swapnobaz – REST API Specification & Integration Reference

This document outlines the RESTful API endpoints for the **Swapnobaz** platform, covering Public Storefront, Reseller Multi-Tenancy, Mother Catalog, Order Processing, Shipping/Courier, Fraud Checks, and Webhooks.

---

## 🔐 Authentication & Headers

- **Session Authentication:** Handled via NextAuth cookies / Bearer JWT tokens.
- **Admin/Moderator Routes:** Require user role `super_admin`, `admin`, `manager`, or `moderator`.
- **Tenant Context:** Subdomain requests pass the tenant subdomain via URL or headers (`x-reseller-subdomain`).

Standard JSON Header:
```http
Content-Type: application/json
Accept: application/json
```

---

## 🛍️ 1. Products & Master Catalog APIs

### `GET /api/products`
Fetch catalog products with pagination, search, category, and price filters.
- **Query Parameters:**
  - `page` (default: 1)
  - `limit` (default: 12)
  - `category` (Category ID / slug)
  - `search` (Keyword search)
  - `minPrice`, `maxPrice`
- **Response `200 OK`:**
```json
{
  "products": [
    {
      "_id": "60d0fe4f5311236168a109ca",
      "name": "Men's Combed Cotton Boxer Briefs",
      "slug": "mens-cotton-boxer-briefs",
      "sku": "SB-BX-001",
      "price": 220,
      "regularPrice": 350,
      "stock": 1400,
      "images": ["https://cdn.swapnobaz.com/p1.webp"],
      "variants": [
        { "color": "Black", "size": "L", "stock": 450, "price": 220 }
      ]
    }
  ],
  "total": 48,
  "totalPages": 4,
  "currentPage": 1
}
```

### `POST /api/products` *(Admin / Supplier)*
Create a new master product.
- **Body:**
```json
{
  "name": "Seamless Modal Trunks",
  "category": "60d0fe4f5311236168a109c1",
  "purchasePrice": 120,
  "price": 180,
  "regularPrice": 290,
  "stock": 500,
  "variants": [
    { "color": "Navy", "size": "XL", "stock": 250, "price": 180 }
  ]
}
```

---

## 📦 2. Orders & Reverse Routing APIs

### `POST /api/orders`
Place a new retail order (from Mother storefront or Reseller store).
- **Body:**
```json
{
  "resellerSubdomain": "trendy",
  "customer": {
    "name": "Tanvir Ahmed",
    "phone": "01711000000",
    "address": "House 12, Road 4, Sector 7",
    "city": "Dhaka",
    "state": "Dhaka"
  },
  "items": [
    {
      "productId": "60d0fe4f5311236168a109ca",
      "variant": { "color": "Black", "size": "L" },
      "quantity": 2,
      "price": 350
    }
  ],
  "deliveryCharge": 70,
  "paymentMethod": "COD"
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "orderId": "651f893e98b71d0012f45101",
  "orderNumber": "SB-98412",
  "totalAmount": 770,
  "message": "Order placed successfully"
}
```

### `GET /api/track-order?orderId=SB-98412&phone=01711000000`
Public endpoint for order status and courier parcel tracking.
- **Response `200 OK`:**
```json
{
  "orderNumber": "SB-98412",
  "orderStatus": "Shipped",
  "courier": "Steadfast",
  "trackingCode": "SF-9817234",
  "trackingUrl": "https://steadfast.com.bd/t/SF-9817234",
  "createdAt": "2026-08-15T10:30:00.000Z"
}
```

---

## 🚚 3. Courier Logistics & Fraud Detection APIs

### `POST /api/admin/courier/book`
Auto-books parcel into Steadfast, Pathao, or RedX API.
- **Body:**
```json
{
  "orderId": "651f893e98b71d0012f45101",
  "courier": "steadfast",
  "weight": 0.5
}
```
- **Response `200 OK`:**
```json
{
  "success": true,
  "consignmentId": "SF-9817234",
  "trackingCode": "SF-9817234",
  "status": "in_review"
}
```

### `GET /api/admin/courier/fraud-check?phone=01711000000`
Checks customer return rate and delivery performance via BD Courier API.
- **Response `200 OK`:**
```json
{
  "phone": "01711000000",
  "total_orders": 24,
  "success_orders": 22,
  "cancelled_orders": 2,
  "success_ratio": "91.6%",
  "risk_level": "LOW",
  "verdict": "SAFE_CUSTOMER"
}
```

---

## 💼 4. Reseller Multi-Tenant APIs

### `GET /api/reseller/metrics`
Fetches analytics for the logged-in reseller dashboard.
- **Response `200 OK`:**
```json
{
  "totalSales": 145000,
  "totalOrders": 138,
  "pendingOrders": 12,
  "walletBalance": 24500,
  "totalWithdrawn": 60000,
  "recentOrders": []
}
```

### `POST /api/reseller/products/import`
Import products from Mother catalog into the reseller store with custom profit markup.
- **Body:**
```json
{
  "productId": "60d0fe4f5311236168a109ca",
  "retailPrice": 390
}
```

---

## 🤖 5. AI Chatbot & Description APIs

### `POST /api/chat`
Gemini RAG-powered storefront AI assistant.
- **Body:**
```json
{
  "message": "What is the delivery charge outside Dhaka?",
  "subdomain": "main"
}
```
- **Response `200 OK`:**
```json
{
  "reply": "Standard delivery inside Dhaka is ৳70, and outside Dhaka is ৳130. Orders usually arrive within 2-3 business days."
}
```

---

## 📬 6. Postman Collection Format

A ready-to-import Postman JSON template:

```json
{
  "info": {
    "name": "Swapnobaz Platform APIs",
    "_postman_id": "swapnobaz-api-v1",
    "description": "Comprehensive Postman collection for Swapnobaz Dropshipping & SaaS platform",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Products",
      "item": [
        {
          "name": "Get Products",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/products?page=1&limit=12",
              "host": ["{{baseUrl}}"],
              "path": ["api", "products"]
            }
          }
        }
      ]
    },
    {
      "name": "Orders",
      "item": [
        {
          "name": "Track Order",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/track-order?orderId=SB-98412&phone=01711000000",
              "host": ["{{baseUrl}}"],
              "path": ["api", "track-order"]
            }
          }
        }
      ]
    },
    {
      "name": "Fraud Detection",
      "item": [
        {
          "name": "Check Phone Risk",
          "request": {
            "method": "GET",
            "url": {
              "raw": "{{baseUrl}}/api/admin/courier/fraud-check?phone=01711000000",
              "host": ["{{baseUrl}}"],
              "path": ["api", "admin", "courier", "fraud-check"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```
