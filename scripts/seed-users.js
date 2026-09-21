const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let mongodbUri = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MONGODB_URI=(.*)$/m);
  if (match && match[1]) {
    mongodbUri = match[1].trim().replace(/['"]/g, '');
  }
}

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['super_admin', 'admin', 'manager', 'moderator', 'supplier', 'reseller', 'user'], 
      default: 'user' 
    },
    phone: { type: String },
    isSubscriptionActive: { type: Boolean, default: true },
    walletBalance: { type: Number, default: 1000 },
  },
  { timestamps: true }
);

const ResellerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: { type: String, required: true },
    subdomain: { type: String, required: true },
    status: { type: String, enum: ['pending', 'active', 'suspended', 'expired'], default: 'active' },
    commissionRate: { type: Number, default: 15 },
    walletBalance: { type: Number, default: 5000 },
    pendingBalance: { type: Number, default: 1200 },
    contact: { email: String, phone: String, address: String },
    totalOrders: { type: Number, default: 10 },
    totalRevenue: { type: Number, default: 25000 },
    totalEarnings: { type: Number, default: 3750 }
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Reseller = mongoose.models.Reseller || mongoose.model('Reseller', ResellerSchema);

const usersToSeed = [
  // 1. Super Admin Role (Mandatory Rule: imranshuvo101@gmail.com must be super_admin)
  { name: 'Imran Hossen (Super Admin 1)', email: 'imranshuvo101@gmail.com', role: 'super_admin', phone: '01700000001' },
  { name: 'Super Admin Two', email: 'superadmin2@swapnobaz.com', role: 'super_admin', phone: '01700000002' },

  // 2. Admin Role
  { name: 'Admin One', email: 'admin1@swapnobaz.com', role: 'admin', phone: '01700000003' },
  { name: 'Admin Two', email: 'admin2@swapnobaz.com', role: 'admin', phone: '01700000004' },

  // 3. Manager Role
  { name: 'Manager One', email: 'manager1@swapnobaz.com', role: 'manager', phone: '01700000005' },
  { name: 'Manager Two', email: 'manager2@swapnobaz.com', role: 'manager', phone: '01700000006' },

  // 4. Moderator Role
  { name: 'Moderator One', email: 'moderator1@swapnobaz.com', role: 'moderator', phone: '01700000007' },
  { name: 'Moderator Two', email: 'moderator2@swapnobaz.com', role: 'moderator', phone: '01700000008' },

  // 5. Supplier Role
  { name: 'Supplier One', email: 'supplier1@swapnobaz.com', role: 'supplier', phone: '01700000009' },
  { name: 'Supplier Two', email: 'supplier2@swapnobaz.com', role: 'supplier', phone: '01700000010' },

  // 6. Reseller Role
  { name: 'Reseller One', email: 'reseller1@swapnobaz.com', role: 'reseller', phone: '01700000011', subdomain: 'reseller1store', storeName: 'Reseller One Store' },
  { name: 'Reseller Two', email: 'reseller2@swapnobaz.com', role: 'reseller', phone: '01700000012', subdomain: 'reseller2store', storeName: 'Reseller Two Store' },

  // 7. General Customer User Role
  { name: 'Customer One', email: 'user1@swapnobaz.com', role: 'user', phone: '01700000013' },
  { name: 'Customer Two', email: 'user2@swapnobaz.com', role: 'user', phone: '01700000014' },
];

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected to MongoDB successfully.');

    const defaultPassword = 'Password123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    console.log('\n--- Seeding Users for All Roles ---');
    for (const u of usersToSeed) {
      let existingUser = await User.findOne({ email: u.email });
      if (existingUser) {
        existingUser.role = u.role;
        existingUser.name = u.name;
        existingUser.phone = u.phone;
        existingUser.password = hashedPassword;
        await existingUser.save();
        console.log(`[UPDATED] ${u.role.toUpperCase()}: ${u.email}`);
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
        console.log(`[CREATED] ${u.role.toUpperCase()}: ${u.email}`);
      }

      // If reseller, ensure reseller profile exists
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
          console.log(`  -> Created Reseller Profile: ${u.subdomain}.swapnobaz.com`);
        }
      }
    }

    console.log('\n=== Database Seeding Completed Successfully! ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

seed();
