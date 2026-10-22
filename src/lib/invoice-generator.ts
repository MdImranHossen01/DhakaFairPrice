import { format, isValid } from 'date-fns';

export function getSellingStoreInfo(order: any, settings?: any) {
  // 1. Direct explicit sellingStore from API
  if (order?.sellingStore && typeof order.sellingStore === 'object' && order.sellingStore.storeName) {
    return {
      isReseller: Boolean(order.sellingStore.isReseller),
      name: order.sellingStore.storeName,
      logoUrl: order.sellingStore.logoUrl || '',
      email: order.sellingStore.email || '',
      phone: order.sellingStore.phone || '',
      address: order.sellingStore.address || '',
      website: order.sellingStore.domain || '',
    };
  }

  const isFulfillment = Boolean(order?.shortId?.includes('-F'));
  const motherOrder = order?.motherOrderId;

  // 2. Fulfillment order: the selling store is the storefront reseller on the linked mother order
  let targetReseller: any = null;
  if (isFulfillment && motherOrder && typeof motherOrder === 'object') {
    targetReseller = (motherOrder.storefrontResellerId?.storeName ? motherOrder.storefrontResellerId : null)
      || (motherOrder.resellerId?.storeName ? motherOrder.resellerId : null);
  }

  // 3. Storefront order: direct storefront reseller or resellerId
  if (!targetReseller) {
    if (order?.storefrontResellerId && typeof order.storefrontResellerId === 'object' && order.storefrontResellerId.storeName) {
      targetReseller = order.storefrontResellerId;
    } else if (!isFulfillment && order?.resellerId && typeof order.resellerId === 'object' && order.resellerId.storeName) {
      targetReseller = order.resellerId;
    }
  }

  // 4. Fallback: Parse from systemNote (e.g. "Storefront Order (Imran)")
  let parsedNameFromNote = '';
  if (!targetReseller && order?.systemNote) {
    const match = order.systemNote.match(/Storefront Order \(([^ -)]+)/i);
    if (match && match[1]) {
      parsedNameFromNote = match[1];
    }
  }

  if (targetReseller && targetReseller.storeName) {
    const domain = targetReseller.customDomain || (targetReseller.subdomain ? `${targetReseller.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com'}` : '');
    return {
      isReseller: true,
      name: targetReseller.storeName,
      logoUrl: targetReseller.logoUrl || '',
      email: targetReseller.contact?.email || '',
      phone: targetReseller.contact?.phone || targetReseller.pickupAddress?.phone || '',
      address: targetReseller.contact?.address || targetReseller.pickupAddress?.address || '',
      website: domain,
    };
  }

  if (parsedNameFromNote) {
    return {
      isReseller: true,
      name: parsedNameFromNote,
      logoUrl: '',
      email: '',
      phone: '',
      address: '',
      website: `${parsedNameFromNote.toLowerCase()}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com'}`,
    };
  }

  // 5. Default Mother Shop info
  return {
    isReseller: false,
    name: settings?.brandName || settings?.siteName || process.env.NEXT_PUBLIC_STORE_NAME || "DHAKA FAIR PRICE",
    logoUrl: settings?.logoUrl || settings?.brandLogo || '',
    email: settings?.contact?.email || "dhakafairprice@gmail.com",
    phone: settings?.contact?.phone || "+88013148177112",
    address: settings?.contact?.address || "House: 2/B/E Tolarbag, Darus Salam Road, Mirpur-1, Dhaka-1216, Bangladesh.",
    website: process.env.NEXT_PUBLIC_ROOT_DOMAIN || "dhakafairprice.com",
  };
}

export async function generateInvoicePDF(orderOrOrders: any | any[], settings: any, mode: 'download' | 'print' = 'download') {
  const orders = Array.isArray(orderOrOrders) ? orderOrOrders : [orderOrOrders];
  if (orders.length === 0) return;

  // Dynamic colors based on shadcn/tailwind config
  let primary = '#2563eb';
  let primaryForeground = '#ffffff';

  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement);
    const getHsl = (varName: string, fallback: string) => {
      const val = rootStyle.getPropertyValue(varName).trim();
      if (!val) return fallback;
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl')) return val;
      return `hsl(${val})`;
    };
    primary = getHsl('--primary', primary);
    primaryForeground = getHsl('--primary-foreground', primaryForeground);
  }

  const invoicesHtml = orders.map((order, index) => {
    const store = getSellingStoreInfo(order, settings);
    const invoiceId = order.shortId || order.orderId || String(order._id || "").slice(-8).toUpperCase();
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    const formattedDate = createdAt && isValid(createdAt) ? format(createdAt, "dd MMM yyyy, hh:mm a") : "N/A";

    const items = Array.isArray(order.items) ? order.items : [];
    const subtotalRaw = items.reduce((acc: number, item: any) => {
      const price = item.price !== undefined ? Number(item.price) : Number(item.retailPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      return acc + price * quantity;
    }, 0);
    const subtotal = Number.isFinite(subtotalRaw) ? subtotalRaw : 0;
    const deliveryCharge = order.deliveryCharge !== undefined
      ? Number(order.deliveryCharge) || 0
      : (order.shippingCharge !== undefined ? Number(order.shippingCharge) || 0 : Math.max(0, (Number(order.totalAmount || order.total) || 0) - subtotal));
    const couponDiscount = Number(order.couponDiscountAmount || order.couponDiscount) || 0;
    const walletUsed = Number(order.walletAmountUsed) || 0;
    const totalAmount = Math.round(
      order.totalAmount !== undefined 
        ? Number(order.totalAmount) - couponDiscount - walletUsed 
        : (order.total !== undefined ? Number(order.total) : subtotal + deliveryCharge - couponDiscount - walletUsed)
    );

    const isPaid = order.paymentStatus === 'Paid';
    const isCOD = !isPaid && (order.paymentMethod === 'COD' || !order.paymentMethod);

    const customerName = order.shippingAddress?.fullName || order.customerName || order.customer?.name || "Customer";
    const customerStreet = order.shippingAddress?.street || order.customer?.address?.street || "";
    const customerCity = order.shippingAddress?.city || order.customer?.address?.city || "";
    const customerZip = order.shippingAddress?.zipCode || order.customer?.address?.zipCode || "";
    const customerDivision = order.shippingAddress?.division || order.customer?.address?.division || "";
    const customerPhone = order.shippingAddress?.phone || order.customerPhone || order.customer?.phone || "N/A";

    return `
      <div class="invoice-container" style="${index < orders.length - 1 ? 'page-break-after: always; break-after: page;' : ''}">
        <!-- Top Vibrant Accent Bar -->
        <div class="top-accent-bar"></div>

        <!-- Header -->
        <div class="header">
          <div class="brand-box">
            ${store.logoUrl ? `<img src="${store.logoUrl}" class="brand-logo-img" alt="${store.name}" />` : ''}
            <div class="brand-title">${store.name}</div>
            <div class="brand-meta">
              ${store.address ? `<div class="meta-row"><span class="meta-icon">📍</span> <span>${store.address}</span></div>` : ''}
              <div class="meta-row meta-contacts">
                ${store.phone ? `<span><span class="meta-icon">📞</span> ${store.phone}</span>` : ''}
                ${store.phone && store.email ? `<span class="meta-sep">•</span>` : ''}
                ${store.email ? `<span><span class="meta-icon">✉️</span> ${store.email}</span>` : ''}
              </div>
              ${store.website ? `<div class="meta-row"><span class="meta-icon">🌐</span> <span class="meta-web">${store.website}</span></div>` : ''}
            </div>
          </div>
          
          <div class="invoice-badge-box">
            <div class="invoice-pill-title">INVOICE / চালান</div>
            <div class="invoice-id">#${invoiceId}</div>
            <div class="status-badge-wrap">
              ${isPaid 
                ? '<span class="status-badge badge-paid"><span class="badge-dot">●</span> PAID / পরিশোধিত</span>' 
                : '<span class="status-badge badge-cod"><span class="badge-dot">●</span> CASH ON DELIVERY</span>'
              }
            </div>
          </div>
        </div>

        <!-- Cards: Bill To & Order Info -->
        <div class="details-grid">
          <!-- Bill To Card -->
          <div class="info-card">
            <div class="card-header">
              <span class="card-icon">👤</span>
              <span class="card-title">BILL TO / প্রাপকের বিবরণ</span>
            </div>
            <div class="card-body">
              <div class="customer-name">${customerName}</div>
              ${customerStreet ? `<div class="customer-address">${customerStreet}</div>` : ''}
              <div class="customer-city">${customerCity}${customerDivision ? `, ${customerDivision}` : ''}${customerZip ? ` - ${customerZip}` : ''}</div>
              <div class="customer-phone"><span class="phone-icon">📞</span> <strong>${customerPhone}</strong></div>
            </div>
          </div>

          <!-- Order Info Card -->
          <div class="info-card">
            <div class="card-header">
              <span class="card-icon">📋</span>
              <span class="card-title">ORDER SUMMARY / অর্ডার বিবরণী</span>
            </div>
            <div class="card-body order-summary-rows">
              <div class="summary-line">
                <span class="lbl">Order ID:</span>
                <span class="val font-mono font-bold">#${invoiceId}</span>
              </div>
              <div class="summary-line">
                <span class="lbl">Order Date:</span>
                <span class="val font-medium">${formattedDate}</span>
              </div>
              <div class="summary-line">
                <span class="lbl">Payment Method:</span>
                <span class="val font-bold text-slate-800">${order.paymentMethod || (isCOD ? 'Cash on Delivery' : 'Online')}</span>
              </div>
              <div class="summary-line">
                <span class="lbl">Order Status:</span>
                <span class="val order-status-tag">${order.status || 'Confirmed'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">SL</th>
              <th>Product Description / পণ্যের বিবরণ</th>
              <th style="width: 80px; text-align: center;">Qty</th>
              <th style="width: 125px; text-align: right;">Unit Price</th>
              <th style="width: 135px; text-align: right;">Total Price</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, idx: number) => {
              const unitPrice = item.price !== undefined ? Number(item.price) : Number(item.retailPrice) || 0;
              const hasVariants = item.color || item.size;
              return `
              <tr>
                <td style="text-align: center;" class="sl-cell">${idx + 1}</td>
                <td>
                  <div class="prod-name">${item.name}</div>
                  ${hasVariants ? `
                    <div class="prod-variant">
                      ${item.color ? `<span class="variant-chip">Color: ${item.color}</span>` : ''}
                      ${item.size ? `<span class="variant-chip">Size: ${item.size}</span>` : ''}
                    </div>
                  ` : ''}
                </td>
                <td style="text-align: center;">
                  <span class="qty-pill">${item.quantity}</span>
                </td>
                <td style="text-align: right;" class="font-mono">৳${Math.round(unitPrice)}</td>
                <td style="text-align: right;" class="font-mono font-bold prod-total">৳${Math.round(unitPrice * item.quantity)}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <div class="totals-card">
            <div class="total-row">
              <span class="total-label">Subtotal / আইটেম মূল্য:</span>
              <span class="total-val font-mono">৳${Math.round(subtotal)}</span>
            </div>
            <div class="total-row">
              <span class="total-label">🚚 Delivery Charge / ডেলিভারি চার্জ:</span>
              <span class="total-val font-mono">৳${Math.round(deliveryCharge)}</span>
            </div>
            ${couponDiscount > 0 ? `
              <div class="total-row discount-row">
                <span class="total-label">🏷️ Coupon Discount:</span>
                <span class="total-val font-mono">- ৳${Math.round(couponDiscount)}</span>
              </div>
            ` : ''}
            ${walletUsed > 0 ? `
              <div class="total-row discount-row">
                <span class="total-label">👛 Wallet / Loyalty Used:</span>
                <span class="total-val font-mono">- ৳${Math.round(walletUsed)}</span>
              </div>
            ` : ''}
            
            <div class="grand-total-banner">
              <div class="gt-label">
                <div class="gt-main">Total Amount</div>
                <div class="gt-sub">সর্বমোট প্রদেয়</div>
              </div>
              <div class="gt-val font-mono">৳${totalAmount}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="thank-you-note">
            ✨ Thank you for shopping with <strong>${store.name}</strong>! / আমাদের সাথে কেনাকাটার জন্য আন্তরিক ধন্যবাদ।
          </div>
          <div class="support-contact">
            For any queries regarding this order, please contact <strong>${store.phone || store.email || store.website}</strong>
          </div>
          <div class="disclaimer">
            This is an official computer-generated sales invoice. No physical signature or stamp required.
          </div>
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="bn">
      <head>
        <meta charset="utf-8">
        <title>Invoice Print</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Plus Jakarta Sans', 'Noto Sans Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            background-color: #f1f5f9;
            color: #0f172a;
            font-size: 13px;
            line-height: 1.5;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .font-bold { font-weight: 700; }
          .font-medium { font-weight: 500; }

          .invoice-container {
            max-width: 820px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
            overflow: hidden;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .top-accent-bar {
            height: 8px;
            background: linear-gradient(90deg, #4f46e5 0%, #06b6d4 50%, #10b981 100%);
            width: 100%;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 24px 28px 18px;
            border-bottom: 1px solid #f1f5f9;
            background: #ffffff;
          }

          .brand-box {
            max-width: 460px;
          }
          .brand-logo-img {
            max-height: 52px;
            max-width: 190px;
            object-fit: contain;
            margin-bottom: 6px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: 800;
            color: #1e1b4b;
            letter-spacing: -0.5px;
            margin-bottom: 4px;
            text-transform: capitalize;
          }
          .brand-meta {
            font-size: 12px;
            color: #64748b;
            line-height: 1.45;
          }
          .meta-row {
            margin-top: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .meta-contacts {
            font-weight: 500;
            color: #475569;
          }
          .meta-sep {
            color: #cbd5e1;
            padding: 0 4px;
          }
          .meta-web {
            color: #4f46e5;
            font-weight: 600;
          }
          .meta-icon {
            font-size: 11px;
          }

          .invoice-badge-box {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .invoice-pill-title {
            display: inline-block;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 1.5px;
            color: #4338ca;
            background: #e0e7ff;
            padding: 4px 12px;
            border-radius: 9999px;
            text-transform: uppercase;
            border: 1px solid #c7d2fe;
          }
          .invoice-id {
            font-size: 22px;
            font-weight: 800;
            font-family: ui-monospace, monospace;
            color: #0f172a;
            margin-top: 6px;
            letter-spacing: -0.5px;
          }
          .status-badge-wrap {
            margin-top: 6px;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 9999px;
          }
          .badge-dot {
            font-size: 8px;
          }
          .badge-paid {
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #86efac;
          }
          .badge-cod {
            background-color: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
          }

          /* Details Cards Grid */
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 18px 28px;
            background: #fafafa;
            border-bottom: 1px solid #e2e8f0;
          }
          .info-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px 16px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
          }
          .card-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .customer-name {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
          }
          .customer-address, .customer-city {
            font-size: 12px;
            color: #475569;
            line-height: 1.4;
          }
          .customer-phone {
            margin-top: 6px;
            font-size: 12px;
            color: #047857;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          .order-summary-rows {
            font-size: 12px;
          }
          .summary-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 3px 0;
          }
          .summary-line .lbl {
            color: #64748b;
            font-weight: 500;
          }
          .summary-line .val {
            color: #0f172a;
          }
          .order-status-tag {
            background: #e0f2fe;
            color: #0369a1;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 4px;
            text-transform: capitalize;
          }

          /* Items Table */
          .items-table {
            width: calc(100% - 56px);
            margin: 20px 28px 16px;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }
          .items-table th {
            background: #1e293b;
            color: #f8fafc;
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .items-table td {
            padding: 11px 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
            vertical-align: middle;
          }
          .items-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .items-table tbody tr:last-child td {
            border-bottom: none;
          }
          .sl-cell {
            color: #94a3b8;
            font-weight: 600;
            font-size: 12px;
          }
          .prod-name {
            font-weight: 700;
            color: #0f172a;
          }
          .prod-variant {
            margin-top: 3px;
            display: flex;
            gap: 4px;
          }
          .variant-chip {
            background: #e2e8f0;
            color: #475569;
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: 500;
          }
          .qty-pill {
            background: #e0e7ff;
            color: #4338ca;
            padding: 2px 9px;
            border-radius: 9999px;
            font-weight: 800;
            font-size: 12px;
            display: inline-block;
          }
          .prod-total {
            color: #0f172a;
          }

          /* Totals Section */
          .totals-section {
            display: flex;
            justify-content: flex-end;
            padding: 0 28px 24px;
          }
          .totals-card {
            width: 330px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px 16px;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.02);
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
            font-size: 12px;
            color: #475569;
          }
          .total-row .total-label {
            font-weight: 500;
          }
          .total-row .total-val {
            font-weight: 600;
            color: #0f172a;
          }
          .discount-row {
            color: #dc2626;
          }
          .discount-row .total-val {
            color: #dc2626;
          }
          .grand-total-banner {
            margin-top: 10px;
            padding: 12px 14px;
            background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
            border-radius: 10px;
            color: #ffffff;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .gt-label .gt-main {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .gt-label .gt-sub {
            font-size: 10px;
            color: #94a3b8;
          }
          .gt-val {
            font-size: 20px;
            font-weight: 900;
            color: #38bdf8;
          }

          /* Footer */
          .footer {
            padding: 18px 28px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            text-align: center;
          }
          .thank-you-note {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            margin-bottom: 4px;
          }
          .support-contact {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 4px;
          }
          .disclaimer {
            font-size: 10px;
            color: #94a3b8;
            font-style: italic;
          }

          @media print {
            body {
              padding: 0;
              background: #ffffff;
            }
            .invoice-container {
              max-width: 100%;
              box-shadow: none;
              border-radius: 0;
              border: none;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        ${invoicesHtml}
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      printWindow.focus();
      if (mode === 'print') {
        printWindow.onafterprint = () => {
          try {
            printWindow.close();
          } catch (e) {}
        };
      }
      printWindow.print();
    };

    printWindow.onload = triggerPrint;
    
    setTimeout(() => {
      if (!hasPrinted) {
        triggerPrint();
      }
    }, 500);
  }
}
