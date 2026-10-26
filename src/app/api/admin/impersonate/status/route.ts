import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await auth();
    const cookieStore = await cookies();
    const impersonatorCookie = cookieStore.get('abs_impersonator')?.value;

    let cookieData: any = null;
    if (impersonatorCookie) {
      const decrypted = decrypt(impersonatorCookie);
      if (decrypted) {
        try {
          cookieData = JSON.parse(decrypted);
        } catch {
          // ignore
        }
      }
    }

    const isImpersonated = Boolean(
      cookieData || (session?.user as any)?.isImpersonated || (session?.user as any)?.impersonatorAdminId
    );

    return NextResponse.json({
      isImpersonated,
      adminId: cookieData?.adminId || (session?.user as any)?.impersonatorAdminId || null,
      targetUserId: cookieData?.targetUserId || null,
      targetName: cookieData?.targetName || session?.user?.name || null,
      targetPhone: cookieData?.targetPhone || (session?.user as any)?.phone || null,
    });
  } catch {
    return NextResponse.json({ isImpersonated: false });
  }
}
