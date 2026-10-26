import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';
import { createImpersonationToken } from '@/lib/impersonationHelper';

export async function POST() {
  try {
    const session = await auth();
    const cookieStore = await cookies();
    const impersonatorCookie = cookieStore.get('abs_impersonator')?.value;

    let adminId: string | null = null;

    if (impersonatorCookie) {
      const decryptedCookie = decrypt(impersonatorCookie);
      if (decryptedCookie) {
        try {
          const parsed = JSON.parse(decryptedCookie);
          adminId = parsed.adminId;
        } catch {
          // malformed cookie
        }
      }
    }

    // Fallback: check session token if cookie was cleared
    if (!adminId && (session?.user as any)?.impersonatorAdminId) {
      adminId = (session?.user as any)?.impersonatorAdminId;
    }

    if (!adminId) {
      return NextResponse.json({ error: 'No active impersonation session found.' }, { status: 400 });
    }

    await connectToDatabase();
    const adminUser = await User.findById(adminId).select('role name email image');

    if (!adminUser) {
      return NextResponse.json({ error: 'Original admin account not found.' }, { status: 404 });
    }

    const isAuthorizedAdmin =
      adminUser.role === 'super_admin' ||
      adminUser.role === 'admin' ||
      adminUser.email === 'imranshuvo101@gmail.com';

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { error: 'Access denied: Original account is no longer an authorized admin.' },
        { status: 403 }
      );
    }

    // 1. Generate exit token for sign-in (valid for 60 seconds)
    const exitToken = createImpersonationToken(adminUser._id.toString(), adminUser._id.toString(), true);

    // 2. Clear impersonator cookie
    cookieStore.delete('abs_impersonator');

    return NextResponse.json({
      success: true,
      exitToken,
      adminUser: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/admin/impersonate/exit:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while exiting impersonation.' },
      { status: 500 }
    );
  }
}
