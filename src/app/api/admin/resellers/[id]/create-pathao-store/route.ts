import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import GlobalSettings from '@/models/GlobalSettings';
import { PathaoProvider } from '@/lib/shipping/providers/pathao';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    await dbConnect();

    const reseller = await Reseller.findById(id);
    if (!reseller) {
      return NextResponse.json({ error: 'Reseller not found' }, { status: 404 });
    }

    const pickup = reseller.pickupAddress;
    if (!pickup?.address || !pickup?.phone) {
      return NextResponse.json({
        error: 'Reseller pickup address and phone number are required. Please ask the reseller to set their pickup address or update it first.',
      }, { status: 400 });
    }

    const settings = await GlobalSettings.findOne();
    const pathaoConfig = settings?.courierConfig?.pathao;
    if (!pathaoConfig?.clientId || !pathaoConfig?.clientSecret) {
      return NextResponse.json({
        error: 'Pathao courier credentials are not configured in Admin Settings > Courier.',
      }, { status: 400 });
    }

    const provider = new PathaoProvider({
      clientId: pathaoConfig.clientId,
      clientSecret: pathaoConfig.clientSecret,
      username: pathaoConfig.username,
      password: pathaoConfig.password,
      isSandbox: pathaoConfig.isSandbox,
    });

    const result = await provider.findOrCreateStoreForReseller({
      hubName: pickup.hubName,
      storeName: reseller.storeName,
      contactPerson: pickup.contactPerson,
      phone: pickup.phone,
      address: pickup.address,
      division: pickup.division,
      district: pickup.district,
      thana: pickup.thana,
    });

    if (result.success) {
      if (result.storeId) {
        await Reseller.findByIdAndUpdate(reseller._id, {
          $set: { 'courierConfig.pathao.storeId': String(result.storeId) },
        });
        return NextResponse.json({
          success: true,
          storeId: result.storeId,
          storeName: result.storeName,
          message: `Pathao store created & linked successfully! (Store ID: ${result.storeId})`,
        });
      }

      return NextResponse.json({
        success: true,
        message: result.message || 'Store created in Pathao, awaiting approval (~1 hour).',
      });
    }

    return NextResponse.json({
      error: result.message || 'Failed to create store in Pathao',
    }, { status: 400 });
  } catch (error: any) {
    console.error('Error creating Pathao store for reseller:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
