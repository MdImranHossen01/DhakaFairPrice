import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { encrypt, decrypt } from '@/lib/encryption';

interface ImpersonationPayload {
  adminId?: string;
  targetUserId: string;
  isExit?: boolean;
  exp: number;
}

/**
 * Creates an encrypted, short-lived token for NextAuth Credentials sign-in.
 * Valid for 60 seconds.
 */
export function createImpersonationToken(adminId: string, targetUserId: string, isExit: boolean = false): string {
  const payload: ImpersonationPayload = {
    adminId,
    targetUserId,
    isExit,
    exp: Date.now() + 60 * 1000, // 60 seconds
  };
  return encrypt(JSON.stringify(payload));
}

/**
 * Verifies and decrypts an impersonation token, then loads the target user.
 */
export async function verifyImpersonationToken(token: string) {
  try {
    const decrypted = decrypt(token);
    if (!decrypted) return null;

    const payload = JSON.parse(decrypted) as ImpersonationPayload;
    if (!payload?.targetUserId || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    await connectToDatabase();
    const targetUser = await User.findById(payload.targetUserId).select('+role +name +email +phone +image');
    if (!targetUser) return null;

    return {
      id: targetUser._id.toString(),
      name: targetUser.name,
      email: targetUser.email,
      image: targetUser.image,
      role: targetUser.role,
      phone: targetUser.phone,
      isImpersonated: !payload.isExit,
      impersonatorAdminId: payload.isExit ? undefined : payload.adminId,
    };
  } catch (error) {
    console.error('verifyImpersonationToken error:', error);
    return null;
  }
}
