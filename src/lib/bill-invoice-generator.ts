import { format, isValid } from 'date-fns';
import { toast } from 'sonner';

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertBengaliStyle = (n: number): string => {
    if (n < 0) return 'Minus ' + convertBengaliStyle(Math.abs(n));
    let words = '';
    
    if (n >= 10000000) {
      words += convertBengaliStyle(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    
    if (n >= 100000) {
      words += convertBengaliStyle(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    
    if (n >= 1000) {
      words += convertBengaliStyle(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    
    if (n >= 100) {
      words += convertBengaliStyle(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    
    if (n > 0) {
      if (n < 20) {
        words += a[n];
      } else {
        words += b[Math.floor(n / 10)];
        if (n % 10 > 0) {
          words += ' ' + a[n % 10];
        }
      }
    }
    
    return words.trim();
  };

  return convertBengaliStyle(num).trim();
}

export async function generateBillPDF(bill: any, settings: any, mode: 'download' | 'print' = 'download') {
  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || "Store";
  const brandEmail = settings?.contact?.email || "";
  const brandPhone = settings?.contact?.phone || "";
  const brandAddress = settings?.contact?.address || "";

  // Dynamic colors based on shadcn/tailwind config (HSL values usually)
  let primary = '#00D1B2';
  let primaryForeground = '#ffffff';
  let border = '#e2e8f0';
  let mutedForeground = '#64748b';
  let foreground = '#0f172a';
  let background = '#ffffff';

  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement);
    const getHsl = (varName: string, fallback: string) => {
      const val = rootStyle.getPropertyValue(varName).trim();
      if (!val) return fallback;
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl') || val.startsWith('oklch') || val.includes('(')) return val;
      return `hsl(${val})`;
    };
    primary = getHsl('--primary', primary);
    primaryForeground = getHsl('--primary-foreground', primaryForeground);
    border = getHsl('--border', border);
    mutedForeground = getHsl('--muted-foreground', mutedForeground);
    foreground = getHsl('--foreground', foreground);
    background = getHsl('--background', background);
  }

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  };

  const docType = bill.documentType || 'bill';

  // Titles & Labels
  let title = "BILL INVOICE";
  let labelTo = "BILL TO:";
  let labelNo = "BILL NO #:";
  if (docType === 'offer') {
    title = "QUOTATION";
    labelTo = "QUOTATION TO:";
    labelNo = "QUOTATION NO #:";
  } else if (docType === 'chalan') {
    title = "DELIVERY CHALLAN";
    labelTo = "DELIVER TO:";
    labelNo = "CHALLAN NO #:";
  }

  const invoiceId = String(bill.invoiceNo || bill._id || "").slice(-11).toUpperCase();
  const billDate = bill.date ? new Date(bill.date) : new Date();
  const formattedDate = billDate && isValid(billDate) ? format(billDate, "dd MMM yyyy") : "N/A";

  const items = Array.isArray(bill.items) ? bill.items : [];

  let footerThankYou = `Thank you for doing business with ${brandName}!`;
  let footerGenerated = `This is a computer generated bill, no signature required.`;
  if (docType === 'offer') {
    footerThankYou = `Thank you for requesting a quotation from ${brandName}!`;
    footerGenerated = `This is a computer generated offer, no signature required.`;
  } else if (docType === 'chalan') {
    footerThankYou = `Thank you for choosing ${brandName}!`;
    footerGenerated = `This is a computer generated delivery challan, no signature required.`;
  }

  const amountToConvert = docType === 'bill' ? Math.round((bill.gTotal ?? bill.total) ?? 0) : Math.round(bill.total || 0);

  const esc = (v: any) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const brandLogoUrl = settings?.logoUrl || settings?.logo || '/logo.webp';
  const finalLogoUrl = getAbsoluteUrl(brandLogoUrl);

  const isBill = docType === 'bill';
  const isOffer = docType === 'offer';
  const isChalan = docType === 'chalan';

  const subtitle = isOffer
    ? 'Price Quotation / Offer'
    : isChalan
      ? 'Goods Delivery Note'
      : 'Tax Invoice / Bill';
  const clientLabel = isOffer ? 'Quotation To' : isChalan ? 'Deliver To' : 'Bill To';
  const noLabel = isOffer ? 'Quotation No' : isChalan ? 'Challan No' : 'Bill No';

  const fmt = (n: any) => `৳${Math.round(Number(n) || 0).toLocaleString()}`;
  const safeDate = (d: any) => {
    if (!d) return '';
    const dt = new Date(d);
    return isValid(dt) ? format(dt, 'dd MMM yyyy') : '';
  };

  const subtotalVal = Math.round(bill.subtotal || 0);
  const deliveryVal = Math.round(bill.deliveryCharge || 0);
  const serviceVal = Math.round(bill.serviceFee || 0);
  const discountVal = Math.round(bill.discount || 0);
  const totalVal = Math.round(bill.total || 0);
  const prevDueVal = Math.round(bill.prevDue || 0);
  const grandVal = Math.round(bill.gTotal ?? bill.total ?? 0);
  const paidVal = Math.round(bill.cashIn || 0);
  const remainingVal = Math.round(bill.currentBillDue ?? Math.max(0, grandVal - paidVal));

  const itemRows = items
    .map((item: any, idx: number) => {
      const descLines = getDescriptionLines(item.description);
      const hasDesc = descLines.length > 0;
      let rowHtml = `
        <tr class="item-main-row" style="border-top:1px solid ${border};${!hasDesc ? `border-bottom:1px solid ${border};` : ''}">
          <td style="padding:7px 8px;color:${mutedForeground};font-size:11px;vertical-align:top;">${idx + 1}</td>
          <td style="padding:7px 8px;font-weight:600;font-size:12px;vertical-align:top;">${esc(item.name)}</td>
          <td style="padding:7px 8px;text-align:center;font-size:12px;vertical-align:top;">${item.quantity || 1}</td>
          ${!isChalan ? `
          <td style="padding:7px 8px;text-align:right;font-size:12px;vertical-align:top;">${fmt(item.price)}</td>
          <td style="padding:7px 8px;text-align:right;font-size:12px;font-weight:600;vertical-align:top;">${fmt((item.price || 0) * (item.quantity || 1))}</td>
          ` : ''}
        </tr>`;
      descLines.forEach((line: string, lineIdx: number) => {
        const isLast = lineIdx === descLines.length - 1;
        rowHtml += `
        <tr class="item-desc-row" style="${isLast ? `border-bottom:1px solid ${border};` : ''}">
          <td></td>
          <td style="padding:1px 8px 4px 8px;color:${mutedForeground};font-size:10.5px;line-height:1.4;">${line}</td>
          <td></td>
          ${!isChalan ? '<td></td><td></td>' : ''}
        </tr>`;
      });
      return rowHtml;
    })
    .join('');

  const summaryLine = (label: string, value: string, extra = '') =>
    `<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;${extra}"><span style="color:${mutedForeground};">${label}</span><strong>${value}</strong></div>`;

  const summaryHtml = !isChalan
    ? `
      <div class="bill-summary-container">
        <div class="bill-summary-box">
          <div class="info-label" style="margin-bottom:5px;border-bottom:1px solid ${border};padding-bottom:3px;">${isOffer ? 'Quotation Summary' : 'Bill Summary'}</div>
          ${summaryLine('Subtotal:', fmt(subtotalVal))}
          ${deliveryVal > 0 ? summaryLine('Delivery Charge:', fmt(deliveryVal)) : ''}
          ${serviceVal > 0 ? summaryLine('Service Fee:', fmt(serviceVal)) : ''}
          ${discountVal > 0 ? `<div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;"><span style="color:${mutedForeground};">${bill.discountType === 'percentage' ? `Discount (${esc(bill.discountValue)}%):` : 'Discount:'}</span><strong style="color:#ef4444;">-${fmt(discountVal)}</strong></div>` : ''}
          <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;color:${primary};border-top:1px solid ${border};margin-top:4px;padding-top:4px;">
            <span>${isBill ? 'Total:' : 'Total Amount:'}</span><span>${fmt(totalVal)}</span>
          </div>
          ${isBill ? `
            ${prevDueVal > 0 ? summaryLine('Previous Due:', fmt(prevDueVal)) : ''}
            <div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:700;border-top:1px solid ${border};margin-top:3px;padding-top:3px;">
              <span>Grand Total:</span><span>${fmt(grandVal)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;border-top:1px dashed ${border};margin-top:3px;padding-top:3px;">
              <span style="color:${primary};font-weight:600;">Paid Amount:</span><strong style="color:${primary};">${fmt(paidVal)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:2px 0;border-top:1px solid ${border};margin-top:3px;padding-top:3px;">
              <span style="font-weight:600;">Remaining Due:</span>
              <strong style="${remainingVal > 0 ? 'color:#ef4444;' : 'color:#10b981;'}">${remainingVal > 0 ? fmt(remainingVal) : '৳0 (Fully Paid)'}</strong>
            </div>
          ` : ''}
        </div>
      </div>`
    : '';

  const bannerHtml = !isChalan
    ? `
      <div class="payment-banner">
        <div class="left-side">
          <div class="label">${isOffer ? 'Total Quotation Amount' : 'Total Payable Amount'}</div>
          <div class="amount">${fmt(amountToConvert)}</div>
          <div class="words">${numberToWords(amountToConvert)} Taka Only${bill.vatTaxIncluded !== undefined ? ` (${bill.vatTaxIncluded ? 'VAT &amp; Tax Included' : 'VAT &amp; Tax Excluded'})` : ''}</div>
        </div>
        <div class="right-side">
          ${isBill
            ? (remainingVal <= 0
                ? `<div class="due-label">Status</div><div class="due-amount due-zero">Fully Paid</div>`
                : `<div class="due-label">Remaining Due</div><div class="due-amount">${fmt(remainingVal)}</div>`)
            : (bill.expectedDeliveryDate
                ? `<div class="due-label">Expected Delivery</div><div class="due-amount">${safeDate(bill.expectedDeliveryDate)}</div>`
                : `<div class="due-label">Document</div><div class="due-amount">Quotation</div>`)}
        </div>
      </div>`
    : '';

  const termsHtml =
    !isChalan && bill.termsAndConditions
      ? `
      <div class="terms-box">
        <div class="info-label">Terms &amp; Conditions</div>
        <div style="white-space:pre-wrap;color:${mutedForeground};font-size:10.5px;line-height:1.5;">${esc(bill.termsAndConditions)}</div>
      </div>`
      : '';

  const sigLabels = isOffer
    ? ['Client Acceptance', 'Authorized Signature']
    : isChalan
      ? ['Received By', 'Delivered By', 'Authorized Signature']
      : ['Client Signature', 'Authorized Signature'];
  const sigHtml = sigLabels
    .map((l, i) => `<div style="text-align:${i === 0 ? 'left' : i === sigLabels.length - 1 ? 'right' : 'center'};"><div class="sig-line">${l}</div></div>`)
    .join('');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} #${esc(invoiceId)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: 'Inter', 'Noto Sans Bengali', sans-serif; margin: 0; padding: 0; background: #f1f5f9; color: ${foreground}; font-size: 12.5px; }
    .no-print { position: sticky; top: 0; z-index: 999; background: #fff; border-bottom: 1px solid ${border}; padding: 10px 24px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
    .no-print h3 { margin: 0; font-size: 15px; color: ${foreground}; }
    .no-print button { padding: 7px 20px; border-radius: 6px; border: none; background: ${primary}; color: ${primaryForeground}; font-size: 13px; font-weight: 600; cursor: pointer; }
    .page-wrap { padding: 28px 0 40px 0; }
    .receipt-card { width: 190mm; margin: 0 auto; background: #fff; border: 1px solid ${border}; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); position: relative; min-height: 270mm; display: flex; flex-direction: column; }
    .receipt-card > .grow { flex: 1; }
    .receipt-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px 12px 20px; border-bottom: 3px solid ${primary}; background: linear-gradient(135deg, color-mix(in srgb, ${primary} 8%, transparent) 0%, transparent 60%); gap: 16px; }
    .receipt-logo-container { display: flex; align-items: center; justify-content: flex-end; flex-shrink: 0; }
    .receipt-logo-img { height: 70px; max-height: 80px; max-width: 200px; object-fit: contain; display: block; }
    .brand-name { font-size: 16px; font-weight: 800; color: ${primary}; letter-spacing: 0.04em; text-transform: uppercase; }
    .brand-sub { font-size: 11px; color: ${mutedForeground}; line-height: 1.4; margin-top: 2px; }
    .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-bottom: 1px solid ${border}; }
    .info-block { padding: 12px 20px; }
    .info-block + .info-block { border-left: 1px solid ${border}; }
    .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${mutedForeground}; margin-bottom: 5px; }
    .info-value { font-size: 13px; font-weight: 700; color: ${foreground}; }
    .info-small { font-size: 10.5px; color: ${mutedForeground}; margin-top: 2px; }
    .receipt-title { font-size: 20px; font-weight: 900; color: ${primary}; letter-spacing: -0.02em; text-transform: uppercase; margin: 0; }
    .receipt-sub { font-size: 10px; color: ${mutedForeground}; margin-top: 1px; }
    .receipt-meta { font-size: 11px; color: ${foreground}; margin-top: 5px; }
    .receipt-meta span { font-weight: 700; }
    .items-section { padding: 0 20px 10px 20px; }
    .items-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${mutedForeground}; padding: 12px 0 6px 0; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .items-table thead { display: table-header-group; }
    .items-table thead th { background: color-mix(in srgb, ${primary} 10%, transparent); color: ${mutedForeground}; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 6px 8px; text-align: left; border-bottom: 2px solid color-mix(in srgb, ${primary} 25%, transparent); }
    .items-table thead th.num { text-align: right; }
    .items-table thead th.ctr { text-align: center; }
    .bill-summary-container { display: flex; justify-content: flex-end; padding: 4px 20px 12px 20px; }
    .bill-summary-box { width: 270px; border: 1px solid ${border}; border-radius: 6px; padding: 8px 12px; background: #fafafa; }
    .payment-banner { margin: 0 20px 16px 20px; background: ${primary}; color: ${primaryForeground}; border-radius: 8px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; }
    .payment-banner .left-side .label { font-size: 10px; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.06em; }
    .payment-banner .left-side .amount { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; margin-top: 2px; }
    .payment-banner .left-side .words { font-size: 9.5px; opacity: 0.8; margin-top: 3px; }
    .payment-banner .right-side { text-align: right; }
    .payment-banner .right-side .due-label { font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.06em; }
    .payment-banner .right-side .due-amount { font-size: 16px; font-weight: 800; margin-top: 2px; }
    .due-zero { opacity: 0.85; }
    .terms-box { margin: 0 20px 14px 20px; padding: 10px 14px; border: 1px dashed ${border}; border-radius: 6px; background: #fafafa; }
    .thanks { text-align: center; font-size: 10.5px; color: ${mutedForeground}; padding: 6px 20px 0 20px; }
    .thanks strong { color: ${foreground}; }
    .receipt-footer { padding: 10px 20px 14px 20px; border-top: 1px solid ${border}; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: ${mutedForeground}; margin-top: 10px; }
    .sig-line { width: 140px; border-top: 1.5px solid ${foreground}; padding-top: 5px; text-align: center; font-size: 11px; color: ${foreground}; margin-top: 42px; }
    .generated-note { text-align: center; font-size: 9.5px; font-style: italic; color: ${mutedForeground}; padding: 0 20px 12px 20px; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 56px; font-weight: 900; opacity: 0.045; color: ${primary}; text-transform: uppercase; letter-spacing: 0.1em; pointer-events: none; white-space: nowrap; z-index: 0; }
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      .no-print { display: none !important; }
      body { background: #fff !important; }
      .page-wrap { padding: 0 !important; }
      .receipt-card { box-shadow: none !important; border: none !important; width: 100% !important; border-radius: 0 !important; overflow: visible !important; min-height: 277mm; }
      tr { page-break-inside: avoid; break-inside: avoid; }
      .payment-banner, .receipt-footer, .bill-summary-container, .info-row, .receipt-header, .terms-box { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <h3>${title}</h3>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>

  <div class="page-wrap">
    <div class="receipt-card">
      <div class="watermark">${isOffer ? 'Quotation' : isChalan ? 'Challan' : 'Invoice'}</div>

      <div class="receipt-header">
        <div>
          <div class="brand-name">${esc(brandName)}</div>
          <div class="brand-sub">
            ${brandAddress ? esc(brandAddress) + '<br>' : ''}
            ${brandPhone ? 'Phone: ' + esc(brandPhone) : ''} ${brandPhone && brandEmail ? '&nbsp;|&nbsp; ' : ''}${brandEmail ? 'Email: ' + esc(brandEmail) : ''}
          </div>
        </div>
        <div class="receipt-logo-container">
          <img src="${finalLogoUrl}" alt="${esc(brandName)}" class="receipt-logo-img" />
        </div>
      </div>

      <div class="info-row">
        <div class="info-block">
          <div class="receipt-title">${title}</div>
          <div class="receipt-sub">${subtitle}</div>
          <div class="receipt-meta">
            <div>${noLabel}: <span>${esc(invoiceId)}</span></div>
            <div>Date: <span>${formattedDate}</span></div>
            ${isBill ? `<div>Status: <span>${esc(bill.status || 'Pending')}</span></div>` : ''}
            ${isBill && bill.status === 'Due' && bill.expectedReceivableDate ? `<div>Expected Payment: <span>${safeDate(bill.expectedReceivableDate)}</span></div>` : ''}
            ${isBill && bill.expectedDeliveryDate ? `<div>Expected Delivery: <span>${safeDate(bill.expectedDeliveryDate)}</span></div>` : ''}
            ${isChalan && bill.expectedDeliveryDate ? `<div>Delivery Date: <span>${safeDate(bill.expectedDeliveryDate)}</span></div>` : ''}
          </div>
        </div>
        <div class="info-block">
          <div class="info-label">${clientLabel}</div>
          <div class="info-value">${esc(bill.clientName || 'Client Name')}</div>
          ${bill.clientPhone ? `<div class="info-small">Phone: ${esc(bill.clientPhone)}</div>` : ''}
          ${bill.clientEmail ? `<div class="info-small">Email: ${esc(bill.clientEmail)}</div>` : ''}
          ${bill.clientAddress ? `<div class="info-small">Address: ${esc(bill.clientAddress)}</div>` : ''}
        </div>
      </div>

      <div class="grow">
        ${items.length > 0 ? `
        <div class="items-section">
          <div class="items-label">Items / Services</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width:30px;">#</th>
                <th>Description</th>
                <th class="ctr" style="width:50px;">Qty</th>
                ${!isChalan ? `<th class="num" style="width:90px;">${isOffer ? 'Rate' : 'Unit Price'}</th><th class="num" style="width:100px;">Amount</th>` : ''}
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>` : ''}

        ${summaryHtml}
        ${bannerHtml}
        ${termsHtml}
      </div>

      <div class="thanks"><strong>${footerThankYou}</strong></div>
      <div class="receipt-footer">${sigHtml}</div>
      <div class="generated-note">${footerGenerated}</div>
    </div>
  </div>

  <script>
    var __isPrintMode = ${mode === 'print' ? 'true' : 'false'};
    function triggerBillPrint() {
      if (window.__printed) return;
      window.__printed = true;
      if (__isPrintMode) {
        window.onafterprint = function () { try { window.close(); } catch (e) {} };
      }
      var go = function () { window.focus(); window.print(); };
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { setTimeout(go, 250); });
      } else {
        setTimeout(go, 400);
      }
    }
    window.addEventListener('load', function () {
      var logo = document.querySelector('.receipt-logo-img');
      if (logo && !logo.complete) {
        logo.onload = triggerBillPrint;
        logo.onerror = triggerBillPrint;
        setTimeout(triggerBillPrint, 3000);
      } else {
        triggerBillPrint();
      }
    });
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    toast.error('Pop-up was blocked. Please allow pop-ups for this website to print bill.');
  }
}

// Converts TipTap JSON node to safe HTML
function renderDescriptionNode(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    let text = (node.text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    if (node.marks) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        else if (mark.type === 'italic') text = `<em>${text}</em>`;
        else if (mark.type === 'underline') text = `<u>${text}</u>`;
        else if (mark.type === 'strike') text = `<s>${text}</s>`;
      });
    }
    return text;
  }
  const children = node.content ? node.content.map(renderDescriptionNode).join('') : '';
  switch (node.type) {
    case 'doc': return children;
    case 'paragraph': return `<p style="margin:2px 0">${children || '&nbsp;'}</p>`;
    case 'hardBreak': return '<br>';
    default: return children;
  }
}

export function generateDescriptionHtml(description?: string): string {
  const lines = getDescriptionLines(description);
  if (lines.length === 0) return '';
  return lines.map(l => `<div style="margin:1px 0;line-height:1.4;">${l}</div>`).join('');
}

export function getDescriptionLines(description?: string): string[] {
  if (!description) return [];
  const trimmed = description.trim();
  if (trimmed.startsWith('{')) {
    try {
      let parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') parsed = JSON.parse(parsed);
      if (parsed && parsed.type === 'doc' && Array.isArray(parsed.content)) {
        const lines: string[] = [];
        parsed.content.forEach((child: any) => {
          const html = renderDescriptionNode(child);
          if (html && html.trim() && html !== '<p style="margin:2px 0">&nbsp;</p>') {
            lines.push(html);
          }
        });
        if (lines.length > 0) return lines;
      }
      const fullHtml = renderDescriptionNode(parsed);
      if (fullHtml) return [fullHtml];
    } catch {
      // not JSON, fall through
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
}

/**
 * Generates a professional Money / Payment Receipt popup for a client bill.
 * Shows client info, purchased items, grand total, amount received this payment,
 * and remaining due balance.
 */
export async function generatePaymentReceiptPDF(
  bill: any,
  settings: any,
  paymentAmount?: number,
  customReceiptDate?: string | Date,
  txId?: string,
  isInitialBill?: boolean
) {
  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
  const brandEmail = settings?.contact?.email || '';
  const brandPhone = settings?.contact?.phone || '';
  const brandAddress = settings?.contact?.address || '';

  let primary = '#00D1B2';
  let primaryForeground = '#ffffff';
  let border = '#e2e8f0';
  let mutedForeground = '#64748b';
  let foreground = '#0f172a';

  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement);
    const getColor = (varName: string, fallback: string) => {
      const val = rootStyle.getPropertyValue(varName).trim();
      if (!val) return fallback;
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl') || val.startsWith('oklch') || val.includes('(')) return val;
      return `hsl(${val})`;
    };
    primary = getColor('--primary', primary);
    primaryForeground = getColor('--primary-foreground', primaryForeground);
    border = getColor('--border', border);
    mutedForeground = getColor('--muted-foreground', mutedForeground);
    foreground = getColor('--foreground', foreground);
  }

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  };
  const brandLogoUrl = settings?.logoUrl || settings?.logo || '/logo.webp';
  const finalLogoUrl = getAbsoluteUrl(brandLogoUrl);

  const invoiceId = String(bill.invoiceNo || bill._id || '').toUpperCase();
  const billDate = bill.date ? new Date(bill.date) : new Date();
  const formattedDate = isValid(billDate) ? format(billDate, 'dd MMM yyyy') : 'N/A';
  const parsedReceiptDate = customReceiptDate ? new Date(customReceiptDate) : new Date();
  const receiptDate = isValid(parsedReceiptDate) ? format(parsedReceiptDate, 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');

  const items: any[] = Array.isArray(bill.items) ? bill.items : [];
  const grandTotal = Math.round(bill.gTotal || bill.total || 0);
  const prevDue = Math.round(bill.prevDue || 0);

  // Analyze payment history list if available
  const payments: any[] = Array.isArray(bill.payments) ? bill.payments : [];

  let thisPayment = 0;
  let previouslyPaid = 0;
  let totalPaid = 0;
  let remainingDue = 0;

  if (isInitialBill) {
    thisPayment = 0;
    previouslyPaid = 0;
    totalPaid = 0;
    remainingDue = grandTotal;
  } else if (payments.length > 0) {
    let matchedIdx = -1;
    if (txId) {
      matchedIdx = payments.findIndex(p => p._id?.toString() === txId.toString());
    }
    if (matchedIdx === -1 && paymentAmount !== undefined && paymentAmount > 0) {
      matchedIdx = payments.findIndex(p => Math.round(p.amount) === Math.round(paymentAmount));
    }

    if (matchedIdx !== -1) {
      previouslyPaid = payments.slice(0, matchedIdx).reduce((acc, p) => acc + Math.round(p.amount || 0), 0);
      thisPayment = Math.round(payments[matchedIdx].amount || thisPayment);
      totalPaid = previouslyPaid + thisPayment;
      remainingDue = Math.max(0, grandTotal - totalPaid);
    } else {
      thisPayment = Math.round(paymentAmount !== undefined ? paymentAmount : (bill.cashIn || 0));
      totalPaid = Math.round(bill.cashIn || thisPayment);
      previouslyPaid = Math.max(0, totalPaid - thisPayment);
      remainingDue = Math.max(0, grandTotal - totalPaid);
    }
  } else {
    if (paymentAmount !== undefined) {
      thisPayment = Math.round(paymentAmount);
      if (thisPayment < grandTotal && (!bill.cashIn || bill.cashIn === thisPayment)) {
        previouslyPaid = 0;
        totalPaid = thisPayment;
        remainingDue = Math.max(0, grandTotal - totalPaid);
      } else {
        totalPaid = Math.round(bill.cashIn || thisPayment);
        previouslyPaid = Math.max(0, totalPaid - thisPayment);
        remainingDue = Math.max(0, grandTotal - totalPaid);
      }
    } else {
      thisPayment = Math.round(bill.cashIn || 0);
      totalPaid = thisPayment;
      previouslyPaid = 0;
      remainingDue = Math.max(0, grandTotal - totalPaid);
    }
  }

  const dueBeforePayment = Math.max(0, grandTotal - previouslyPaid);
  const amountInWords = thisPayment > 0 ? `${numberToWords(thisPayment)} Taka Only` : 'Zero Taka (Initial Due Stage)';

  const itemRows = items.map((item: any, idx: number) => {
    const descLines = getDescriptionLines(item.description);
    const hasDesc = descLines.length > 0;

    let rowHtml = `
      <tr class="item-main-row" style="border-top:1px solid ${border};${!hasDesc ? `border-bottom:1px solid ${border};` : ''}">
        <td style="padding:6px 8px;color:${mutedForeground};font-size:11px;vertical-align:top;">${idx + 1}</td>
        <td style="padding:6px 8px;font-weight:600;font-size:12px;vertical-align:top;">${item.name || ''}</td>
        <td style="padding:6px 8px;text-align:center;font-size:12px;vertical-align:top;">${item.quantity || 1}</td>
        <td style="padding:6px 8px;text-align:right;font-size:12px;vertical-align:top;">৳${Math.round(item.price || 0).toLocaleString()}</td>
        <td style="padding:6px 8px;text-align:right;font-size:12px;font-weight:600;vertical-align:top;">৳${Math.round((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
      </tr>
    `;

    descLines.forEach((line: string, lineIdx: number) => {
      const isLast = lineIdx === descLines.length - 1;
      rowHtml += `
        <tr class="item-desc-row" style="${isLast ? `border-bottom:1px solid ${border};` : ''}">
          <td></td>
          <td style="padding:1px 8px 3px 8px;color:${mutedForeground};font-size:10.5px;line-height:1.4;">${line}</td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    });

    return rowHtml;
  }).join('');

  const deliveryCharge = Math.round(bill.deliveryCharge || 0);
  const serviceFee = Math.round(bill.serviceFee || 0);
  const discount = Math.round(bill.discount || 0);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Money Receipt - ${invoiceId}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
      margin: 0; padding: 0;
      background: #f1f5f9;
      color: ${foreground};
      font-size: 12.5px;
    }
    .no-print {
      position: sticky; top: 0; z-index: 999;
      background: #fff; border-bottom: 1px solid ${border};
      padding: 10px 24px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }
    .no-print h3 { margin: 0; font-size: 15px; color: ${foreground}; }
    .no-print button {
      padding: 7px 20px; border-radius: 6px; border: none;
      background: ${primary}; color: ${primaryForeground};
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .page-wrap { padding: 28px 0 40px 0; }
    .receipt-card {
      width: 190mm;
      margin: 0 auto;
      background: #fff;
      border: 1px solid ${border};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      position: relative;
    }

    /* Header */
    .receipt-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 20px 12px 20px;
      border-bottom: 3px solid ${primary};
      background: linear-gradient(135deg, ${primary}12 0%, transparent 60%);
      gap: 16px;
    }
    .receipt-logo-container {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    .receipt-logo-img {
      height: 70px;
      max-height: 80px;
      max-width: 200px;
      object-fit: contain;
      display: block;
    }

    .brand-name { font-size: 16px; font-weight: 800; color: ${primary}; letter-spacing: 0.04em; text-transform: uppercase; }
    .brand-sub { font-size: 11px; color: ${mutedForeground}; line-height: 1.4; margin-top: 2px; }

    /* Client & Bill Info */
    .info-row {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0; border-bottom: 1px solid ${border};
    }
    .info-block { padding: 12px 20px; }
    .info-block + .info-block { border-left: 1px solid ${border}; }
    .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${mutedForeground}; margin-bottom: 5px; }
    .info-value { font-size: 13px; font-weight: 700; color: ${foreground}; }
    .info-small { font-size: 10.5px; color: ${mutedForeground}; margin-top: 2px; }

    .receipt-title { font-size: 20px; font-weight: 900; color: ${primary}; letter-spacing: -0.02em; text-transform: uppercase; margin: 0; }
    .receipt-sub { font-size: 10px; color: ${mutedForeground}; margin-top: 1px; }
    .receipt-meta { font-size: 11px; color: ${foreground}; margin-top: 5px; }
    .receipt-meta span { font-weight: 700; }

    /* Items Table */
    .items-section { padding: 0 20px 10px 20px; }
    .items-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${mutedForeground}; padding: 12px 0 6px 0; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .items-table thead th {
      background: ${primary}18;
      color: ${mutedForeground};
      font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 6px 8px; text-align: left; border-bottom: 2px solid ${primary}40;
    }
    .items-table thead th:nth-child(3),
    .items-table thead th:nth-child(4),
    .items-table thead th:nth-child(5) { text-align: right; }

    /* Totals */
    .bill-summary-container {
      display: flex; justify-content: flex-end;
      padding: 4px 20px 12px 20px;
    }
    .bill-summary-box {
      width: 270px;
      border: 1px solid ${border};
      border-radius: 6px;
      padding: 8px 12px;
      background: #fafafa;
    }

    /* Payment Banner */
    .payment-banner {
      margin: 0 20px 16px 20px;
      background: ${primary};
      color: ${primaryForeground};
      border-radius: 8px;
      padding: 12px 18px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .payment-banner .left-side .label { font-size: 10px; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.06em; }
    .payment-banner .left-side .amount { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; margin-top: 2px; }
    .payment-banner .left-side .words { font-size: 9.5px; opacity: 0.8; margin-top: 3px; }
    .payment-banner .right-side { text-align: right; }
    .payment-banner .right-side .due-label { font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.06em; }
    .payment-banner .right-side .due-amount { font-size: 16px; font-weight: 800; margin-top: 2px; }
    .due-zero { opacity: 0.7; }

    /* Footer */
    .receipt-footer {
      padding: 10px 20px 14px 20px;
      border-top: 1px solid ${border};
      display: flex; justify-content: space-between; align-items: flex-end;
      font-size: 10px; color: ${mutedForeground};
    }
    .sig-line { width: 140px; border-top: 1.5px solid ${foreground}; padding-top: 5px; text-align: center; font-size: 11px; color: ${foreground}; margin-top: 42px; }
    .watermark {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 56px; font-weight: 900; opacity: 0.045;
      color: ${primary}; text-transform: uppercase; letter-spacing: 0.1em;
      pointer-events: none; white-space: nowrap; z-index: 0;
    }

    @media print {
      @page {
        size: auto;
        margin: 8mm 8mm 8mm 8mm;
      }
      .no-print { display: none !important; }
      body { background: #fff !important; }
      .page-wrap { padding: 0 !important; }
      .receipt-card {
        box-shadow: none !important;
        border: none !important;
        width: 100% !important;
        border-radius: 0 !important;
        overflow: visible !important;
        page-break-inside: auto !important;
      }
      .items-table thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .payment-banner, .receipt-footer, .bill-summary-container, .info-row, .receipt-header {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <h3>Money / Payment Receipt</h3>
    <button onclick="window.print()">Print Receipt</button>
  </div>

  <div class="page-wrap">
    <div class="receipt-card">
      <div class="watermark">Receipt</div>

      <!-- Header: Left Brand Info, Right Branding Logo -->
      <div class="receipt-header">
        <div>
          <div class="brand-name">${brandName}</div>
          <div class="brand-sub">
            ${brandAddress ? brandAddress + '<br>' : ''}
            ${brandPhone ? 'Phone: ' + brandPhone : ''} ${brandPhone && brandEmail ? '&nbsp;|&nbsp; ' : ''}${brandEmail ? 'Email: ' + brandEmail : ''}
          </div>
        </div>
        <div class="receipt-logo-container">
          <img src="${finalLogoUrl}" alt="${brandName}" class="receipt-logo-img" />
        </div>
      </div>

      <!-- Info Row -->
      <div class="info-row">
        <div class="info-block">
          <div class="receipt-title">Money Receipt</div>
          <div class="receipt-sub">Payment Acknowledgement</div>
          <div class="receipt-meta">
            <div>Bill No: <span>${invoiceId}</span></div>
            <div>Bill Date: <span>${formattedDate}</span></div>
            <div>Receipt Date: <span>${receiptDate}</span></div>
          </div>
        </div>

        <div class="info-block">
          <div class="info-label">Received From</div>
          <div class="info-value">${bill.clientName || 'N/A'}</div>
          ${bill.clientPhone ? `<div class="info-small">Phone: ${bill.clientPhone}</div>` : ''}
          ${bill.clientEmail ? `<div class="info-small">Email: ${bill.clientEmail}</div>` : ''}
          ${bill.clientAddress ? `<div class="info-small">Address: ${bill.clientAddress}</div>` : ''}
        </div>
      </div>

      <!-- Items Section -->
      ${items.length > 0 ? `
      <div class="items-section">
        <div class="items-label">Items / Services</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>Description</th>
              <th style="width:50px;text-align:center;">Qty</th>
              <th style="width:80px;text-align:right;">Unit Price</th>
              <th style="width:90px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Bill Summary -->
      <div class="bill-summary-container">
        <div class="bill-summary-box">
          <div class="info-label" style="margin-bottom: 5px; border-bottom: 1px solid ${border}; padding-bottom: 3px;">Bill Summary</div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Subtotal:</span>
            <strong>৳${Math.round(bill.subtotal || 0).toLocaleString()}</strong>
          </div>
          ${deliveryCharge > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Delivery:</span>
            <strong>৳${deliveryCharge.toLocaleString()}</strong>
          </div>` : ''}
          ${serviceFee > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Service Fee:</span>
            <strong>৳${serviceFee.toLocaleString()}</strong>
          </div>` : ''}
          ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Discount:</span>
            <strong style="color: #ef4444;">-৳${discount.toLocaleString()}</strong>
          </div>` : ''}
          ${prevDue > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Previous Due:</span>
            <strong>৳${prevDue.toLocaleString()}</strong>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: ${primary}; border-top: 1px solid ${border}; margin-top: 4px; padding-top: 4px;">
            <span>Grand Total:</span>
            <span>৳${grandTotal.toLocaleString()}</span>
          </div>
          ${previouslyPaid > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #475569;">
            <span>Previously Paid:</span>
            <strong>৳${previouslyPaid.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #dc2626;">
            <span>Due Before Payment:</span>
            <strong>৳${dueBeforePayment.toLocaleString()}</strong>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0; border-top: 1px dashed ${border}; margin-top: 3px; padding-top: 3px;">
            <span style="color: ${primary}; font-weight: 600;">This Payment Received:</span>
            <strong style="color: ${primary};">৳${thisPayment.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Total Paid To Date:</span>
            <strong>৳${totalPaid.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0; border-top: 1px solid ${border}; margin-top: 3px; padding-top: 3px;">
            <span style="font-weight: 600;">Remaining Due:</span>
            <strong style="${remainingDue === 0 ? 'color: #10b981;' : 'color: #ef4444;'}">
              ${remainingDue === 0 ? '৳0 (Fully Paid)' : `৳${remainingDue.toLocaleString()}`}
            </strong>
          </div>
        </div>
      </div>

      <!-- Payment Banner -->
      <div class="payment-banner">
        <div class="left-side">
          <div class="label">Amount Received (This Receipt)</div>
          <div class="amount">৳${thisPayment.toLocaleString()}</div>
          <div class="words">${amountInWords}</div>
        </div>
        <div class="right-side">
          ${remainingDue <= 0
            ? `<div class="due-label">Status</div><div class="due-amount due-zero">Fully Paid</div>`
            : `<div class="due-label">Remaining Due</div><div class="due-amount">৳${remainingDue.toLocaleString()}</div>`
          }
        </div>
      </div>

      <!-- Footer -->
      <div class="receipt-footer">
        <div>
          <div class="sig-line">Received By</div>
        </div>
        <div style="text-align: center;">
          <div class="sig-line">Authorized Signature</div>
        </div>
        <div style="text-align: right;">
          <div class="sig-line">Client Signature</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function triggerReceiptPrint() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          setTimeout(function() { window.focus(); window.print(); }, 250);
        });
      } else {
        setTimeout(function() { window.focus(); window.print(); }, 400);
      }
    }
    window.addEventListener('load', function() {
      var logo = document.querySelector('.receipt-logo-img');
      if (logo && !logo.complete) {
        logo.onload = triggerReceiptPrint;
        logo.onerror = triggerReceiptPrint;
      } else {
        triggerReceiptPrint();
      }
    });
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    toast.error('Pop-up was blocked. Please allow pop-ups for this website to print receipts.');
  }
}

/**
 * Generates a professional Payment Voucher popup for a supplier purchase bill.
 * Shows supplier info, purchased items, total bill, amount paid this voucher,
 * and remaining due balance.
 */
export async function generateSupplierPaymentReceiptPDF(
  bill: any,
  settings: any,
  paymentAmount?: number,
  customReceiptDate?: string | Date,
  txId?: string,
  isInitialBill?: boolean
) {
  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
  const brandEmail = settings?.contact?.email || '';
  const brandPhone = settings?.contact?.phone || '';
  const brandAddress = settings?.contact?.address || '';

  let primary = '#00D1B2';
  let primaryForeground = '#ffffff';
  let border = '#e2e8f0';
  let mutedForeground = '#64748b';
  let foreground = '#0f172a';

  if (typeof window !== 'undefined') {
    const rootStyle = getComputedStyle(document.documentElement);
    const getColor = (varName: string, fallback: string) => {
      const val = rootStyle.getPropertyValue(varName).trim();
      if (!val) return fallback;
      if (val.startsWith('#') || val.startsWith('rgb') || val.startsWith('hsl') || val.startsWith('oklch') || val.includes('(')) return val;
      return `hsl(${val})`;
    };
    primary = getColor('--primary', primary);
    primaryForeground = getColor('--primary-foreground', primaryForeground);
    border = getColor('--border', border);
    mutedForeground = getColor('--muted-foreground', mutedForeground);
    foreground = getColor('--foreground', foreground);
  }

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  };
  const brandLogoUrl = settings?.logoUrl || settings?.logo || '/logo.webp';
  const finalLogoUrl = getAbsoluteUrl(brandLogoUrl);

  const billNo = String(bill.billNo || bill._id || '').toUpperCase();
  const billDate = bill.date ? new Date(bill.date) : new Date();
  const formattedDate = isValid(billDate) ? format(billDate, 'dd MMM yyyy') : 'N/A';
  const parsedReceiptDate = customReceiptDate ? new Date(customReceiptDate) : new Date();
  const receiptDate = isValid(parsedReceiptDate) ? format(parsedReceiptDate, 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');

  const items: any[] = Array.isArray(bill.items) ? bill.items : [];
  const total = Math.round(bill.total || 0);

  const payments: any[] = Array.isArray(bill.payments) ? bill.payments : [];

  let thisPayment = 0;
  let previouslyPaid = 0;
  let totalPaid = 0;
  let remainingDue = 0;

  if (isInitialBill) {
    thisPayment = 0;
    previouslyPaid = 0;
    totalPaid = 0;
    remainingDue = total;
  } else if (payments.length > 0) {
    let matchedIdx = -1;
    if (txId) {
      matchedIdx = payments.findIndex(p => p._id?.toString() === txId.toString());
    }
    if (matchedIdx === -1 && paymentAmount !== undefined && paymentAmount > 0) {
      matchedIdx = payments.findIndex(p => Math.round(p.amount) === Math.round(paymentAmount));
    }

    if (matchedIdx !== -1) {
      previouslyPaid = payments.slice(0, matchedIdx).reduce((acc, p) => acc + Math.round(p.amount || 0), 0);
      thisPayment = Math.round(payments[matchedIdx].amount || thisPayment);
      totalPaid = previouslyPaid + thisPayment;
      remainingDue = Math.max(0, total - totalPaid);
    } else {
      thisPayment = Math.round(paymentAmount !== undefined ? paymentAmount : (bill.paidAmount || 0));
      totalPaid = Math.round(bill.paidAmount || thisPayment);
      previouslyPaid = Math.max(0, totalPaid - thisPayment);
      remainingDue = Math.max(0, total - totalPaid);
    }
  } else {
    if (paymentAmount !== undefined) {
      thisPayment = Math.round(paymentAmount);
      if (thisPayment < total && (!bill.paidAmount || bill.paidAmount === thisPayment)) {
        previouslyPaid = 0;
        totalPaid = thisPayment;
        remainingDue = Math.max(0, total - totalPaid);
      } else {
        totalPaid = Math.round(bill.paidAmount || thisPayment);
        previouslyPaid = Math.max(0, totalPaid - thisPayment);
        remainingDue = Math.max(0, total - totalPaid);
      }
    } else {
      thisPayment = Math.round(bill.paidAmount || 0);
      totalPaid = thisPayment;
      previouslyPaid = 0;
      remainingDue = Math.max(0, total - totalPaid);
    }
  }

  const dueBeforePayment = Math.max(0, total - previouslyPaid);
  const amountInWords = thisPayment > 0 ? `${numberToWords(thisPayment)} Taka Only` : 'Zero Taka (Initial Due Stage)';

  const itemRows = items.map((item: any, idx: number) => {
    return `
      <tr class="item-main-row" style="border-top:1px solid ${border};border-bottom:1px solid ${border};">
        <td style="padding:6px 8px;color:${mutedForeground};font-size:11px;vertical-align:top;">${idx + 1}</td>
        <td style="padding:6px 8px;font-weight:600;font-size:12px;vertical-align:top;">${item.name || ''}</td>
        <td style="padding:6px 8px;text-align:center;font-size:12px;vertical-align:top;">${item.quantity || 1}</td>
        <td style="padding:6px 8px;text-align:right;font-size:12px;vertical-align:top;">৳${Math.round(item.price || 0).toLocaleString()}</td>
        <td style="padding:6px 8px;text-align:right;font-size:12px;font-weight:600;vertical-align:top;">৳${Math.round((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  const discount = Math.round(bill.discount || 0);
  const supplierName = bill.supplier?.name || 'N/A';
  const supplierCompany = bill.supplier?.companyName || '';
  const supplierPhone = bill.supplier?.phone || '';
  const supplierEmail = bill.supplier?.email || '';
  const supplierAddress = bill.supplier?.address || '';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Voucher - ${billNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
      margin: 0; padding: 0;
      background: #f1f5f9;
      color: ${foreground};
      font-size: 12.5px;
    }
    .no-print {
      position: sticky; top: 0; z-index: 999;
      background: #fff; border-bottom: 1px solid ${border};
      padding: 10px 24px;
      display: flex; justify-content: space-between; align-items: center;
      box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }
    .no-print h3 { margin: 0; font-size: 15px; color: ${foreground}; }
    .no-print button {
      padding: 7px 20px; border-radius: 6px; border: none;
      background: ${primary}; color: ${primaryForeground};
      font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .page-wrap { padding: 28px 0 40px 0; }
    .receipt-card {
      width: 190mm;
      margin: 0 auto;
      background: #fff;
      border: 1px solid ${border};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      position: relative;
    }

    /* Header */
    .receipt-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 14px 20px 12px 20px;
      border-bottom: 3px solid ${primary};
      background: linear-gradient(135deg, ${primary}12 0%, transparent 60%);
      gap: 16px;
    }
    .receipt-logo-container {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    .receipt-logo-img {
      height: 70px;
      max-height: 80px;
      max-width: 200px;
      object-fit: contain;
      display: block;
    }

    .brand-name { font-size: 16px; font-weight: 800; color: ${primary}; letter-spacing: 0.04em; text-transform: uppercase; }
    .brand-sub { font-size: 11px; color: ${mutedForeground}; line-height: 1.4; margin-top: 2px; }

    /* Supplier & Bill Info */
    .info-row {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 0; border-bottom: 1px solid ${border};
    }
    .info-block { padding: 12px 20px; }
    .info-block + .info-block { border-left: 1px solid ${border}; }
    .info-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${mutedForeground}; margin-bottom: 5px; }
    .info-value { font-size: 13px; font-weight: 700; color: ${foreground}; }
    .info-small { font-size: 10.5px; color: ${mutedForeground}; margin-top: 2px; }

    .receipt-title { font-size: 20px; font-weight: 900; color: ${primary}; letter-spacing: -0.02em; text-transform: uppercase; margin: 0; }
    .receipt-sub { font-size: 10px; color: ${mutedForeground}; margin-top: 1px; }
    .receipt-meta { font-size: 11px; color: ${foreground}; margin-top: 5px; }
    .receipt-meta span { font-weight: 700; }

    /* Items Table */
    .items-section { padding: 0 20px 10px 20px; }
    .items-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${mutedForeground}; padding: 12px 0 6px 0; }
    .items-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .items-table thead th {
      background: ${primary}18;
      color: ${mutedForeground};
      font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
      padding: 6px 8px; text-align: left; border-bottom: 2px solid ${primary}40;
    }
    .items-table thead th:nth-child(3),
    .items-table thead th:nth-child(4),
    .items-table thead th:nth-child(5) { text-align: right; }

    /* Totals */
    .bill-summary-container {
      display: flex; justify-content: flex-end;
      padding: 4px 20px 12px 20px;
    }
    .bill-summary-box {
      width: 270px;
      border: 1px solid ${border};
      border-radius: 6px;
      padding: 8px 12px;
      background: #fafafa;
    }

    /* Payment Banner */
    .payment-banner {
      margin: 0 20px 16px 20px;
      background: ${primary};
      color: ${primaryForeground};
      border-radius: 8px;
      padding: 12px 18px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .payment-banner .left-side .label { font-size: 10px; font-weight: 600; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.06em; }
    .payment-banner .left-side .amount { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; margin-top: 2px; }
    .payment-banner .left-side .words { font-size: 9.5px; opacity: 0.8; margin-top: 3px; }
    .payment-banner .right-side { text-align: right; }
    .payment-banner .right-side .due-label { font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.06em; }
    .payment-banner .right-side .due-amount { font-size: 16px; font-weight: 800; margin-top: 2px; }
    .due-zero { opacity: 0.7; }

    /* Footer */
    .receipt-footer {
      padding: 10px 20px 14px 20px;
      border-top: 1px solid ${border};
      display: flex; justify-content: space-between; align-items: flex-end;
      font-size: 10px; color: ${mutedForeground};
    }
    .sig-line { width: 140px; border-top: 1.5px solid ${foreground}; padding-top: 5px; text-align: center; font-size: 11px; color: ${foreground}; margin-top: 42px; }
    .watermark {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 56px; font-weight: 900; opacity: 0.045;
      color: ${primary}; text-transform: uppercase; letter-spacing: 0.1em;
      pointer-events: none; white-space: nowrap; z-index: 0;
    }

    @media print {
      @page {
        size: auto;
        margin: 8mm 8mm 8mm 8mm;
      }
      .no-print { display: none !important; }
      body { background: #fff !important; }
      .page-wrap { padding: 0 !important; }
      .receipt-card {
        box-shadow: none !important;
        border: none !important;
        width: 100% !important;
        border-radius: 0 !important;
        overflow: visible !important;
        page-break-inside: auto !important;
      }
      .items-table thead {
        display: table-header-group;
      }
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .payment-banner, .receipt-footer, .bill-summary-container, .info-row, .receipt-header {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <h3>Payment Voucher</h3>
    <button onclick="window.print()">Print Voucher</button>
  </div>

  <div class="page-wrap">
    <div class="receipt-card">
      <div class="watermark">Voucher</div>

      <!-- Header -->
      <div class="receipt-header">
        <div>
          <div class="brand-name">${brandName}</div>
          <div class="brand-sub">
            ${brandAddress ? brandAddress + '<br>' : ''}
            ${brandPhone ? 'Phone: ' + brandPhone : ''} ${brandPhone && brandEmail ? '&nbsp;|&nbsp; ' : ''}${brandEmail ? 'Email: ' + brandEmail : ''}
          </div>
        </div>
        <div class="receipt-logo-container">
          <img src="${finalLogoUrl}" alt="${brandName}" class="receipt-logo-img" />
        </div>
      </div>

      <!-- Info Row -->
      <div class="info-row">
        <div class="info-block">
          <div class="receipt-title">Payment Voucher</div>
          <div class="receipt-sub">Supplier Disbursement Acknowledgement</div>
          <div class="receipt-meta">
            <div>Bill No: <span>${billNo}</span></div>
            <div>Bill Date: <span>${formattedDate}</span></div>
            <div>Voucher Date: <span>${receiptDate}</span></div>
          </div>
        </div>

        <div class="info-block">
          <div class="info-label">Paid To (Supplier)</div>
          <div class="info-value">${supplierName}</div>
          ${supplierCompany ? `<div class="info-small"><strong>Company:</strong> ${supplierCompany}</div>` : ''}
          ${supplierPhone ? `<div class="info-small">Phone: ${supplierPhone}</div>` : ''}
          ${supplierEmail ? `<div class="info-small">Email: ${supplierEmail}</div>` : ''}
          ${supplierAddress ? `<div class="info-small">Address: ${supplierAddress}</div>` : ''}
        </div>
      </div>

      <!-- Items Section -->
      ${items.length > 0 ? `
      <div class="items-section">
        <div class="items-label">Purchased Items / Goods</div>
        <table class="items-table">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>Item / Product</th>
              <th style="width:50px;text-align:center;">Qty</th>
              <th style="width:80px;text-align:right;">Unit Price</th>
              <th style="width:90px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Bill Summary -->
      <div class="bill-summary-container">
        <div class="bill-summary-box">
          <div class="info-label" style="margin-bottom: 5px; border-bottom: 1px solid ${border}; padding-bottom: 3px;">Bill Summary</div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Subtotal:</span>
            <strong>৳${Math.round(bill.subtotal || 0).toLocaleString()}</strong>
          </div>
          ${discount > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Discount:</span>
            <strong style="color: #ef4444;">-৳${discount.toLocaleString()}</strong>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: ${primary}; border-top: 1px solid ${border}; margin-top: 4px; padding-top: 4px;">
            <span>Total Bill:</span>
            <span>৳${total.toLocaleString()}</span>
          </div>
          ${previouslyPaid > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #475569;">
            <span>Previously Paid:</span>
            <strong>৳${previouslyPaid.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; color: #dc2626;">
            <span>Due Before Payment:</span>
            <strong>৳${dueBeforePayment.toLocaleString()}</strong>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0; border-top: 1px dashed ${border}; margin-top: 3px; padding-top: 3px;">
            <span style="color: ${primary}; font-weight: 600;">This Payment Paid:</span>
            <strong style="color: ${primary};">৳${thisPayment.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0;">
            <span style="color: ${mutedForeground};">Total Paid To Date:</span>
            <strong>৳${totalPaid.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; padding: 2px 0; border-top: 1px solid ${border}; margin-top: 3px; padding-top: 3px;">
            <span style="font-weight: 600;">Remaining Due:</span>
            <strong style="${remainingDue === 0 ? 'color: #10b981;' : 'color: #ef4444;'}">
              ${remainingDue === 0 ? '৳0 (Fully Settled)' : `৳${remainingDue.toLocaleString()}`}
            </strong>
          </div>
        </div>
      </div>

      <!-- Payment Banner -->
      <div class="payment-banner">
        <div class="left-side">
          <div class="label">Amount Paid (This Voucher)</div>
          <div class="amount">৳${thisPayment.toLocaleString()}</div>
          <div class="words">${amountInWords}</div>
        </div>
        <div class="right-side">
          ${remainingDue <= 0
            ? `<div class="due-label">Status</div><div class="due-amount due-zero">Fully Settled</div>`
            : `<div class="due-label">Remaining Due</div><div class="due-amount">৳${remainingDue.toLocaleString()}</div>`
          }
        </div>
      </div>

      <!-- Footer -->
      <div class="receipt-footer">
        <div>
          <div class="sig-line">Prepared By</div>
        </div>
        <div style="text-align: center;">
          <div class="sig-line">Authorized Signature</div>
        </div>
        <div style="text-align: right;">
          <div class="sig-line">Supplier Signature / Receiver</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    function triggerVoucherPrint() {
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function() {
          setTimeout(function() { window.focus(); window.print(); }, 250);
        });
      } else {
        setTimeout(function() { window.focus(); window.print(); }, 400);
      }
    }
    window.addEventListener('load', function() {
      var logo = document.querySelector('.receipt-logo-img');
      if (logo && !logo.complete) {
        logo.onload = triggerVoucherPrint;
        logo.onerror = triggerVoucherPrint;
      } else {
        triggerVoucherPrint();
      }
    });
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    toast.error('Pop-up was blocked. Please allow pop-ups for this website to print receipts.');
  }
}
