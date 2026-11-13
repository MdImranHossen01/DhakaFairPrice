import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { encrypt } from '@/lib/encryption';
import { createImpersonationToken } from '@/lib/impersonationHelper';

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: Please log in first.' }, { status: 401 });
    }

    const currentRole = (session.user as any)?.role;
    const isSuperAdminEmail = session.user.email === 'imranshuvo101@gmail.com';
    const isSuperAdmin = currentRole === 'super_admin' || isSuperAdminEmail;

    // Strict security rule: Only Super Admin is permitted to impersonate
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can impersonate users or resellers.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
    }

    if (targetUserId === session.user.id) {
      return NextResponse.json({ error: 'Cannot impersonate your own account.' }, { status: 400 });
    }

    await connectToDatabase();
    const targetUser = await User.findById(targetUserId).select('role name email phone image isSubscriptionActive');

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    // Protect super admin accounts from impersonation
    if (targetUser.role === 'super_admin' || targetUser.email === 'imranshuvo101@gmail.com') {
      return NextResponse.json({ error: 'Cannot impersonate a Super Admin account.' }, { status: 403 });
    }

    // 1. Create short-lived token for NextAuth Credentials sign-in (valid for 60 seconds)
    const impersonationToken = createImpersonationToken(session.user.id, targetUser._id.toString(), false);

    // 2. Set secure HTTP-only cookie tracking the original admin session for safe return
    const cookiePayload = {
      adminId: session.user.id,
      targetUserId: targetUser._id.toString(),
      targetName: targetUser.name,
      targetRole: targetUser.role,
      targetPhone: targetUser.phone,
      timestamp: Date.now(),
    };
    const encryptedCookie = encrypt(JSON.stringify(cookiePayload));

    const cookieStore = await cookies();
    cookieStore.set('abs_impersonator', encryptedCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({
      success: true,
      token: impersonationToken,
      impersonationToken,
      redirectUrl: targetUser.role === 'reseller' ? '/reseller-dashboard' : '/dashboard',
      targetUser: {
        id: targetUser._id.toString(),
        name: targetUser.name,
        role: targetUser.role,
        email: targetUser.email,
        phone: targetUser.phone,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/admin/impersonate:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while starting impersonation.' },
      { status: 500 }
    );
  }
}
