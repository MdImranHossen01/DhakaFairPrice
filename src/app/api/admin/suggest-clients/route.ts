/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Bill from '@/models/Bill';
import User from '@/models/User';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'moderator'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // 1. Get unique clients from Bill collection (sorted by newest, includes bills, offers, chalans)
    const billClients = await Bill.aggregate([
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ["$clientPhone", null] }, { $ne: ["$clientPhone", ""] }] },
              "$clientPhone",
              { $toLower: "$clientName" }
            ]
          },
          name: { $first: "$clientName" },
          phone: { $first: "$clientPhone" },
          email: { $first: "$clientEmail" },
          address: { $first: "$clientAddress" }
        }
      }
    ]);

    // 2. Get registered users (role: 'user')
    const users = await User.find({ role: 'user' }).lean();

    // 3. Get recent orders with shipping addresses
    const recentOrders = await Order.find(
      { 'shippingAddress.fullName': { $exists: true, $ne: '' } },
      { shippingAddress: 1, createdAt: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const registryMap = new Map<string, {
      name: string;
      phone: string;
      email: string;
      address: string;
    }>();

    // Add bill clients to registry
    billClients.forEach((bc: any) => {
      const key = (bc.phone || bc.email || bc.name || '').trim().toLowerCase();
      if (!key) return;

      registryMap.set(key, {
        name: bc.name || '',
        phone: bc.phone || '',
        email: bc.email || '',
        address: bc.address || ''
      });
    });

    // Merge recent order clients
    recentOrders.forEach((ord: any) => {
      const sa = ord.shippingAddress;
      if (!sa) return;
      const key = (sa.phone || sa.fullName || '').trim().toLowerCase();
      if (!key) return;

      const fullAddr = [sa.street, sa.city, sa.state, sa.division].filter(Boolean).join(', ');
      const existing = registryMap.get(key);
      if (existing) {
        if (!existing.address && fullAddr) existing.address = fullAddr;
      } else {
        registryMap.set(key, {
          name: sa.fullName || '',
          phone: sa.phone || '',
          email: '',
          address: fullAddr || ''
        });
      }
    });

    // Merge registered users
    users.forEach((u: any) => {
      const key = (u.phone || u.email || u.name || '').trim().toLowerCase();
      if (!key) return;

      const existing = registryMap.get(key);
      const defaultAddr = u.addresses?.find((a: any) => a.isDefault) || u.addresses?.[0];
      const addressString = defaultAddr
        ? [defaultAddr.street, defaultAddr.city, defaultAddr.state, defaultAddr.division].filter(Boolean).join(', ')
        : '';

      if (existing) {
        if (!existing.email && u.email) existing.email = u.email;
        if (!existing.phone && u.phone) existing.phone = u.phone;
        if (!existing.address && addressString) existing.address = addressString;
      } else {
        registryMap.set(key, {
          name: u.name || '',
          phone: u.phone || '',
          email: u.email || '',
          address: addressString || ''
        });
      }
    });

    const suggestions = Array.from(registryMap.values()).filter(
      item => item.name || item.phone || item.email
    );

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error: any) {
    console.error('Error fetching client suggestions:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
