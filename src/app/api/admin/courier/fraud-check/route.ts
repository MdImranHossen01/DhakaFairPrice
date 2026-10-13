import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import FraudCheck from '@/models/FraudCheck';

function normalizeFraudCheckData(data: any) {
  if (!data || data.status !== 'success' || !data.data) return data;

  const summary = data.data.summary;
  if (summary) {
    const total = Number(summary.total_parcel) || 0;
    const success = Number(summary.success_parcel) || 0;

    // Mathematically accurate success rate: (success / total) * 100
    const realSuccessRatio = total > 0 ? Math.round((success / total) * 1000) / 10 : 0;
    summary.success_ratio = realSuccessRatio;
    summary.calculation_note = `Delivery success rate: ${success} delivered out of ${total} parcels (${realSuccessRatio}%).`;

    // Recalculate risk verdict based on real ratio and fraud reports
    const reportsCount = Array.isArray(data.reports) ? data.reports.length : 0;
    if (reportsCount > 0) {
      data.risk_verdict = {
        level: 'high_risk',
        label: 'High risk',
        action: 'Merchant fraud reports found. Verify before shipping.',
        color: 'red',
        reasons: [`${reportsCount} fraud report(s) found from merchants`, `Delivery success rate: ${realSuccessRatio}%`]
      };
    } else if (total === 0) {
      data.risk_verdict = {
        level: 'new_customer',
        label: 'New customer',
        action: 'No previous courier history',
        color: 'blue',
        reasons: ['No parcel history found']
      };
    } else if (realSuccessRatio >= 70) {
      data.risk_verdict = {
        level: 'low_risk',
        label: 'Low risk',
        action: 'Safe to ship',
        color: 'green',
        reasons: [`Delivery success rate (${realSuccessRatio}%)`]
      };
    } else if (realSuccessRatio >= 50) {
      data.risk_verdict = {
        level: 'medium_risk',
        label: 'Medium risk',
        action: 'Verify phone & address before shipping',
        color: 'yellow',
        reasons: [`Moderate delivery success rate (${realSuccessRatio}%)`]
      };
    } else {
      data.risk_verdict = {
        level: 'high_risk',
        label: 'High risk',
        action: 'Call customer before shipping / Advance delivery charge recommended',
        color: 'red',
        reasons: [`Low delivery success rate (${realSuccessRatio}%)`]
      };
    }
  }

  return data;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !(['admin', 'super_admin', 'reseller', 'manager', 'moderator'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if we have any cached result in the database
    const cachedResult = await FraudCheck.findOne({ phone });

    if (cachedResult) {
      const normalized = normalizeFraudCheckData(cachedResult.data);
      // Self-heal cache if old ratio was inaccurate
      if (cachedResult.data?.data?.summary?.success_ratio !== normalized?.data?.summary?.success_ratio) {
        await FraudCheck.updateOne({ phone }, { $set: { data: normalized } });
      }
      return NextResponse.json(normalized);
    }

    // If no cache exists, call the BD Courier API
    const settingsDoc = await GlobalSettings.findOne().sort({ updatedAt: -1 });
    const settings = settingsDoc ? settingsDoc.toObject({ getters: true }) : null;
    const apiKey = settings?.courierConfig?.bdCourier?.apiKey;

    if (!apiKey) {
      return NextResponse.json({ message: 'BD Courier API key is not configured' }, { status: 400 });
    }

    const res = await fetch('https://api.bdcourier.com/courier-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ phone })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ message: `BD Courier API error: ${errText}` }, { status: res.status });
    }

    const rawData = await res.json();
    const data = normalizeFraudCheckData(rawData);

    // Save the normalized result in database cache
    await FraudCheck.findOneAndUpdate(
      { phone },
      { data },
      { upsert: true, new: true }
    );

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('BD Courier Fraud Check error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
