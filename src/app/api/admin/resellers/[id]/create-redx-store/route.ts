import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import Reseller from '@/models/Reseller';
import GlobalSettings from '@/models/GlobalSettings';
import { RedXProvider } from '@/lib/shipping/providers/redx';

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
        error: 'Reseller pickup address and phone number are required. Please ensure the reseller has configured their pickup address.',
      }, { status: 400 });
    }

    const settings = await GlobalSettings.findOne();
    const redxConfig = settings?.courierConfig?.redx;
    if (!redxConfig?.apiKey) {
      return NextResponse.json({
        error: 'RedX courier API key is not configured in Admin Settings > Courier.',
      }, { status: 400 });
    }

    const provider = new RedXProvider({
      apiKey: redxConfig.apiKey,
      isSandbox: redxConfig.isSandbox,
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

    if (result.success && result.storeId) {
      await Reseller.findByIdAndUpdate(reseller._id, {
        $set: { 'courierConfig.redx.pickupStoreId': String(result.storeId) },
      });
      return NextResponse.json({
        success: true,
        storeId: result.storeId,
        storeName: result.storeName,
        message: result.message || `RedX pickup store created & linked successfully! (Store ID: ${result.storeId})`,
      });
    }

    return NextResponse.json({
      error: result.message || 'Failed to create pickup store in RedX',
    }, { status: 400 });
  } catch (error: any) {
    console.error('Error creating RedX pickup store for reseller:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
