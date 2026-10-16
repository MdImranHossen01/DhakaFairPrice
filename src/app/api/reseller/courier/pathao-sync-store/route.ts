import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import Reseller from '@/models/Reseller';
import GlobalSettings from '@/models/GlobalSettings';
import { PathaoProvider } from '@/lib/shipping/providers/pathao';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const reseller = await Reseller.findOne({ userId: (session.user as any).id });
    if (!reseller) {
      return NextResponse.json({ message: 'Reseller account not found' }, { status: 404 });
    }

    const pickup = reseller.pickupAddress;
    if (!pickup?.address || !pickup?.phone) {
      return NextResponse.json({ 
        message: 'Please complete your Pickup Point address and phone number before syncing with Pathao.' 
      }, { status: 400 });
    }

    const settings = await GlobalSettings.findOne();
    const pathaoConfig = settings?.courierConfig?.pathao;
    if (!pathaoConfig?.clientId || !pathaoConfig?.clientSecret) {
      return NextResponse.json({ 
        message: 'Pathao courier credentials are not configured in system settings.' 
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
        await Reseller.updateOne(
          { _id: reseller._id },
          { $set: { 'courierConfig.pathao.storeId': String(result.storeId) } }
        );
        return NextResponse.json({
          success: true,
          storeId: result.storeId,
          storeName: result.storeName,
          message: `Pathao store synced successfully! (Store ID: ${result.storeId})`,
        });
      }

      return NextResponse.json({
        success: true,
        message: result.message || 'Store submitted to Pathao, awaiting approval (~1 hour).',
      });
    }

    return NextResponse.json({
      success: false,
      message: result.message || 'Failed to sync store with Pathao',
    }, { status: 400 });

  } catch (error: any) {
    console.error('Pathao store sync error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
