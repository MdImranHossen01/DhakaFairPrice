const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Connect to MongoDB
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
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Schemas
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
});
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  purchasePrice: { type: Number },
  discountRate: { type: Number },
  sku: { type: String, required: true, unique: true },
  stock: { type: Number, required: true, default: 0 },
  categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  tags: [{ type: String }],
  images: [{ type: String }],
  attributes: [
    {
      key: { type: String },
      value: { type: String },
    },
  ],
  variants: [
    {
      color: { type: String },
      size: { type: String },
      price: { type: Number, required: true },
      salePrice: { type: Number },
      purchasePrice: { type: Number },
      discountRate: { type: Number },
      stock: { type: Number, required: true, default: 0 },
      sku: { type: String },
      image: { type: String },
      images: [{ type: String }],
    },
  ],
  isFeatured: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isFlashSale: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  ratings: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
}, { timestamps: true });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Title case helper
function toTitleCase(str) {
  return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Determine category
function determineCategory(filename) {
  const lower = filename.toLowerCase();
  
  if (lower.includes('wedding') || lower.includes('bridal')) return 'wedding';
  if (lower.includes('kids')) return 'kids';
  if (lower.includes('necklace') || lower.includes('pendant') || lower.includes('choker') || lower.includes('ring') || lower.includes('jewellery')) return 'jewellery';
  if (lower.includes('cushion') || lower.includes('bedcover') || lower.includes('decor') || lower.includes('living')) return 'home-decor';
  if (lower.includes('soap') || lower.includes('wash') || lower.includes('lotion') || lower.includes('skin') || lower.includes('hair')) return 'skin-hair';
  if (lower.includes('gift') || lower.includes('craft') || lower.includes('souvenir')) return 'gifts-crafts';
  if (lower.includes('panjabi') || lower.includes('shirt') || lower.includes('men') || lower.includes('groom')) return 'men';
  
  // Default to women for sarees, kurtas, bags, etc if not matched above
  return 'women';
}

async function run() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB');

    const dbCategories = await Category.find({});
    const categoryMap = {};
    dbCategories.forEach(c => {
      categoryMap[c.slug] = c._id;
    });

    const imageDir = path.join(__dirname, '../public/assets/images/products/arong');
    const files = fs.readdirSync(imageDir).filter(f => f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.png'));

    await Product.deleteMany({});
    console.log('Deleted existing products');

    let products = [];
    
    files.forEach((file, index) => {
      const slug = file.replace(/\.(webp|jpg|png)$/, '');
      const name = toTitleCase(slug);
      const catSlug = determineCategory(file);
      const categoryId = categoryMap[catSlug];
      
      if (!categoryId) {
        console.log(`Missing category for slug: ${catSlug}`);
        return;
      }

      const price = 2500 + Math.floor(Math.random() * 5000); // 2500 to 7500
      const purchasePrice = Math.round(price * 0.5);
      
      products.push({
        name,
        slug,
        description: `This premium quality ${name} is crafted with extreme care to bring you the best experience. It features an exquisite design and superior materials, perfect for elevating your style.`,
        price,
        purchasePrice,
        sku: `ARONG-${index + 1000}`,
        stock: 50,
        categories: [categoryId],
        images: [`/assets/images/products/arong/${file}`],
        isPublished: true,
        ratings: 4 + Math.random(),
        numReviews: Math.floor(Math.random() * 50) + 5,
        attributes: [{ key: 'Material', value: 'Premium Quality' }]
      });
    });

    // Shuffle products array to randomly pick
    products = products.sort(() => 0.5 - Math.random());

    // Assign tags
    // 10 Flash Sale, 10 Featured, 10 New Arrival, 10 Discounted
    // A product can only be in ONE of these special categories to make it distinct.
    for (let i = 0; i < products.length; i++) {
      if (i < 10) {
        products[i].isFlashSale = true;
        products[i].discountRate = 30; // 30% discount
        products[i].salePrice = Math.round(products[i].price * 0.7);
      } else if (i >= 10 && i < 20) {
        products[i].isFeatured = true;
      } else if (i >= 20 && i < 30) {
        products[i].isNewArrival = true;
      } else if (i >= 30 && i < 40) {
        // Just discounted
        products[i].discountRate = 15; // 15% discount
        products[i].salePrice = Math.round(products[i].price * 0.85);
      }
    }

    const inserted = await Product.insertMany(products);
    console.log(`Seeded ${inserted.length} products successfully!`);

  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
