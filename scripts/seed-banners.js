const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local file to get MONGODB_URI
const envPath = path.join(__dirname, '../.env.local');
let mongodbUri = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MONGODB_URI=(.*)$/m);
  if (match && match[1]) {
    mongodbUri = match[1].trim().replace(/['"]/g, '');
  }
}

if (!mongodbUri) {
  // Fallback if env file doesn't parse correctly
  mongodbUri = 'mongodb+srv://Climax Apparels:S4Epscw0SOkd5ZtG@cluster0.e5n1hnl.mongodb.net/Climax Apparels';
}

console.log('Connecting to MongoDB...');

const BannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    image: { type: String, required: true },
    link: { type: String },
    primaryBtnText: { type: String },
    primaryBtnLink: { type: String },
    secondaryBtnText: { type: String },
    secondaryBtnLink: { type: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Banner = mongoose.models.Banner || mongoose.model('Banner', BannerSchema);

const banners = [
  {
    title: 'Heritage in Harmony',
    image: '/assets/images/Banner/banner-festive-heritage.webp',
    link: '/shop?filter=featured',
    primaryBtnText: 'Shop Collection',
    primaryBtnLink: '/shop?filter=featured',
    order: 1,
    isActive: true,
  },
  {
    title: 'Summer Reset',
    image: '/assets/images/Banner/banner-summer-handloom.webp',
    link: '/shop?category=women',
    primaryBtnText: 'Explore Women',
    primaryBtnLink: '/shop?category=women',
    order: 2,
    isActive: true,
  },
  {
    title: 'Ground in Grace - The Royal Silk',
    image: '/assets/images/Banner/banner-mens-royal-panjabi.webp',
    link: '/shop?category=men',
    primaryBtnText: 'Shop Men',
    primaryBtnLink: '/shop?category=men',
    order: 3,
    isActive: true,
  },
  {
    title: 'Artisan Living',
    image: '/assets/images/Banner/banner-home-living-decor.webp',
    link: '/shop?category=home-decor',
    primaryBtnText: 'Discover Decor',
    primaryBtnLink: '/shop?category=home-decor',
    order: 4,
    isActive: true,
  },
  {
    title: 'Royal Splendor - The Bridal Edit',
    image: '/assets/images/Banner/banner-wedding-splendor.webp',
    link: '/shop?category=wedding',
    primaryBtnText: 'Explore Bridal',
    primaryBtnLink: '/shop?category=wedding',
    order: 5,
    isActive: true,
  }
];

async function seed() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing banners
    const deleteResult = await Banner.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing banners.`);

    // Insert new banners
    const insertResult = await Banner.insertMany(banners);
    console.log(`Seeded ${insertResult.length} banners successfully:`);
    insertResult.forEach((b, i) => {
      console.log(`[Banner ${i + 1}] Title: "${b.title}", Image: "${b.image}"`);
    });

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
