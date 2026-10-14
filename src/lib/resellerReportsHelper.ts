import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Reseller from '@/models/Reseller';

export async function getAuthorizedReseller() {
  const session = await auth();
  if (!session?.user?.id || (session.user as any).role !== 'reseller') {
    return { error: 'Unauthorized', status: 401, reseller: null };
  }

  await connectToDatabase();
  const reseller = await Reseller.findOne({ userId: session.user.id });
  if (!reseller) {
    return { error: 'Reseller profile not found', status: 404, reseller: null };
  }

  return { error: null, status: 200, reseller };
}
