const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

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
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// Schemas & Models
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

ProductSchema.pre('validate', function() {
  if (this.salePrice !== undefined && this.salePrice !== null && this.salePrice > this.price) {
    throw new Error(`Sale price should be lower than or equal to regular price`);
  }
});

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// Helper for cleaning description
function cleanDescription(promptText) {
  let desc = promptText.trim();
  
  // Suffix removal
  desc = desc.replace(/\s*--ar\s+1:1\s*$/, '');
  
  // Prefix removal (case-insensitive)
  const prefixes = [
    /^A professional fashion photograph of\s+/i,
    /^A high-quality studio portrait of\s+/i,
    /^A lifestyle fashion photo of\s+/i,
    /^A close-up fashion shot of\s+/i,
    /^A beautiful outdoor fashion portrait of\s+/i,
    /^A premium studio fashion photo of\s+/i,
    /^A high-fashion studio shot of\s+/i,
    /^A professional portrait of\s+/i,
    /^An elegant lifestyle photograph of\s+/i,
    /^A festive studio photography of\s+/i,
    /^A luxury fashion product shot of\s+/i,
    /^A professional lifestyle photograph of\s+/i,
    /^A high-end studio portrait of\s+/i,
    /^A studio fashion photograph of\s+/i,
    /^A high-quality lifestyle shot of\s+/i,
    /^A contemporary fashion photo of\s+/i,
    /^A lifestyle fashion photo of\s+/i,
    /^A clean close-up shot of\s+/i,
    /^A bright lifestyle photo of\s+/i,
    /^A professional product photograph of\s+/i,
    /^A luxury fashion shot of\s+/i,
    /^A studio photograph of\s+/i,
    /^A professional studio photo of\s+/i,
    /^A colorful fashion portrait of\s+/i,
    /^A studio catalog photograph of\s+/i,
    /^A festive lifestyle photo of\s+/i,
    /^A luxury studio fashion portrait of\s+/i,
    /^A high-end fashion portrait of\s+/i,
    /^A product photograph of\s+/i,
    /^A professional studio fashion shot of\s+/i,
    /^A studio photo of\s+/i,
    /^A professional lifestyle photograph of\s+/i,
    /^A festive studio photography of\s+/i,
    /^A studio photo of\s+/i,
    /^A high-end groom's fashion photo of\s+/i,
    /^A wedding collection fashion portrait of\s+/i,
    /^An elegant wedding fashion photo of\s+/i,
  ];

  for (const regex of prefixes) {
    if (regex.test(desc)) {
      desc = desc.replace(regex, '');
      break;
    }
  }

  // Capitalize first letter
  if (desc.length > 0) {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }
  
  if (!desc.endsWith('.')) {
    desc += '.';
  }
  
  return desc;
}

function getPriceAndAttributes(slug, name) {
  let basePrice = 2000;
  let sizes = [];
  let colors = [];
  let material = '';

  // Extract color from name if possible
  const colorKeywords = ['Red', 'Yellow', 'Blue', 'Charcoal Grey', 'Grey', 'Olive Green', 'Green', 'Pink', 'White', 'Ivory', 'Beige', 'Teal', 'Purple', 'Plum', 'Magenta', 'Peach', 'Mint Green', 'Ochre', 'Orange', 'Rust', 'Crimson', 'Navy', 'Emerald', 'Black', 'Gold', 'Silver', 'Copper', 'Turquoise', 'Maroon', 'Lilac', 'Lemon'];
  for (const cw of colorKeywords) {
    if (name.toLowerCase().includes(cw.toLowerCase())) {
      colors.push(cw);
    }
  }
  if (colors.length === 0) colors.push('Multicolor');

  if (slug.includes('saree')) {
    material = slug.includes('cotton') ? '100% Handloom Cotton' : slug.includes('jamdani') ? 'Half Silk Jamdani' : slug.includes('silk') ? 'Rajshahi Silk' : 'Katan Silk';
    if (slug.includes('wedding')) {
      basePrice = 25000 + Math.floor(Math.random() * 15000); // ৳25,000 - ৳40,000
      material = 'Premium Banarasi/Katan Silk with Zardozi Work';
    } else if (slug.includes('jamdani')) {
      basePrice = 6500 + Math.floor(Math.random() * 6000); // ৳6,500 - ৳12,500
    } else if (slug.includes('silk')) {
      basePrice = 8500 + Math.floor(Math.random() * 7000); // ৳8,500 - ৳15,500
    } else {
      basePrice = 1800 + Math.floor(Math.random() * 1500); // ৳1,800 - ৳3,300
    }
    sizes = ['Free Size'];
  } else if (slug.includes('panjabi')) {
    material = slug.includes('silk') ? 'Rajshahi Silk' : '100% Fine Cotton';
    if (slug.includes('wedding')) {
      basePrice = 7500 + Math.floor(Math.random() * 6000); // ৳7,500 - ৳13,500
      material = 'Premium Tussar/Katan Silk with Heavy Zardozi';
    } else if (slug.includes('silk')) {
      basePrice = 4500 + Math.floor(Math.random() * 3000); // ৳4,500 - ৳7,500
    } else {
      basePrice = 1600 + Math.floor(Math.random() * 1200); // ৳1,600 - ৳2,800
    }
    sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  } else if (slug.includes('shalwar-kameez') || slug.includes('kurta') || slug.includes('taaga')) {
    material = '100% Premium Cotton';
    if (slug.includes('taaga')) {
      basePrice = 1500 + Math.floor(Math.random() * 1500); // ৳1,500 - ৳3,000
    } else if (slug.includes('kurta')) {
      basePrice = 1200 + Math.floor(Math.random() * 1300); // ৳1,200 - ৳2,500
    } else {
      basePrice = 2500 + Math.floor(Math.random() * 3000); // ৳2,500 - ৳5,500
    }
    sizes = ['S', 'M', 'L', 'XL'];
  } else if (slug.includes('shoes') || slug.includes('sandals')) {
    material = 'Genuine Leather';
    basePrice = 1200 + Math.floor(Math.random() * 1500); // ৳1,200 - ৳2,700
    sizes = ['38', '39', '40', '41', '42', '43'];
  } else if (slug.includes('bags')) {
    material = name.toLowerCase().includes('jute') ? 'Jute & Leather' : 'Genuine Pebble Leather';
    basePrice = 1800 + Math.floor(Math.random() * 3000); // ৳1,800 - ৳4,800
    sizes = ['Standard'];
  } else if (slug.includes('pajama')) {
    material = 'Pure Cotton';
    basePrice = 700 + Math.floor(Math.random() * 500); // ৳700 - ৳1,200
    sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  } else if (slug.includes('shirts')) {
    material = name.toLowerCase().includes('linen') ? 'Linen' : '100% Cotton';
    basePrice = 1200 + Math.floor(Math.random() * 1300); // ৳1,200 - ৳2,500
    sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  } else if (slug.includes('kids')) {
    material = '100% Soft Cotton';
    basePrice = 900 + Math.floor(Math.random() * 1200); // ৳900 - ৳2,100
    sizes = ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y'];
  } else if (slug.includes('bedcover')) {
    material = '100% Handloom Cotton';
    basePrice = 2500 + Math.floor(Math.random() * 3000); // ৳2,500 - ৳5,500
    sizes = ['King Size', 'Queen Size'];
  } else if (slug.includes('cushion')) {
    material = '100% Cotton Canvas';
    basePrice = 350 + Math.floor(Math.random() * 450); // ৳350 - ৳800
    sizes = ['16" x 16"', '18" x 18"'];
  } else if (slug.includes('necklaces') || slug.includes('jewellery')) {
    material = name.toLowerCase().includes('pearl') ? 'Freshwater Pearls' : 'Oxidized Silver / Brass';
    if (name.toLowerCase().includes('pearl')) {
      basePrice = 3500 + Math.floor(Math.random() * 8000); // ৳3,500 - ৳11,500
    } else {
      basePrice = 800 + Math.floor(Math.random() * 1500); // ৳800 - ৳2,300
    }
    sizes = ['One Size'];
  }

  const purchasePrice = Math.round(basePrice * 0.45); // 45% purchase price
  return { price: basePrice, purchasePrice, sizes, colors, material };
}

async function run() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing products
    const delResult = await Product.deleteMany({});
    console.log(`Deleted ${delResult.deletedCount} existing products.`);

    // Load categories map
    const dbCategories = await Category.find({});
    console.log(`Fetched ${dbCategories.length} categories from DB.`);
    const categoryMap = {};
    dbCategories.forEach(c => {
      categoryMap[c.slug] = c._id;
    });

    // Parse prompts.md
    let filePath = path.join(__dirname, '../scratch/rumas_product_prompts_utf8.md');
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../scratch/rumas_product_prompts.md');
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, '../prompts.md');
    }
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

    const sections = content.split(/\n## /);
    const parsedProducts = [];

    // Skip first section as it's the file header
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      // Get subcategory slug
      const slugMatch = section.match(/Subcategory Slug:\*\*\s*`([^`]+)`/i);
      if (!slugMatch) {
        console.log(`Warning: Subcategory slug not found in section ${i}`);
        continue;
      }
      const subcategorySlug = slugMatch[1].trim();

      // Get products in this section
      const productBlocks = section.split(/\n### /);
      // Skip the first block as it's the section header
      for (let j = 1; j < productBlocks.length; j++) {
        const block = productBlocks[j];
        const lines = block.split('\n');
        
        // Product name is the first line, strip number
        let name = lines[0].trim().replace(/^\d+\.\s*/, '');
        
        // Find filename
        const filenameMatch = block.match(/Filename:\*\*\s*`([^`]+)`/i);
        // Find prompt
        const promptMatch = block.match(/Prompt:\*\*\s*([^\n]+)/i);

        if (!filenameMatch || !promptMatch) {
          console.log(`Warning: Incomplete product block for "${name}"`);
          continue;
        }

        const filename = filenameMatch[1].trim();
        const prompt = promptMatch[1].trim();
        const description = cleanDescription(prompt);
        const slug = filename.replace(/\.webp$/, '');

        parsedProducts.push({
          name,
          slug,
          description,
          filename,
          categorySlug: subcategorySlug,
        });
      }
    }

    console.log(`Parsed ${parsedProducts.length} products from prompts.md.`);

    // Convert parsed products to database products
    const finalProducts = [];
    
    // We need 10 products in flash sale, 10 in featured, 10 in new arrival
    // Let's create an array of indices to shuffle or distribute them
    // E.g., we can just use simple step indices to spread them nicely across different categories
    // 100 products total. Let's do:
    // Flash sale: indices 5, 15, 25, 35, 45, 55, 65, 75, 85, 95 (10 products)
    // Featured: indices 2, 12, 22, 32, 42, 52, 62, 72, 82, 92 (10 products)
    // New arrival: indices 8, 18, 28, 38, 48, 58, 68, 78, 88, 98 (10 products)
    
    parsedProducts.forEach((p, index) => {
      const categoryId = categoryMap[p.categorySlug];
      if (!categoryId) {
        console.error(`Error: Category slug "${p.categorySlug}" not found in DB!`);
        return;
      }

      const info = getPriceAndAttributes(p.categorySlug, p.name);
      
      let isFlashSale = false;
      let isFeatured = false;
      let isNewArrival = false;
      
      let price = info.price;
      let salePrice = undefined;
      let discountRate = undefined;

      // Assign sections
      if ([5, 15, 25, 35, 45, 55, 65, 75, 85, 95].includes(index)) {
        isFlashSale = true;
        // Make sure flash sale has a good discount
        discountRate = 20 + Math.floor(Math.random() * 4) * 5; // 20%, 25%, 30%, 35%
        salePrice = Math.round((price * (100 - discountRate)) / 100);
      } else if ([2, 12, 22, 32, 42, 52, 62, 72, 82, 92].includes(index)) {
        isFeatured = true;
      } else if ([8, 18, 28, 38, 48, 58, 68, 78, 88, 98].includes(index)) {
        isNewArrival = true;
      }

      // Add normal discount to some other random items (not in sections and not flash sale)
      if (!isFlashSale && Math.random() < 0.25) {
        discountRate = 10 + Math.floor(Math.random() * 3) * 5; // 10%, 15%, 20%
        salePrice = Math.round((price * (100 - discountRate)) / 100);
      }

      const sku = `RW-${p.categorySlug.toUpperCase().replace(/-/g, '').slice(0, 5)}-${String(index + 1).padStart(3, '0')}`;
      const stock = 15 + Math.floor(Math.random() * 35); // 15 to 50 items in stock

      const attributes = [
        { key: 'Material', value: info.material },
        { key: 'Color', value: info.colors.join(', ') },
      ];

      // Build variants
      const variants = [];
      if (info.sizes.length > 0) {
        info.sizes.forEach(sz => {
          info.colors.forEach(col => {
            variants.push({
              color: col,
              size: sz,
              price: price,
              salePrice: salePrice,
              purchasePrice: info.purchasePrice,
              discountRate: discountRate,
              stock: Math.floor(stock / (info.sizes.length * info.colors.length)) || 5,
              sku: `${sku}-${sz}-${col.toUpperCase().slice(0, 3)}`,
            });
          });
        });
      }

      finalProducts.push({
        name: p.name,
        slug: p.slug,
        description: p.description,
        price,
        salePrice,
        purchasePrice: info.purchasePrice,
        discountRate,
        sku,
        stock,
        categories: [categoryId],
        tags: [p.name.toLowerCase(), p.categorySlug.replace(/-/g, ' ')],
        images: [`/assets/images/products/arong/${p.filename}`],
        attributes,
        variants,
        isFeatured,
        isNewArrival,
        isFlashSale,
        isPublished: true,
        ratings: parseFloat((4.0 + (Math.random() * 1.0)).toFixed(1)), // 4.0 to 5.0
        numReviews: Math.floor(Math.random() * 25) + 2, // 2 to 26 reviews
        views: Math.floor(Math.random() * 300) + 50,
        totalSales: Math.floor(Math.random() * 30) + 1,
      });
    });

    const insertResult = await Product.insertMany(finalProducts);
    console.log(`Successfully seeded ${insertResult.length} Aarong products!`);

    // Verify sections count
    const flashCount = insertResult.filter(p => p.isFlashSale).length;
    const featCount = insertResult.filter(p => p.isFeatured).length;
    const newCount = insertResult.filter(p => p.isNewArrival).length;
    console.log(`Flash Sale: ${flashCount}, Featured: ${featCount}, New Arrival: ${newCount}`);

  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

run();
