import nodemailer from 'nodemailer';

const isCustomSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const rawSmtpPort = Number(process.env.SMTP_PORT) || 2525;
// DigitalOcean droplets block outbound ports 25/465/587; force port 2525 for Brevo SMTP
const resolvedSmtpPort =
  process.env.SMTP_HOST?.includes('brevo.com') && (rawSmtpPort === 587 || rawSmtpPort === 465 || !process.env.SMTP_PORT)
    ? 2525
    : rawSmtpPort;

const primaryCustomTransporter = isCustomSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: resolvedSmtpPort,
      secure: resolvedSmtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000,
    })
  : null;

// Optional secondary SMTP relay fallback via env
const fallbackBrevoTransporter =
  process.env.FALLBACK_SMTP_USER && process.env.FALLBACK_SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.FALLBACK_SMTP_HOST || 'smtp-relay.brevo.com',
        port: Number(process.env.FALLBACK_SMTP_PORT) || 2525,
        secure: false,
        auth: {
          user: process.env.FALLBACK_SMTP_USER,
          pass: process.env.FALLBACK_SMTP_PASS,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      })
    : null;

const gmailFallbackTransporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
      })
    : null;

const transporter = {
  sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
    const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';

    // Tier 1: Primary Custom SMTP (Automatically uses Port 2525 on Brevo to bypass DigitalOcean port 587 block)
    if (primaryCustomTransporter) {
      try {
        return await primaryCustomTransporter.sendMail(mailOptions);
      } catch (primaryErr: any) {
        console.warn('[Mail] Primary SMTP failed, trying fallback transport:', primaryErr?.message || primaryErr);
      }
    }

    // Tier 2: Secondary SMTP Relay Fallback (if configured)
    if (fallbackBrevoTransporter) {
      try {
        return await fallbackBrevoTransporter.sendMail(mailOptions);
      } catch (brevoErr: any) {
        console.warn('[Mail] Secondary SMTP relay failed, trying Gmail fallback:', brevoErr?.message || brevoErr);
      }
    }

    // Tier 3: Gmail SMTP Fallback
    if (gmailFallbackTransporter) {
      return await gmailFallbackTransporter.sendMail({
        ...mailOptions,
        from: `"${brandName}" <${process.env.EMAIL_USER}>`,
      });
    }

    throw new Error('All SMTP mail transports failed.');
  },
};

const getSenderEmail = () => {
  const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@swapnobaz.com';
  return `"${brandName}" <${user}>`;
};

const escapeHtml = (text?: string | null): string => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export interface ResetEmailResellerContext {
  storeName: string;
  subdomain: string;
  customDomain?: string;
  logoUrl?: string;
}

export const sendResetEmail = async (
  email: string,
  token: string,
  resellerContext?: ResetEmailResellerContext
) => {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || '';
  const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
  const encodedToken = encodeURIComponent(token);

  let resetUrl: string;
  if (resellerContext) {
    if (resellerContext.customDomain) {
      resetUrl = `https://${resellerContext.customDomain}/reset-password?token=${encodedToken}`;
    } else if (resellerContext.subdomain && rootDomain) {
      resetUrl = `https://${resellerContext.subdomain}.${rootDomain}/reset-password?token=${encodedToken}`;
    } else {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      resetUrl = `${baseUrl}/reset-password?token=${encodedToken}`;
    }
  } else {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    resetUrl = `${baseUrl}/reset-password?token=${encodedToken}`;
  }

  // Extract raw email address from EMAIL_FROM or SMTP_USER
  const senderAddress = process.env.EMAIL_FROM
    ? (process.env.EMAIL_FROM.match(/<([^>]+)>/)?.[1] || process.env.EMAIL_FROM.trim())
    : (process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@swapnobaz.com');

  const senderName = resellerContext
    ? `${resellerContext.storeName} via ${brandName}`
    : brandName;

  const storeDisplayName = resellerContext ? resellerContext.storeName : brandName;
  const subHeading = resellerContext ? `Powered by ${brandName}` : 'Your Trusted Online Platform';

  const mailOptions = {
    from: `"${senderName}" <${senderAddress}>`,
    to: email,
    subject: `Password Reset Request - ${storeDisplayName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          ${resellerContext?.logoUrl ? `
            <img src="${escapeHtml(resellerContext.logoUrl)}" alt="${escapeHtml(storeDisplayName)}" style="max-height: 50px; margin-bottom: 8px; object-fit: contain;" />
          ` : ''}
          <h2 style="color: #0d9488; margin: 0; font-size: 22px;">${escapeHtml(storeDisplayName)}</h2>
          ${resellerContext ? `<p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">(Powered by ${escapeHtml(brandName)})</p>` : ''}
        </div>
        <p style="color: #334155; font-size: 15px; margin-top: 0;">Hello,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password for your account on <strong>${escapeHtml(storeDisplayName)}</strong>${resellerContext ? ` (operated on ${escapeHtml(brandName)} network)` : ''}. Click the button below to set a new password. This link will expire in 1 hour.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #0d9488; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 14px;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">If you didn't request this password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">${escapeHtml(storeDisplayName)} - ${escapeHtml(subHeading)}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export interface ResellerWelcomeEmailParams {
  email: string;
  name: string;
  storeName: string;
  subdomain: string;
  customDomain?: string;
  password?: string;
  phone?: string;
  hubName?: string;
  contactPerson?: string;
  division?: string;
  district?: string;
  thana?: string;
  address?: string;
  joiningDate?: string;
}

export const sendResellerWelcomeEmail = async ({
  email,
  name,
  storeName,
  subdomain,
  customDomain,
  password,
  phone,
  hubName,
  contactPerson,
  division,
  district,
  thana,
  address,
  joiningDate,
}: ResellerWelcomeEmailParams) => {
  try {
    const hasAuth = (process.env.SMTP_USER && process.env.SMTP_PASS) || (process.env.EMAIL_USER && process.env.EMAIL_PASS);
    if (!hasAuth) {
      console.warn('[Mail] Neither custom SMTP nor Gmail credentials configured. Skipping reseller welcome email.');
      return;
    }

    const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
    const baseUrl = process.env.NEXTAUTH_URL || `https://${rootDomain}`;
    const storefrontUrl = customDomain ? `https://${customDomain}` : `https://${subdomain}.${rootDomain}`;
    const loginUrl = `${baseUrl}/login`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || `support@${rootDomain}`;

    const safeName = escapeHtml(name);
    const safeStoreName = escapeHtml(storeName);
    const safeSubdomain = escapeHtml(subdomain);
    const safeEmail = escapeHtml(email);
    const safePassword = password ? escapeHtml(password) : '';
    const safePhone = phone ? escapeHtml(phone) : '';
    const safeHubName = hubName ? escapeHtml(hubName) : '';
    const safeContactPerson = contactPerson ? escapeHtml(contactPerson) : safeName;
    const safeAddress = address ? escapeHtml(address) : '';
    const regionParts = [thana, district, division].filter(Boolean).map(escapeHtml).join(', ');
    const safeJoiningDate = joiningDate ? escapeHtml(joiningDate) : '';

    const mailOptions = {
      from: getSenderEmail(),
      to: email,
      subject: `Welcome to ${brandName} - Reseller Store Registration (${storeName})`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          
          <!-- Brand Header -->
          <div style="text-align: center; padding-bottom: 18px; border-bottom: 2px solid #0d9488;">
            <h1 style="color: #0d9488; margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">${escapeHtml(brandName).toUpperCase()}</h1>
            <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 500;">Smart Dropshipping &amp; E-Commerce Platform</p>
          </div>

          <!-- Greeting -->
          <div style="padding: 18px 0 12px 0;">
            <p style="font-size: 16px; margin: 0 0 8px 0;">Dear <strong>${safeName}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0;">
              Congratulations and welcome to <strong>${escapeHtml(brandName)}</strong>! Your reseller store application has been successfully submitted. Below are your official account details, storefront information, and credentials:
            </p>
          </div>

          <!-- 1. Account & Login Credentials Box -->
          <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin: 14px 0;">
            <div style="font-size: 14px; font-weight: 700; color: #0f766e; margin-bottom: 10px; border-bottom: 1px solid #ccfbf1; padding-bottom: 6px;">
              🔐 Account &amp; Login Credentials
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #475569; width: 42%;">Login Email:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #0d9488; font-family: monospace; font-size: 14px;">${safeEmail}</td>
              </tr>
              ${safePassword ? `
              <tr>
                <td style="padding: 6px 0; color: #475569;">Login Password:</td>
                <td style="padding: 6px 0;">
                  <span style="font-weight: 700; color: #0f172a; font-family: monospace; font-size: 14px; background-color: #ffffff; padding: 3px 8px; border-radius: 4px; border: 1px solid #cbd5e1; display: inline-block;">${safePassword}</span>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #475569;">Login Portal:</td>
                <td style="padding: 6px 0;">
                  <a href="${loginUrl}" style="color: #0d9488; font-weight: 700; text-decoration: none;">${loginUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #475569;">Application Status:</td>
                <td style="padding: 6px 0;">
                  <span style="background-color: #fef3c7; color: #92400e; font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 12px; display: inline-block;">
                    ⏳ Under Review / Pending Approval
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- 2. Store & Subdomain Information Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 14px 0;">
            <div style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              🏪 Reseller Store Information
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 42%;">Store Name:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1e293b;">${safeStoreName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Storefront URL:</td>
                <td style="padding: 6px 0;">
                  <a href="${storefrontUrl}" style="color: #0d9488; font-weight: 700; font-family: monospace; text-decoration: none;">${storefrontUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Assigned Subdomain:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #475569; font-family: monospace;">${safeSubdomain}</td>
              </tr>
              ${safePhone ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Contact Mobile:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${safePhone}</td>
              </tr>
              ` : ''}
              ${safeJoiningDate ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Application Date:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${safeJoiningDate}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- 3. Pickup / Delivery Hub Information Box -->
          ${(safeHubName || safeAddress || regionParts) ? `
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 14px 0;">
            <div style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              🚚 Courier Pickup &amp; Hub Details
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              ${safeHubName ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 42%;">Hub Name:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${safeHubName}</td>
              </tr>
              ` : ''}
              ${safeContactPerson ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Contact Person:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${safeContactPerson}</td>
              </tr>
              ` : ''}
              ${regionParts ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Region / District:</td>
                <td style="padding: 6px 0; font-weight: 500; color: #1e293b;">${regionParts}</td>
              </tr>
              ` : ''}
              ${safeAddress ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Hub Address:</td>
                <td style="padding: 6px 0; font-weight: 500; color: #1e293b;">${safeAddress}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}

          <!-- 4. Next Steps & Guidance Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 14px 0;">
            <div style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              🚀 What's Next?
            </div>
            <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
              <li style="margin-bottom: 6px;">Our verification team will review your application within <strong>24 hours</strong>.</li>
              <li style="margin-bottom: 6px;">Once approved, your storefront link (<a href="${storefrontUrl}" style="color: #0d9488; text-decoration: none; font-weight: 600;">${storefrontUrl}</a>) will be live to customers immediately.</li>
              <li style="margin-bottom: 6px;">You can log in to your <strong>Reseller Dashboard</strong> to add products, adjust profit margins, and manage orders.</li>
            </ol>
          </div>

          <!-- Security Notice -->
          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
            <p style="font-size: 13px; color: #92400e; margin: 0; line-height: 1.5;">
              ⚠️ <strong>Security Notice:</strong> Please store your login email and password in a secure place. Never disclose your login credentials to anyone.
            </p>
          </div>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 14px 0;" />
          <div style="text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 3px 0; font-weight: 600; color: #64748b;">${escapeHtml(brandName)} | Dhaka, Bangladesh</p>
            <p style="margin: 0 0 3px 0;">Support: ${escapeHtml(supportEmail)}</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${escapeHtml(brandName)}. All rights reserved.</p>
          </div>

        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Mail] Error sending reseller welcome email:', error);
  }
};

export interface ResellerApprovalEmailParams {
  email: string;
  name: string;
  storeName: string;
  subdomain: string;
  customDomain?: string;
}

export const sendResellerApprovalEmail = async ({
  email,
  name,
  storeName,
  subdomain,
  customDomain,
}: ResellerApprovalEmailParams) => {
  try {
    const hasAuth = (process.env.SMTP_USER && process.env.SMTP_PASS) || (process.env.EMAIL_USER && process.env.EMAIL_PASS);
    if (!hasAuth) {
      console.warn('[Mail] Neither custom SMTP nor Gmail credentials configured. Skipping reseller approval email.');
      return;
    }

    const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
    const baseUrl = process.env.NEXTAUTH_URL || `https://${rootDomain}`;
    const storefrontUrl = customDomain ? `https://${customDomain}` : `https://${subdomain}.${rootDomain}`;
    const dashboardUrl = `${baseUrl}/reseller/dashboard`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || `support@${rootDomain}`;

    const safeName = escapeHtml(name);
    const safeStoreName = escapeHtml(storeName);

    const mailOptions = {
      from: getSenderEmail(),
      to: email,
      subject: `🎉 Congratulations! Your Reseller Store is Approved - ${storeName}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          
          <!-- Brand Header -->
          <div style="text-align: center; padding-bottom: 18px; border-bottom: 2px solid #0d9488;">
            <h1 style="color: #0d9488; margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">${escapeHtml(brandName).toUpperCase()}</h1>
            <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 500;">Smart Dropshipping &amp; E-Commerce Platform</p>
          </div>

          <!-- Greeting -->
          <div style="padding: 18px 0 12px 0;">
            <p style="font-size: 16px; margin: 0 0 8px 0;">Dear <strong>${safeName}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0;">
              Great news! Your reseller store <strong>${safeStoreName}</strong> has been <strong>approved</strong> by our team and is now officially active.
            </p>
          </div>

          <!-- Storefront & Action Box -->
          <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 18px; margin: 14px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #0f766e; font-weight: 600;">Your Storefront URL is Live:</p>
            <p style="margin: 0 0 16px 0;">
              <a href="${storefrontUrl}" target="_blank" style="font-size: 16px; font-weight: 700; color: #0d9488; font-family: monospace; text-decoration: underline;">${storefrontUrl}</a>
            </p>
            <a href="${dashboardUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
              Go to Reseller Dashboard
            </a>
          </div>

          <!-- Instructions -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 14px 0;">
            <div style="font-size: 14px; font-weight: 700; color: #334155; margin-bottom: 8px;">
              Ready to start selling?
            </div>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.6;">
              <li>Log in to your dashboard to browse available mother products.</li>
              <li>Sync products to your store catalog with your desired profit margin.</li>
              <li>Share your storefront link on Facebook, WhatsApp, or Instagram to start receiving orders!</li>
            </ul>
          </div>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 14px 0;" />
          <div style="text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 3px 0; font-weight: 600; color: #64748b;">${escapeHtml(brandName)} | Dhaka, Bangladesh</p>
            <p style="margin: 0 0 3px 0;">Support: ${escapeHtml(supportEmail)}</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${escapeHtml(brandName)}. All rights reserved.</p>
          </div>

        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Mail] Error sending reseller approval email:', error);
  }
};

export interface CustomerOrderItem {
  name: string;
  quantity: number;
  price: number;
  image?: string;
  color?: string;
  size?: string;
}

export interface CustomerOrderEmailParams {
  email: string;
  customerName: string;
  orderId?: string;
  shortId: string;
  items: CustomerOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  couponDiscount?: number;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    division?: string;
    thana?: string;
  };
  storeName?: string;
  storeUrl?: string;
}

export const sendCustomerOrderPlacedEmail = async ({
  email,
  customerName,
  shortId,
  items,
  subtotal,
  deliveryCharge,
  couponDiscount = 0,
  totalAmount,
  paymentMethod,
  shippingAddress,
  storeName,
  storeUrl,
}: CustomerOrderEmailParams) => {
  try {
    const hasAuth = (process.env.SMTP_USER && process.env.SMTP_PASS) || (process.env.EMAIL_USER && process.env.EMAIL_PASS);
    if (!hasAuth || !email) return;

    const brandName = storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
    const baseUrl = storeUrl || process.env.NEXTAUTH_URL || `https://${rootDomain}`;
    const trackingUrl = `${baseUrl}/track-order?id=${encodeURIComponent(shortId)}`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || `support@${rootDomain}`;

    const safeCustomerName = escapeHtml(customerName);
    const safeBrandName = escapeHtml(brandName);
    const safeShortId = escapeHtml(shortId);
    const safeAddress = escapeHtml([shippingAddress.street, shippingAddress.thana, shippingAddress.city, shippingAddress.division].filter(Boolean).join(', '));
    const safePhone = escapeHtml(shippingAddress.phone);
    const safePaymentMethod = escapeHtml(paymentMethod);

    const itemsHtml = items.map((item) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; vertical-align: middle;">
          ${item.image ? `<img src="${item.image}" alt="" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; display: inline-block; vertical-align: middle; margin-right: 8px;" />` : ''}
          <span style="font-weight: 600; font-size: 13px; color: #1e293b; display: inline-block; vertical-align: middle;">
            ${escapeHtml(item.name)}
            ${(item.color || item.size) ? `<br/><span style="font-size: 11px; font-weight: normal; color: #64748b;">${[item.color ? `রং: ${escapeHtml(item.color)}` : '', item.size ? `সাইজ: ${escapeHtml(item.size)}` : ''].filter(Boolean).join(' | ')}</span>` : ''}
          </span>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-size: 13px; color: #475569; vertical-align: middle;">${item.quantity}</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: 700; font-size: 13px; color: #0f172a; vertical-align: middle;">৳${(item.price * item.quantity).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: getSenderEmail(),
      to: email,
      subject: `অর্ডার গ্রহণ করা হয়েছে: #${shortId} - ${brandName}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          
          <!-- Brand Header -->
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #0d9488;">
            <h1 style="color: #0d9488; margin: 0 0 4px 0; font-size: 22px; font-weight: 700;">${safeBrandName}</h1>
            <p style="color: #64748b; font-size: 12px; margin: 0;">অর্ডার নিশ্চিতকরণ স্লিপ</p>
          </div>

          <!-- Greeting & Order Status -->
          <div style="padding: 16px 0 12px 0;">
            <p style="font-size: 15px; margin: 0 0 6px 0;">প্রিয় <strong>${safeCustomerName}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.5; margin: 0;">
              ধন্যবাদ! <strong>${safeBrandName}</strong>-এ আপনার অর্ডারটি সফলভাবে গৃহীত হয়েছে। আমাদের টিম খুব শীঘ্রই ফোন কলের মাধ্যমে অর্ডারটি কনফার্ম করবে।
            </p>
          </div>

          <!-- Order Summary Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 12px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;">অর্ডার আইডি:</td>
                <td style="padding: 4px 0; font-weight: 700; color: #0d9488; font-family: monospace; font-size: 14px;">#${safeShortId}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">পেমেন্ট মেথড:</td>
                <td style="padding: 4px 0; font-weight: 600; color: #1e293b;">${safePaymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">বর্তমান স্ট্যাটাস:</td>
                <td style="padding: 4px 0;">
                  <span style="background-color: #fef3c7; color: #92400e; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                    Order Placed (অপেক্ষমান)
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Items Table -->
          <div style="margin: 16px 0;">
            <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              📦 অর্ডারের বিবরণ
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <thead>
                <tr style="background-color: #f1f5f9; font-size: 12px; color: #475569;">
                  <th style="padding: 6px 8px; text-align: left;">প্রোডাক্ট</th>
                  <th style="padding: 6px 8px; text-align: center;">পরিমাণ</th>
                  <th style="padding: 6px 8px; text-align: right;">মোট</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Calculation Box -->
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px;">
              <tr>
                <td style="padding: 4px 8px; text-align: right; color: #64748b;">সাবটোটাল:</td>
                <td style="padding: 4px 8px; text-align: right; font-weight: 600; width: 110px;">৳${subtotal.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 4px 8px; text-align: right; color: #64748b;">ডেলিভারি চার্জ:</td>
                <td style="padding: 4px 8px; text-align: right; font-weight: 600;">৳${deliveryCharge.toLocaleString('en-IN')}</td>
              </tr>
              ${couponDiscount > 0 ? `
              <tr>
                <td style="padding: 4px 8px; text-align: right; color: #16a34a;">ডিসকাউন্ট:</td>
                <td style="padding: 4px 8px; text-align: right; font-weight: 600; color: #16a34a;">-৳${couponDiscount.toLocaleString('en-IN')}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 2px solid #e2e8f0;">
                <td style="padding: 8px 8px; text-align: right; font-weight: 700; font-size: 14px; color: #0f172a;">সর্বমোট দেয়:</td>
                <td style="padding: 8px 8px; text-align: right; font-weight: 700; font-size: 15px; color: #0d9488;">৳${totalAmount.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <!-- Delivery Address Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 12px 0; font-size: 13px;">
            <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">📍 ডেলিভারি ঠিকানা</div>
            <p style="margin: 0; color: #475569; line-height: 1.5;">
              ${safeCustomerName}<br/>
              ফোন: ${safePhone}<br/>
              ঠিকানা: ${safeAddress}
            </p>
          </div>

          <!-- Tracking Button -->
          <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="${trackingUrl}" style="background-color: #0d9488; color: white; padding: 11px 22px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 13px;">
              অর্ডার লাইভ ট্র্যাক করুন ➔
            </a>
          </div>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 12px 0;" />
          <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #64748b;">${safeBrandName} | Bangladesh</p>
            <p style="margin: 0 0 2px 0;">যেকোনো প্রয়োজনে যোগাযোগ: ${escapeHtml(supportEmail)}</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${safeBrandName}. All rights reserved.</p>
          </div>

        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Mail] Error sending order placed email:', error);
  }
};

export interface OrderStatusEmailParams {
  email: string;
  customerName: string;
  shortId: string;
  totalAmount: number;
  storeName?: string;
  storeUrl?: string;
  trackingCode?: string;
  courierName?: string;
}

export const sendCustomerOrderConfirmedEmail = async ({
  email,
  customerName,
  shortId,
  totalAmount,
  storeName,
  storeUrl,
  trackingCode,
  courierName,
}: OrderStatusEmailParams) => {
  try {
    const hasAuth = (process.env.SMTP_USER && process.env.SMTP_PASS) || (process.env.EMAIL_USER && process.env.EMAIL_PASS);
    if (!hasAuth || !email) return;

    const brandName = storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
    const baseUrl = storeUrl || process.env.NEXTAUTH_URL || `https://${rootDomain}`;
    const trackingUrl = `${baseUrl}/track-order?id=${encodeURIComponent(shortId)}`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || `support@${rootDomain}`;

    const safeCustomerName = escapeHtml(customerName);
    const safeBrandName = escapeHtml(brandName);
    const safeShortId = escapeHtml(shortId);

    const mailOptions = {
      from: getSenderEmail(),
      to: email,
      subject: `🎉 আপনার অর্ডার কনফার্ম হয়েছে: #${shortId} - ${brandName}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          
          <!-- Brand Header -->
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #0d9488;">
            <h1 style="color: #0d9488; margin: 0 0 4px 0; font-size: 22px; font-weight: 700;">${safeBrandName}</h1>
            <p style="color: #64748b; font-size: 12px; margin: 0;">অর্ডার কনফার্মেশন নোটিশ</p>
          </div>

          <!-- Greeting & Status -->
          <div style="padding: 16px 0 12px 0;">
            <p style="font-size: 15px; margin: 0 0 6px 0;">প্রিয় <strong>${safeCustomerName}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0;">
              আনন্দের সাথে জানাচ্ছি যে, আপনার অর্ডারটি (<strong>#${safeShortId}</strong>) সফলভাবে <strong>কনফার্ম</strong> করা হয়েছে! বর্তমানে আমাদের ওয়্যারহাউসে পার্সেলটি যত্নসহকারে প্যাকিং করা হচ্ছে।
            </p>
          </div>

          <!-- Status Highlight Card -->
          <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin: 14px 0; text-align: center;">
            <div style="font-size: 13px; color: #0f766e; font-weight: 600; margin-bottom: 4px;">অর্ডার স্ট্যাটাস</div>
            <div style="font-size: 18px; font-weight: 700; color: #0d9488; margin-bottom: 8px;">
              📦 Confirmed &amp; Processing
            </div>
            <p style="font-size: 13px; color: #334155; margin: 0;">
              মোট প্রদেয় মূল্য: <strong>৳${totalAmount.toLocaleString('en-IN')}</strong>
            </p>
            ${trackingCode ? `
            <p style="font-size: 12px; color: #475569; margin: 6px 0 0 0;">
              কুরিয়ার ট্র্যাকিং: <strong>${escapeHtml(courierName || 'Courier')}: ${escapeHtml(trackingCode)}</strong>
            </p>
            ` : ''}
          </div>

          <!-- What's next -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 12px 0; font-size: 13px; color: #475569; line-height: 1.6;">
            <strong>পরবর্তী ধাপ:</strong> খুব শীঘ্রই পার্সেলটি কুরিয়ারে হস্তান্তর করা হবে এবং ডেলিভারি ম্যান আপনার সাথে যোগাযোগ করে দ্রুত পার্সেলটি পৌঁছে দেবে।
          </div>

          <!-- Button -->
          <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="${trackingUrl}" style="background-color: #0d9488; color: white; padding: 11px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 13px;">
              লাইভ ট্র্যাকিং দেখুন ➔
            </a>
          </div>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 12px 0;" />
          <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #64748b;">${safeBrandName} | Bangladesh</p>
            <p style="margin: 0 0 2px 0;">সাপোর্ট ইমেইল: ${escapeHtml(supportEmail)}</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${safeBrandName}. All rights reserved.</p>
          </div>

        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Mail] Error sending order confirmed email:', error);
  }
};

export const sendCustomerOrderDeliveredEmail = async ({
  email,
  customerName,
  shortId,
  storeName,
  storeUrl,
}: OrderStatusEmailParams) => {
  try {
    const hasAuth = (process.env.SMTP_USER && process.env.SMTP_PASS) || (process.env.EMAIL_USER && process.env.EMAIL_PASS);
    if (!hasAuth || !email) return;

    const brandName = storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
    const baseUrl = storeUrl || process.env.NEXTAUTH_URL || `https://${rootDomain}`;
    const shopUrl = `${baseUrl}`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || `support@${rootDomain}`;

    const safeCustomerName = escapeHtml(customerName);
    const safeBrandName = escapeHtml(brandName);
    const safeShortId = escapeHtml(shortId);

    const mailOptions = {
      from: getSenderEmail(),
      to: email,
      subject: `🎉 পার্সেল সফলভাবে ডেলিভার হয়েছে! ধন্যবাদ - #${shortId} (${brandName})`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          
          <!-- Brand Header -->
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #0d9488;">
            <h1 style="color: #0d9488; margin: 0 0 4px 0; font-size: 22px; font-weight: 700;">${safeBrandName}</h1>
            <p style="color: #64748b; font-size: 12px; margin: 0;">ডেলিভারি সম্পন্ন নোটিশ</p>
          </div>

          <!-- Greeting & Status -->
          <div style="padding: 16px 0 12px 0; text-align: center;">
            <div style="font-size: 36px; margin-bottom: 8px;">🛍️</div>
            <h2 style="font-size: 18px; color: #0d9488; margin: 0 0 8px 0; font-weight: 700;">
              অর্ডার সফলভাবে ডেলিভার হয়েছে!
            </h2>
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0;">
              প্রিয় <strong>${safeCustomerName}</strong>, আপনার অর্ডারটি (<strong>#${safeShortId}</strong>) সফলভাবে আপনার ঠিকানায় ডেলিভারি সম্পন্ন হয়েছে।
            </p>
          </div>

          <!-- Thank You Card -->
          <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 18px; margin: 16px 0; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #0f766e; font-weight: 600;">
              আমাদের সাথে কেনাকাটা করার জন্য আন্তরিক ধন্যবাদ!
            </p>
            <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0; line-height: 1.5;">
              আপনার অভিজ্ঞতা কেমন ছিল? আমাদের প্রোডাক্ট ও সার্ভিসের মান সম্পর্কে আপনার যেকোনো মতামত আমাদের উৎসাহিত করে।
            </p>
            <a href="${shopUrl}" style="background-color: #0d9488; color: white; padding: 11px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 13px;">
              আরও পণ্য দেখুন ও কেনাকাটা করুন ➔
            </a>
          </div>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 12px 0;" />
          <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #64748b;">${safeBrandName} | Bangladesh</p>
            <p style="margin: 0 0 2px 0;">সাপোর্ট ইমেইল: ${escapeHtml(supportEmail)}</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${safeBrandName}. All rights reserved.</p>
          </div>

        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Mail] Error sending order delivered email:', error);
  }
};

export interface ResellerPayoutEmailParams {
  email: string;
  resellerName: string;
  storeName: string;
  amount: number;
  payoutMethod?: string;
  accountNumber?: string;
  status: 'requested' | 'approved' | 'rejected';
  transactionRef?: string;
  adminAccountDetails?: string;
  balanceAfter?: number;
}

export const sendResellerPayoutStatusEmail = async ({
  email,
  resellerName,
  storeName,
  amount,
  payoutMethod,
  accountNumber,
  status,
  transactionRef,
  adminAccountDetails,
  balanceAfter,
}: ResellerPayoutEmailParams) => {
  try {
    const hasAuth = (process.env.SMTP_USER && process.env.SMTP_PASS) || (process.env.EMAIL_USER && process.env.EMAIL_PASS);
    if (!hasAuth || !email) return;

    const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Swapnobaz';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'swapnobaz.com';
    const baseUrl = process.env.NEXTAUTH_URL || `https://${rootDomain}`;
    const walletUrl = `${baseUrl}/reseller/wallet`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || `support@${rootDomain}`;

    const safeName = escapeHtml(resellerName || storeName || 'Reseller');
    const safeStoreName = escapeHtml(storeName || 'Reseller Store');
    const safeBrandName = escapeHtml(brandName);
    const safeMethod = escapeHtml(payoutMethod || 'MFS / Bank');
    const safeAccount = escapeHtml(accountNumber || 'N/A');
    const safeRef = transactionRef ? escapeHtml(transactionRef) : '';
    const safeAdminAcc = adminAccountDetails ? escapeHtml(adminAccountDetails) : '';
    const formattedAmount = `৳${Math.abs(amount).toLocaleString('en-IN')}`;
    const formattedBalance = balanceAfter !== undefined ? `৳${Number(balanceAfter).toLocaleString('en-IN')}` : undefined;

    let subject = '';
    let headerSubtitle = '';
    let badgeBg = '#fef3c7';
    let badgeColor = '#92400e';
    let badgeText = 'Pending Approval (অপেক্ষমান)';
    let introMessage = '';

    if (status === 'requested') {
      subject = `💸 উইথড্র রিকোয়েস্ট জমা হয়েছে (${formattedAmount}) - ${brandName}`;
      headerSubtitle = 'রিসেলার পেমেন্ট উইথড্র রিকোয়েস্ট';
      badgeBg = '#fef3c7';
      badgeColor = '#92400e';
      badgeText = '⏳ Pending Review (অ্যাডমিন অনুমোদনের অপেক্ষায়)';
      introMessage = `আপনার স্টোর <strong>${safeStoreName}</strong> থেকে <strong>${formattedAmount}</strong> উইথড্র রিকোয়েস্ট সফলভাবে গৃহীত হয়েছে। আমাদের একাউন্টিং টিম যাচাই করে খুব শীঘ্রই আপনার অ্যাকাউন্টে পেমেন্ট পাঠিয়ে দেবে।`;
    } else if (status === 'approved') {
      subject = `✅ আপনার পেমেন্ট উইথড্র সম্পন্ন হয়েছে! (${formattedAmount}) - ${brandName}`;
      headerSubtitle = 'রিসেলার পেমেন্ট ডিসবার্সমেন্ট কনফার্মেশন';
      badgeBg = '#d1fae5';
      badgeColor = '#065f46';
      badgeText = '✅ Approved & Disbursed (পেমেন্ট সম্পন্ন)';
      introMessage = `অভিনন্দন! আপনার স্টোর <strong>${safeStoreName}</strong>-এর <strong>${formattedAmount}</strong> উইথড্র রিকোয়েস্টটি অ্যাপ্রুভ করা হয়েছে এবং আপনার প্রদত্ত অ্যাকাউন্টে পেমেন্ট পাঠিয়ে দেওয়া হয়েছে।`;
    } else {
      subject = `❌ উইথড্র রিকোয়েস্ট বাতিল ও ওয়ালেটে রিফান্ড করা হয়েছে (${formattedAmount}) - ${brandName}`;
      headerSubtitle = 'রিসেলার পেমেন্ট উইথড্র আপডেট';
      badgeBg = '#ffe4e6';
      badgeColor = '#9f1239';
      badgeText = '❌ Rejected & Refunded (বাতিল ও ওয়ালেটে ফেরত)';
      introMessage = `আপনার স্টোর <strong>${safeStoreName}</strong>-এর <strong>${formattedAmount}</strong> উইথড্র রিকোয়েস্টটি বাতিল করা হয়েছে এবং সম্পূর্ণ টাকা আপনার রিসেলার ওয়ালেট ব্যালেন্সে রিফান্ড (ফেরত) দেওয়া হয়েছে।`;
    }

    const mailOptions = {
      from: getSenderEmail(),
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          
          <!-- Brand Header -->
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #0d9488;">
            <h1 style="color: #0d9488; margin: 0 0 4px 0; font-size: 22px; font-weight: 700;">${safeBrandName}</h1>
            <p style="color: #64748b; font-size: 12px; margin: 0;">${headerSubtitle}</p>
          </div>

          <!-- Greeting -->
          <div style="padding: 16px 0 12px 0;">
            <p style="font-size: 15px; margin: 0 0 8px 0;">প্রিয় <strong>${safeName}</strong>,</p>
            <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0;">
              ${introMessage}
            </p>
          </div>

          <!-- Payout Summary Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 14px 0;">
            <div style="font-size: 14px; font-weight: 700; color: #0f766e; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              💳 উইথড্র ও ট্রানজেকশন বিবরণী
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 45%;">স্টোরের নাম:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1e293b;">${safeStoreName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">উইথড্র অ্যামাউন্ট:</td>
                <td style="padding: 6px 0; font-weight: 800; color: #0d9488; font-size: 15px;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">পেমেন্ট মেথড:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${safeMethod}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">রিসিভিং অ্যাকাউন্ট নম্বর:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1e293b; font-family: monospace;">${safeAccount}</td>
              </tr>
              ${safeRef ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">ট্রানজেকশন আইডি (TrxID / Ref):</td>
                <td style="padding: 6px 0;"><span style="background-color: #f0fdfa; border: 1px solid #99f6e4; color: #0f766e; font-family: monospace; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${safeRef}</span></td>
              </tr>
              ` : ''}
              ${safeAdminAcc ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">ডিসবার্সড অ্যাকাউন্ট:</td>
                <td style="padding: 6px 0; font-weight: 600; color: #475569;">${safeAdminAcc}</td>
              </tr>
              ` : ''}
              ${formattedBalance ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">বর্তমান ওয়ালেট ব্যালেন্স:</td>
                <td style="padding: 6px 0; font-weight: 700; color: #1e293b;">${formattedBalance}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b;">বর্তমান স্ট্যাটাস:</td>
                <td style="padding: 6px 0;">
                  <span style="background-color: ${badgeBg}; color: ${badgeColor}; font-weight: 700; padding: 3px 10px; border-radius: 4px; font-size: 11px; display: inline-block;">
                    ${badgeText}
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 22px 0 16px 0;">
            <a href="${walletUrl}" style="background-color: #0d9488; color: white; padding: 11px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 13px;">
              রিসেলার ওয়ালেট ও লেজার দেখুন ➔
            </a>
          </div>

          <!-- Footer -->
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0 12px 0;" />
          <div style="text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            <p style="margin: 0 0 2px 0; font-weight: 600; color: #64748b;">${safeBrandName} | Bangladesh</p>
            <p style="margin: 0 0 2px 0;">সাপোর্ট: ${escapeHtml(supportEmail)}</p>
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} ${safeBrandName}. All rights reserved.</p>
          </div>

        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('[Mail] Error sending reseller payout status email:', error);
  }
};
