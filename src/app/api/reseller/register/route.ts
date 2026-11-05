import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import User from '@/models/User';
import { normalizePhoneNumber } from '@/lib/utils';
import { seedResellerLedgerAccounts, seedDefaultTransactionCategories } from '@/lib/ledgerHelper';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    const {
      storeName,
      subdomain,
      phone,
      address,
      description,
      name,
      email,
      password,
      division,
      district,
      thana,
      hubName,
      contactPerson,
      pickupPhone,
      pickupAddress: customPickupAddress,
    } = body;

    if (!storeName || !subdomain || !phone) {
      return NextResponse.json({ error: 'Store name, subdomain, and phone number are required.' }, { status: 400 });
    }

    const cleanSubdomain = subdomain.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '').trim();
    // Validate subdomain format (3-63 lowercase alphanumeric characters or hyphens)
    if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(cleanSubdomain)) {
      return NextResponse.json({
        error: 'Subdomain must be between 3 to 63 characters containing lowercase letters, numbers, and hyphens (-).'
      }, { status: 400 });
    }

    await dbConnect();

    // Check if subdomain is already taken
    const subdomainTaken = await Reseller.findOne({ subdomain: cleanSubdomain });
    if (subdomainTaken) {
      return NextResponse.json({ error: 'This subdomain is already in use. Please choose another one.' }, { status: 400 });
    }

    let targetUserId: string;
    let targetEmail: string;

    if (session?.user) {
      // 1. Logged in user applying to become a reseller
      targetUserId = (session.user as any).id;
      targetEmail = session.user.email || '';

      // Check if user already has a reseller profile
      const existingReseller = await Reseller.findOne({ userId: targetUserId });
      if (existingReseller) {
        return NextResponse.json({ error: 'You already have a registered reseller account.' }, { status: 400 });
      }

      // Update user role to reseller if normal user
      const currentUserRole = (session.user as any).role;
      if (targetEmail === 'imranshuvo101@gmail.com') {
        await User.findByIdAndUpdate(targetUserId, { role: 'super_admin' });
      } else if (!['admin', 'super_admin', 'manager'].includes(currentUserRole)) {
        await User.findByIdAndUpdate(targetUserId, { role: 'reseller' });
      }
    } else {
      // 2. Guest user registering as a new reseller
      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Full name, email address, and password are required.' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const normalizedPhone = normalizePhoneNumber(phone) || phone;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: normalizedEmail },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
        ]
      });

      if (existingUser) {
        return NextResponse.json({
          error: 'An account with this email or phone already exists. Please sign in to apply.'
        }, { status: 409 });
      }

      // Create new user with reseller role
      const newUser = await User.create({
        name,
        email: normalizedEmail,
        password,
        phone: normalizedPhone,
        addresses: [{
          street: address || '',
          city: district || '',
          state: thana || '',
          country: 'Bangladesh',
          isDefault: true
        }],
        role: normalizedEmail === 'imranshuvo101@gmail.com' ? 'super_admin' : 'reseller',
      });

      targetUserId = newUser._id.toString();
      targetEmail = normalizedEmail;
    }

    const resolvedDivision = division || customPickupAddress?.division || '';
    const resolvedDistrict = district || customPickupAddress?.district || '';
    const resolvedThana = thana || customPickupAddress?.thana || '';
    const resolvedAddress = customPickupAddress?.address || address || '';
    const resolvedHubName = hubName || customPickupAddress?.hubName || `${storeName} Hub`;
    const resolvedContactPerson = contactPerson || customPickupAddress?.contactPerson || name || session?.user?.name || storeName;
    const resolvedPickupPhone = pickupPhone || customPickupAddress?.phone || phone;

    const newReseller = await Reseller.create({
      userId: targetUserId,
      storeName,
      subdomain: cleanSubdomain,
      description: description || '',
      status: 'pending', // Pending approval by default
      contact: {
        phone,
        address: address || '',
        email: targetEmail,
      },
      pickupAddress: {
        hubName: resolvedHubName,
        contactPerson: resolvedContactPerson,
        phone: resolvedPickupPhone,
        division: resolvedDivision,
        district: resolvedDistrict,
        thana: resolvedThana,
        address: resolvedAddress,
      },
    });

    // Seed default ledger accounts (Bank, Cash, AP, AR) and default categories
    try {
      await seedResellerLedgerAccounts(newReseller._id);
      await seedDefaultTransactionCategories(newReseller._id);
    } catch (seedErr) {
      console.error('Failed to pre-seed reseller accounts/categories:', seedErr);
    }

    // Trigger Admin & User Notifications
    try {
      const { createAdminNotification, createNotification } = await import('@/lib/notifications');
      await createAdminNotification({
        title: '👤 New Reseller Application',
        message: `${newReseller.storeName} (${newReseller.subdomain}) applied for reseller approval.`,
        type: 'reseller',
        link: '/admin/resellers',
        sendPush: true,
      });
      await createNotification({
        userId: targetUserId,
        resellerId: newReseller._id,
        title: '👤 Application Submitted',
        message: 'Your reseller application has been submitted successfully and is awaiting review.',
        type: 'reseller',
        link: '/login',
        sendPush: false,
      });

      // Instant Telegram Alert for New Reseller Application
      try {
        const { sendTelegramResellerNotification } = await import('@/lib/telegram');
        sendTelegramResellerNotification({
          storeName: newReseller.storeName,
          subdomain: newReseller.subdomain,
          name: resolvedContactPerson || name || session?.user?.name || storeName,
          phone,
          email: targetEmail,
          hubName: resolvedHubName,
          district: resolvedDistrict,
          division: resolvedDivision,
          address: resolvedAddress,
        }).catch(err => console.error('[Reseller Telegram Alert Error]', err));
      } catch (tgErr) {
        console.error('[Reseller Telegram Alert Import Error]', tgErr);
      }
    } catch (notifErr) {
      console.error('[Reseller Registration Notification Error]', notifErr);
    }

    // Send Welcome / Confirmation Email to Reseller in background (Non-blocking, ABSInternational pattern)
    if (targetEmail) {
      try {
        const joiningDate = new Date().toLocaleString('en-US', {
          timeZone: 'Asia/Dhaka',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ' (BST)';

        import('@/lib/mail')
          .then(({ sendResellerWelcomeEmail }) => {
            sendResellerWelcomeEmail({
              email: targetEmail,
              name: resolvedContactPerson || name || session?.user?.name || storeName,
              storeName: newReseller.storeName,
              subdomain: newReseller.subdomain,
              password: password || undefined,
              phone,
              hubName: resolvedHubName,
              contactPerson: resolvedContactPerson,
              division: resolvedDivision,
              district: resolvedDistrict,
              thana: resolvedThana,
              address: resolvedAddress,
              joiningDate,
            }).catch(err => console.error('[Background Reseller Welcome Email Error]', err));
          })
          .catch(mailImportErr => console.error('[Reseller Mail Import Error]', mailImportErr));
      } catch (mailTriggerErr) {
        console.error('[Reseller Registration Mail Trigger Error]', mailTriggerErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Your store application is under review.',
      reseller: newReseller,
    });
  } catch (error: any) {
    if (error.code === 11000 && (error.keyPattern?.subdomain || error.message?.includes('subdomain'))) {
      return NextResponse.json({ error: 'This subdomain is already taken. Please choose another one.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'An unexpected server error occurred.' }, { status: 500 });
  }
}
