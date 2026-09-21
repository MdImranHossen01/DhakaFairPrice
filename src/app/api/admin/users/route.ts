import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order'; // Import to ensure model is registered

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    
    if (!session || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search') || '';
    const roleParam = searchParams.get('role');

    await connectToDatabase();

    const matchQuery: any = { role: { $ne: 'super_admin' as const } };
    if (roleParam && roleParam !== 'all' && roleParam !== 'super_admin') {
      matchQuery.role = { $eq: roleParam, $ne: 'super_admin' as const };
    }
    if (search) {
      matchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const totalCount = await User.countDocuments(matchQuery);

    // Aggregate users with their order stats (efficiently skip/limit before lookup)
    const users = await User.aggregate([
      { $match: matchQuery },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'userOrders'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          role: 1,
          image: 1,
          createdAt: 1,
          phone: 1,
          addresses: 1,
          lastActive: 1,
          totalOrders: { $size: '$userOrders' },
          totalSpent: { $sum: '$userOrders.totalAmount' },
          lastOrderDate: { $max: '$userOrders.createdAt' }
        }
      }
    ]);

    return NextResponse.json({
      users,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('Fetch Users Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserRole = (session?.user as any)?.role;
    
    // Both admin and super_admin can manually assign admins by email or phone
    if (!session || (currentUserRole !== 'super_admin' && currentUserRole !== 'admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email, emailOrPhone, name, password, image } = await req.json();
    const identifier = (emailOrPhone || email || '').trim();

    if (!identifier) {
      return NextResponse.json({ message: 'Email or Mobile Number is required' }, { status: 400 });
    }

    await connectToDatabase();

    const isEmail = identifier.includes('@');
    let user;

    if (isEmail) {
      if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[A-Za-z]{2,})+$/.test(identifier)) {
        return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
      }

      const normalizedEmail = identifier.toLowerCase();
      user = await User.findOne({ email: normalizedEmail }).select('+password');

      if (user) {
        user.role = 'admin';
        if (name) user.name = name;
        if (image) user.image = image;
        if (password && password.length >= 6) user.password = password; // pre-save hook hashes password
        await user.save();
      } else {
        user = await User.create({
          name: name || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role: 'admin',
          image: image || undefined,
          ...(password && password.length >= 6 ? { password } : {})
        });
      }
    } else {
      const { normalizePhoneNumber } = await import('@/lib/utils');
      const normalizedPhone = normalizePhoneNumber(identifier);

      if (!normalizedPhone || normalizedPhone.length < 10) {
        return NextResponse.json({ message: 'Invalid mobile number. Please enter a valid 11-digit mobile number.' }, { status: 400 });
      }

      user = await User.findOne({
        $or: [
          { phone: normalizedPhone },
          { email: `${normalizedPhone}@swapnobaz.com` }
        ]
      }).select('+password');

      if (user) {
        user.role = 'admin';
        user.phone = normalizedPhone;
        if (name) user.name = name;
        if (image) user.image = image;
        if (password && password.length >= 6) user.password = password;
        await user.save();
      } else {
        user = await User.create({
          name: name || `Admin ${normalizedPhone.slice(-4)}`,
          email: `${normalizedPhone}@swapnobaz.com`,
          phone: normalizedPhone,
          role: 'admin',
          image: image || undefined,
          ...(password && password.length >= 6 ? { password } : {})
        });
      }
    }

    return NextResponse.json({ 
      message: `Successfully assigned Admin role to ${identifier}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Assign Admin Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}


export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserRole = (session?.user as any)?.role;
    
    if (!session || (currentUserRole !== 'admin' && currentUserRole !== 'super_admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId, role } = await req.json();

    if (!userId || !['user', 'admin', 'manager', 'moderator'].includes(role)) {
      return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    await connectToDatabase();

    // Find the user to update
    const userToUpdate = await User.findOne({ _id: userId });

    if (!userToUpdate) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prevent changing role of super_admin
    if (userToUpdate.role === 'super_admin') {
      return NextResponse.json({ message: 'Cannot change role of super_admin' }, { status: 403 });
    }

    userToUpdate.role = role;
    await userToUpdate.save();

    return NextResponse.json({ message: `User role updated to ${role} successfully` });
  } catch (error) {
    console.error('Update User Role Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserRole = (session?.user as any)?.role;
    
    if (!session || (currentUserRole !== 'admin' && currentUserRole !== 'super_admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    // Find the user to delete
    const userToDelete = await User.findOne({ _id: userId });

    if (!userToDelete) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Prevent deleting super_admin
    if (userToDelete.role === 'super_admin') {
      return NextResponse.json({ message: 'Cannot delete a super_admin' }, { status: 403 });
    }

    // Check if user has orders
    const orderCount = await Order.countDocuments({ user: userId });
    if (orderCount > 0) {
      return NextResponse.json({ 
        message: `Cannot delete user: This user has ${orderCount} existing orders. Delete orders first or suspend the user instead.` 
      }, { status: 400 });
    }

    await User.deleteOne({ _id: userId });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
