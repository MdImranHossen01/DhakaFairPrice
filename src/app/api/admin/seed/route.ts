import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Reseller from '@/models/Reseller';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const defaultPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const usersToSeed = [
      // 1. Super Admin Role (Mandatory Rule: imranshuvo101@gmail.com must be super_admin)
      { name: 'Imran Hossen (Super Admin 1)', email: 'imranshuvo101@gmail.com', role: 'super_admin' as const, phone: '01700000001' },
      { name: 'Super Admin Two', email: 'superadmin2@swapnobaz.com', role: 'super_admin' as const, phone: '01700000002' },

      // 2. Admin Role
      { name: 'Admin One', email: 'admin1@swapnobaz.com', role: 'admin' as const, phone: '01700000003' },
      { name: 'Admin Two', email: 'admin2@swapnobaz.com', role: 'admin' as const, phone: '01700000004' },

      // 3. Manager Role
      { name: 'Manager One', email: 'manager1@swapnobaz.com', role: 'manager' as const, phone: '01700000005' },
      { name: 'Manager Two', email: 'manager2@swapnobaz.com', role: 'manager' as const, phone: '01700000006' },

      // 4. Moderator Role
      { name: 'Moderator One', email: 'moderator1@swapnobaz.com', role: 'moderator' as const, phone: '01700000007' },
      { name: 'Moderator Two', email: 'moderator2@swapnobaz.com', role: 'moderator' as const, phone: '01700000008' },

      // 5. Reseller Role
      { name: 'Reseller One', email: 'reseller1@swapnobaz.com', role: 'reseller' as const, phone: '01700000011', subdomain: 'reseller1store', storeName: 'Reseller One Store' },
      { name: 'Reseller Two', email: 'reseller2@swapnobaz.com', role: 'reseller' as const, phone: '01700000012', subdomain: 'reseller2store', storeName: 'Reseller Two Store' },

      // 7. General Customer User Role
      { name: 'Customer One', email: 'user1@swapnobaz.com', role: 'user' as const, phone: '01700000013' },
      { name: 'Customer Two', email: 'user2@swapnobaz.com', role: 'user' as const, phone: '01700000014' },
    ];

    const results = [];

    for (const u of usersToSeed) {
      let existingUser = await User.findOne({ email: u.email });
      if (existingUser) {
        existingUser.role = u.role;
        existingUser.name = u.name;
        existingUser.phone = u.phone;
        existingUser.password = hashedPassword;
        await existingUser.save();
        results.push({ action: 'updated', email: u.email, role: u.role });
      } else {
        existingUser = await User.create({
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          phone: u.phone,
          isSubscriptionActive: true,
          walletBalance: 1000
        });
        results.push({ action: 'created', email: u.email, role: u.role });
      }

      if (u.role === 'reseller' && u.subdomain) {
        let existingReseller = await Reseller.findOne({ userId: existingUser._id });
        if (!existingReseller) {
          await Reseller.create({
            userId: existingUser._id,
            storeName: u.storeName,
            subdomain: u.subdomain,
            status: 'active',
            contact: { email: u.email, phone: u.phone }
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded 2 users for every role!',
      defaultPassword,
      users: results
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
