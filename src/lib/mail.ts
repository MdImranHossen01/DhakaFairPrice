import nodemailer from 'nodemailer';

const isCustomSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isCustomSmtp
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

const getSenderEmail = () => {
  const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@dhakafairprice.com';
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

export const sendResetEmail = async (email: string, token: string) => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const encodedToken = encodeURIComponent(token);
  const resetUrl = `${baseUrl}/reset-password?token=${encodedToken}`;
  const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';

  const mailOptions = {
    from: getSenderEmail(),
    to: email,
    subject: `Password Reset Request - ${brandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #0d9488; text-align: center; margin-bottom: 8px;">${escapeHtml(brandName)}</h2>
        <p style="color: #475569; font-size: 15px;">Hello,</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 13px;">If you didn't request this password reset, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">${escapeHtml(brandName)} - Your Trusted Online Platform</p>
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

    const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
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

    const brandName = process.env.NEXT_PUBLIC_STORE_NAME || 'Dhaka Fair Price';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'dhakafairprice.com';
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
