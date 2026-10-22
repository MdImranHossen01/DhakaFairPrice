import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

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
  let primary = '#0284c7'; // Vibrant ocean blue
  let primaryForeground = '#ffffff';
  let border = '#e2e8f0';
  let mutedForeground = '#64748b';
  let foreground = '#0f172a';
  let background = '#ffffff';

  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement);
    const getColor = (varName: string, fallback: string) => {
      const val = rootStyle.getPropertyValue(varName).trim();
      if (!val) return fallback;
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl') || val.startsWith('oklch') || val.includes('(')) {
        return val;
      }
      return `hsl(${val})`;
    };
    primary = getColor('--primary', primary);
    primaryForeground = getColor('--primary-foreground', primaryForeground);
    border = getColor('--border', border);
    mutedForeground = getColor('--muted-foreground', mutedForeground);
    foreground = getColor('--foreground', foreground);
    background = getColor('--background', background);
  }

  const invoicesHtml = orders.map((order, index) => {
    const store = getSellingStoreInfo(order, settings);
    const invoiceId = String(order.shortId || order.orderId || order._id || "").slice(-8).toUpperCase().replace(/^0+/, '');
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    const formattedDate = createdAt && isValid(createdAt) ? format(createdAt, "dd MMM yyyy") : "N/A";

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

    const customerName = order.shippingAddress?.fullName || order.customerName || order.customer?.name || "Customer";
    const customerStreet = order.shippingAddress?.street || order.customer?.address?.street || "";
    const customerCity = order.shippingAddress?.city || order.customer?.address?.city || "";
    const customerZip = order.shippingAddress?.zipCode || order.customer?.address?.zipCode || "";
    const customerPhone = order.shippingAddress?.phone || order.customerPhone || order.customer?.phone || "";

    const isPaid = order.paymentStatus === 'Paid';

    return `
      <div class="invoice-container" style="${index < orders.length - 1 ? 'page-break-after: always; break-after: page;' : ''}">
        <!-- Header (Layout: Store Info Left, INVOICE Right) -->
        <div class="header">
          <div class="brand-logo-container">
            ${store.logoUrl ? `<img src="${store.logoUrl}" class="brand-logo-img" alt="${store.name}" />` : ''}
            <div class="brand-logo">${store.name}</div>
            <div class="brand-details">
              ${store.address ? `<div>${store.address}</div>` : ''}
              <div>
                ${store.email ? `Email: ${store.email}` : ''}
                ${store.email && store.phone ? ' | ' : ''}
                ${store.phone ? `Phone: ${store.phone}` : ''}
              </div>
              ${store.website ? `<div>Web: ${store.website}</div>` : ''}
            </div>
          </div>
          <div>
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-status-pill ${isPaid ? 'paid' : 'pending'}">
              ${isPaid ? 'PAID' : (order.paymentMethod || 'PENDING')}
            </div>
          </div>
        </div>

        <!-- 2-Column: Bill To on Left, Order Info on Right -->
        <div class="details-grid">
          <div class="bill-to">
            <h3>Bill To</h3>
            <p class="bill-name"><strong>${customerName}</strong></p>
            ${customerStreet ? `<p>${customerStreet}</p>` : ''}
            <p>${customerCity}${customerZip ? `, ${customerZip}` : ""}</p>
            <p class="bill-phone">Phone: <strong>${customerPhone}</strong></p>
          </div>
          <div class="order-info">
            <h3>Order Info</h3>
            <div class="info-row">
              <span class="info-label">Invoice #</span>
              <span class="info-val font-mono"><strong>${invoiceId}</strong></span>
            </div>
            <div class="info-row">
              <span class="info-label">Date</span>
              <span class="info-val">${formattedDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment</span>
              <span class="info-val">${order.paymentMethod || "N/A"}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="info-val status-text">${order.status || "Pending"}</span>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">#</th>
              <th>Product</th>
              <th class="text-center" style="width: 80px;">Qty</th>
              <th class="text-right" style="width: 120px;">Unit Price</th>
              <th class="text-right" style="width: 120px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any, idx: number) => {
              const unitPrice = item.price !== undefined ? Number(item.price) : Number(item.retailPrice) || 0;
              return `
              <tr>
                <td style="text-align: center;" class="sl-cell">${idx + 1}</td>
                <td>
                  <strong>${item.name}</strong>
                  ${item.color || item.size ? `<br><small style="color: var(--muted-foreground)">Color: ${item.color || 'N/A'} | Size: ${item.size || 'N/A'}</small>` : ''}
                </td>
                <td class="text-center"><span class="qty-pill">${item.quantity}</span></td>
                <td class="text-right">৳${Math.round(unitPrice)}</td>
                <td class="text-right font-bold">৳${Math.round(unitPrice * item.quantity)}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <!-- Totals Container -->
        <div class="totals-container">
          <div class="totals-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>৳${Math.round(subtotal)}</span>
            </div>
            <div class="total-row">
              <span>Shipping Charge:</span>
              <span>৳${Math.round(deliveryCharge)}</span>
            </div>
            ${couponDiscount > 0 ? `
              <div class="total-row discount-row">
                <span>Coupon Discount:</span>
                <span>- ৳${Math.round(couponDiscount)}</span>
              </div>
            ` : ''}
            ${walletUsed > 0 ? `
              <div class="total-row discount-row">
                <span>Loyalty Discount:</span>
                <span>- ৳${Math.round(walletUsed)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>Total Amount:</span>
              <span class="grand-total-amount">৳${totalAmount}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div>Thank you for choosing <strong>${store.name}</strong>!</div>
          <div style="margin-top: 2px; font-size: 10px; color: #94a3b8;">This is a computer-generated invoice.</div>
        </div>
      </div>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice Print</title>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: ${primary};
            --primary-foreground: ${primaryForeground};
            --border: ${border};
            --muted-foreground: ${mutedForeground};
            --foreground: ${foreground};
            --background: ${background};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
            margin: 0;
            padding: 20px;
            color: var(--foreground);
            background-color: #f8fafc;
            font-size: 13px;
            line-height: 1.5;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          .font-bold {
            font-weight: 700;
          }

          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            padding: 28px 32px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .brand-logo-container {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          .brand-logo-img {
            max-height: 50px;
            max-width: 180px;
            object-fit: contain;
            margin-bottom: 6px;
          }
          .brand-logo {
            font-size: 20px;
            font-weight: 800;
            color: var(--primary);
            text-transform: uppercase;
            letter-spacing: -0.2px;
            margin-bottom: 4px;
          }
          .brand-details {
            font-size: 11.5px;
            color: var(--muted-foreground);
            line-height: 1.4;
          }
          .invoice-title {
            font-size: 26px;
            font-weight: 800;
            color: #0f172a;
            text-align: right;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
          }
          .invoice-status-pill {
            text-align: right;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 4px;
            display: inline-block;
            float: right;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .invoice-status-pill.paid {
            background-color: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .invoice-status-pill.pending {
            background-color: #fef3c7;
            color: #b45309;
            border: 1px solid #fde68a;
          }

          /* Details Grid: Left Bill To, Right Order Info */
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 24px;
          }
          .bill-to, .order-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
          }
          .bill-to h3, .order-info h3 {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 8px 0;
            color: var(--primary);
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          .bill-to p {
            margin: 3px 0;
            font-size: 12px;
            color: #334155;
          }
          .bill-to .bill-name {
            font-size: 13px;
            color: #0f172a;
          }
          .bill-to .bill-phone {
            margin-top: 6px;
            color: #047857;
          }

          .order-info p {
            margin: 4px 0;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
            font-size: 12px;
          }
          .info-label {
            font-weight: 600;
            color: var(--muted-foreground);
          }
          .info-val {
            color: #0f172a;
          }
          .status-text {
            color: #0284c7;
            font-weight: 600;
          }

          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          th {
            background-color: var(--primary);
            color: var(--primary-foreground);
            text-align: left;
            padding: 9px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12.5px;
            color: #1e293b;
          }
          tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          .sl-cell {
            color: #64748b;
          }
          .qty-pill {
            background: #e2e8f0;
            color: #1e293b;
            padding: 2px 7px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 11.5px;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }

          /* Totals Container */
          .totals-container {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
          }
          .totals-box {
            width: 310px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 12.5px;
            color: #475569;
          }
          .discount-row {
            color: #dc2626;
          }
          .total-row.grand-total {
            border-top: 2px solid var(--primary);
            font-size: 15px;
            font-weight: 800;
            padding-top: 8px;
            margin-top: 4px;
            color: #0f172a;
          }
          .grand-total-amount {
            color: var(--primary);
            font-family: ui-monospace, monospace;
            font-size: 16px;
          }

          .footer {
            text-align: center;
            font-size: 11px;
            color: var(--muted-foreground);
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
            margin-top: 24px;
          }

          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
            }
            .invoice-container {
              padding: 0 !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
            }
            @page {
              size: A4;
              margin: 12mm 15mm 15mm 15mm;
            }
          }
        </style>
      </head>
      <body>
        <!-- Top Toolbar for Preview (Hidden on Print) -->
        <div class="no-print" style="position: sticky; top: 0; z-index: 9999; background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin: -20px -20px 20px -20px;">
          <div style="font-weight: 600; font-size: 13px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
            <span>${orders.length > 1 ? `Invoices (${orders.length} orders)` : `Invoice #${String(orders[0]?.shortId || orders[0]?._id || "").slice(-8).toUpperCase().replace(/^0+/, '')}`}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.print()" style="cursor: pointer; background-color: ${primary}; color: ${primaryForeground}; border: none; padding: 6px 14px; border-radius: 5px; font-weight: 600; font-size: 12px; display: flex; align-items: center; gap: 5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print / Save PDF
            </button>
            <button onclick="window.close()" style="cursor: pointer; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 5px; font-weight: 500; font-size: 12px;">
              Close
            </button>
          </div>
        </div>

        ${invoicesHtml}
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    let hasPrinted = false;
    const triggerPrint = () => {
      if (hasPrinted) return;
      hasPrinted = true;
      try {
        printWindow.focus();
        printWindow.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    };

    if (printWindow.document.fonts && printWindow.document.fonts.ready) {
      printWindow.document.fonts.ready.then(() => {
        setTimeout(triggerPrint, 250);
      });
    }

    printWindow.onload = () => {
      setTimeout(triggerPrint, 250);
    };

    setTimeout(triggerPrint, 800);
  } else {
    toast.error('Pop-up was blocked. Please allow pop-ups for this website to print invoices.');
  }
}
