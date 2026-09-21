const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');

const mongodbUri = 'mongodb+srv://Swapnobaz:BTtBOFh2xOiOcMs4@cluster0.rt9lqu4.mongodb.net/Swapnobaz?retryWrites=true&w=majority';

console.log('Connecting to MongoDB for Product Seeding...');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    salePrice: { type: Number },
    purchasePrice: { type: Number },
    discountRate: { type: Number, default: 0 },
    sku: { type: String, required: true },
    stock: { type: Number, default: 50 },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    tags: [String],
    images: [String],
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isFlashSale: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    ratings: { type: Number, default: 4.8 },
    numReviews: { type: Number, default: 15 },
    views: { type: Number, default: 100 },
    totalSales: { type: Number, default: 25 },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// 95 Products grouped under 19 categories (5 products per category)
const productsData = [
  // 1. Beauty & Cosmetics (beauty-products)
  {
    name: 'Fragrance Perfume Bottle',
    categorySlug: 'beauty-products',
    image: '/assets/images/products/fragrance-perfume-bottle.webp',
    price: 3500, salePrice: 2800, purchasePrice: 1800,
    sku: 'BEAUTY-001', stock: 40, tags: ['perfume', 'beauty', 'fragrance']
  },
  {
    name: 'Hydrating Moisturizer Cream',
    categorySlug: 'beauty-products',
    image: '/assets/images/products/hydrating-moisturizer.webp',
    price: 1800, salePrice: 1450, purchasePrice: 900,
    sku: 'BEAUTY-002', stock: 65, tags: ['skincare', 'moisturizer', 'beauty']
  },
  {
    name: 'Matte Liquid Lipstick',
    categorySlug: 'beauty-products',
    image: '/assets/images/products/matte-liquid-lipstick.webp',
    price: 1200, salePrice: 950, purchasePrice: 500,
    sku: 'BEAUTY-003', stock: 80, tags: ['makeup', 'lipstick', 'beauty']
  },
  {
    name: 'Natural Clay Purifying Mask',
    categorySlug: 'beauty-products',
    image: '/assets/images/products/natural-clay-mask.webp',
    price: 1500, salePrice: 1200, purchasePrice: 700,
    sku: 'BEAUTY-004', stock: 50, tags: ['facemask', 'skincare', 'beauty']
  },
  {
    name: 'Organic Face Vitamin Serum',
    categorySlug: 'beauty-products',
    image: '/assets/images/products/organic-face-serum.webp',
    price: 2200, salePrice: 1790, purchasePrice: 1100,
    sku: 'BEAUTY-005', stock: 45, tags: ['serum', 'organic', 'beauty']
  },

  // 2. Kids & Baby Shoes (kids-shoes)
  {
    name: 'Baby Soft Leather Shoes',
    categorySlug: 'kids-shoes',
    image: '/assets/images/products/baby-soft-leather-shoes.webp',
    price: 1400, salePrice: 1100, purchasePrice: 650,
    sku: 'KIDS-001', stock: 50, tags: ['baby', 'shoes', 'kids']
  },
  {
    name: 'Organic Baby Swaddle Blanket',
    categorySlug: 'kids-shoes',
    image: '/assets/images/products/organic-baby-swaddle-blanket.webp',
    price: 1600, salePrice: 1250, purchasePrice: 750,
    sku: 'KIDS-002', stock: 60, tags: ['baby', 'blanket', 'organic']
  },
  {
    name: 'Silicone Baby Feeding Set',
    categorySlug: 'kids-shoes',
    image: '/assets/images/products/silicone-baby-feeding-set.webp',
    price: 1800, salePrice: 1390, purchasePrice: 800,
    sku: 'KIDS-003', stock: 70, tags: ['baby', 'feeding', 'silicone']
  },
  {
    name: 'Soft Cotton Baby Romper',
    categorySlug: 'kids-shoes',
    image: '/assets/images/products/soft-cotton-baby-romper.webp',
    price: 1200, salePrice: 950, purchasePrice: 500,
    sku: 'KIDS-004', stock: 55, tags: ['baby', 'romper', 'cotton']
  },
  {
    name: 'Wooden Baby Rattle Toy',
    categorySlug: 'kids-shoes',
    image: '/assets/images/products/wooden-baby-rattle-toy.webp',
    price: 950, salePrice: 750, purchasePrice: 400,
    sku: 'KIDS-005', stock: 90, tags: ['toy', 'baby', 'wooden']
  },

  // 3. Women's Clothing (womens-clothing)
  {
    name: "Women's Casual Cotton Blouse",
    categorySlug: 'womens-clothing',
    image: '/assets/images/products/womens-casual-cotton-blouse.webp',
    price: 1950, salePrice: 1550, purchasePrice: 950,
    sku: 'WOMEN-001', stock: 45, tags: ['blouse', 'womens-fashion', 'cotton']
  },
  {
    name: "Women's Floral Summer Dress",
    categorySlug: 'womens-clothing',
    image: '/assets/images/products/womens-floral-summer-dress.webp',
    price: 2800, salePrice: 2250, purchasePrice: 1350,
    sku: 'WOMEN-002', stock: 40, tags: ['dress', 'floral', 'summer']
  },
  {
    name: "Women's High-Waisted Stretch Jeans",
    categorySlug: 'womens-clothing',
    image: '/assets/images/products/womens-high-waisted-jeans.webp',
    price: 2500, salePrice: 1990, purchasePrice: 1200,
    sku: 'WOMEN-003', stock: 50, tags: ['jeans', 'high-waisted', 'denim']
  },
  {
    name: "Women's Knit Cardigan Sweater",
    categorySlug: 'womens-clothing',
    image: '/assets/images/products/womens-knit-cardigan-sweater.webp',
    price: 3200, salePrice: 2600, purchasePrice: 1600,
    sku: 'WOMEN-004', stock: 35, tags: ['cardigan', 'sweater', 'winter']
  },
  {
    name: "Women's Pleated Midi Skirt",
    categorySlug: 'womens-clothing',
    image: '/assets/images/products/womens-pleated-midi-skirt.webp',
    price: 2100, salePrice: 1680, purchasePrice: 1050,
    sku: 'WOMEN-005', stock: 45, tags: ['skirt', 'pleated', 'fashion']
  },

  // 4. Gadgets & Tech (gadgets)
  {
    name: 'Active Noise Cancelling Headphones',
    categorySlug: 'gadgets',
    image: '/assets/images/products/active-noise-cancelling-headphones.webp',
    price: 6500, salePrice: 5200, purchasePrice: 3200,
    sku: 'GADGET-001', stock: 30, tags: ['headphones', 'anc', 'audio']
  },
  {
    name: 'Portable Wireless Bluetooth Speaker',
    categorySlug: 'gadgets',
    image: '/assets/images/products/portable-bluetooth-speaker.webp',
    price: 3800, salePrice: 2990, purchasePrice: 1800,
    sku: 'GADGET-002', stock: 50, tags: ['speaker', 'bluetooth', 'audio']
  },
  {
    name: 'Smart WiFi Plug Power Adapter',
    categorySlug: 'gadgets',
    image: '/assets/images/products/smart-wifi-plug-adapter.webp',
    price: 1500, salePrice: 1190, purchasePrice: 700,
    sku: 'GADGET-003', stock: 75, tags: ['smart-home', 'wifi-plug', 'gadgets']
  },
  {
    name: 'Fast Wireless Charging Pad 15W',
    categorySlug: 'gadgets',
    image: '/assets/images/products/wireless-charging-pad.webp',
    price: 2200, salePrice: 1750, purchasePrice: 1000,
    sku: 'GADGET-004', stock: 60, tags: ['wireless-charger', 'gadget', 'tech']
  },
  {
    name: 'Wireless Ergonomic Optical Mouse',
    categorySlug: 'gadgets',
    image: '/assets/images/products/wireless-ergonomic-mouse.webp',
    price: 1800, salePrice: 1390, purchasePrice: 850,
    sku: 'GADGET-005', stock: 65, tags: ['mouse', 'ergonomic', 'gadget']
  },

  // 5. Grocery & Essentials (grocery)
  {
    name: 'Premium Dark Chocolate Bar 85%',
    categorySlug: 'grocery',
    image: '/assets/images/products/dark-chocolate-bar.webp',
    price: 650, salePrice: 520, purchasePrice: 300,
    sku: 'GROCERY-001', stock: 100, tags: ['chocolate', 'grocery', 'snacks']
  },
  {
    name: 'Extra Virgin Cold Pressed Olive Oil 500ml',
    categorySlug: 'grocery',
    image: '/assets/images/products/extra-virgin-olive-oil.webp',
    price: 1450, salePrice: 1200, purchasePrice: 750,
    sku: 'GROCERY-002', stock: 60, tags: ['olive-oil', 'grocery', 'organic']
  },
  {
    name: 'Organic Green Tea Whole Leaves 250g',
    categorySlug: 'grocery',
    image: '/assets/images/products/organic-green-tea-leaves.webp',
    price: 850, salePrice: 690, purchasePrice: 400,
    sku: 'GROCERY-003', stock: 80, tags: ['green-tea', 'organic', 'grocery']
  },
  {
    name: 'Premium Raw Organic Honey 500g',
    categorySlug: 'grocery',
    image: '/assets/images/products/premium-organic-honey.webp',
    price: 1250, salePrice: 990, purchasePrice: 600,
    sku: 'GROCERY-004', stock: 75, tags: ['honey', 'organic', 'grocery']
  },
  {
    name: 'Roasted & Salted Mixed Nuts 400g',
    categorySlug: 'grocery',
    image: '/assets/images/products/roasted-mixed-nuts.webp',
    price: 1100, salePrice: 890, purchasePrice: 550,
    sku: 'GROCERY-005', stock: 85, tags: ['nuts', 'snacks', 'grocery']
  },

  // 6. Bags & Handbags (handbags)
  {
    name: 'Casual Canvas Tote Bag',
    categorySlug: 'handbags',
    image: '/assets/images/products/casual-tote-bag.webp',
    price: 1600, salePrice: 1290, purchasePrice: 750,
    sku: 'BAG-001', stock: 50, tags: ['tote-bag', 'handbag', 'casual']
  },
  {
    name: 'Classic Genuine Leather Handbag',
    categorySlug: 'handbags',
    image: '/assets/images/products/classic-leather-handbag.webp',
    price: 4500, salePrice: 3600, purchasePrice: 2200,
    sku: 'BAG-002', stock: 30, tags: ['leather-bag', 'handbag', 'luxury']
  },
  {
    name: 'Elegant Satin Evening Clutch',
    categorySlug: 'handbags',
    image: '/assets/images/products/elegant-evening-clutch.webp',
    price: 2600, salePrice: 2050, purchasePrice: 1200,
    sku: 'BAG-003', stock: 40, tags: ['clutch', 'party-bag', 'womens-bag']
  },
  {
    name: 'Unisex Travel Crossbody Bag',
    categorySlug: 'handbags',
    image: '/assets/images/products/unisex-crossbody-bag.webp',
    price: 2200, salePrice: 1750, purchasePrice: 1000,
    sku: 'BAG-004', stock: 60, tags: ['crossbody', 'travel-bag', 'unisex']
  },
  {
    name: 'Travel Heavy Duty Canvas Backpack',
    categorySlug: 'handbags',
    image: '/assets/images/products/travel-canvas-backpack.webp',
    price: 3400, salePrice: 2750, purchasePrice: 1650,
    sku: 'BAG-005', stock: 45, tags: ['backpack', 'travel', 'canvas']
  },

  // 7. Hoodies & Sweatshirts (hoodies)
  {
    name: 'Beige Cotton Comfort Hoodie',
    categorySlug: 'hoodies',
    image: '/assets/images/products/beige-cotton-comfort-hoodie.webp',
    price: 2400, salePrice: 1890, purchasePrice: 1100,
    sku: 'HOODIE-001', stock: 55, tags: ['hoodie', 'beige', 'cotton']
  },
  {
    name: 'Classic Black Fleece Warm Hoodie',
    categorySlug: 'hoodies',
    image: '/assets/images/products/classic-black-fleece-hoodie.webp',
    price: 2600, salePrice: 2050, purchasePrice: 1200,
    sku: 'HOODIE-002', stock: 65, tags: ['hoodie', 'black', 'fleece']
  },
  {
    name: 'Heather Grey Pullover Hoodie',
    categorySlug: 'hoodies',
    image: '/assets/images/products/heather-grey-pullover-hoodie.webp',
    price: 2500, salePrice: 1950, purchasePrice: 1150,
    sku: 'HOODIE-003', stock: 50, tags: ['hoodie', 'grey', 'pullover']
  },
  {
    name: "Men's Heavyweight Pullover Fleece Hoodie",
    categorySlug: 'hoodies',
    image: '/assets/images/products/mens-pullover-fleece-hoodie.webp',
    price: 2800, salePrice: 2200, purchasePrice: 1300,
    sku: 'HOODIE-004', stock: 45, tags: ['hoodie', 'mens', 'winter']
  },
  {
    name: 'Navy Blue Zip-Up Thermal Hoodie',
    categorySlug: 'hoodies',
    image: '/assets/images/products/navy-blue-zip-up-hoodie.webp',
    price: 2700, salePrice: 2150, purchasePrice: 1250,
    sku: 'HOODIE-005', stock: 60, tags: ['hoodie', 'navy', 'zip-up']
  },

  // 8. Men's Fashion (mens-clothing)
  {
    name: 'Olive Green Oversized Streetwear Hoodie',
    categorySlug: 'mens-clothing',
    image: '/assets/images/products/olive-green-oversized-hoodie.webp',
    price: 2900, salePrice: 2290, purchasePrice: 1350,
    sku: 'MENS-001', stock: 40, tags: ['streetwear', 'mens-fashion', 'hoodie']
  },
  {
    name: "Men's Slim Fit Casual Shirt",
    categorySlug: 'mens-clothing',
    image: '/assets/images/products/mens-slim-fit-casual-shirt.webp',
    price: 2300, salePrice: 1790, purchasePrice: 1050,
    sku: 'MENS-002', stock: 50, tags: ['casual-shirt', 'mens-fashion', 'slim-fit']
  },
  {
    name: "Men's Premium Cotton Crewneck Tee",
    categorySlug: 'mens-clothing',
    image: '/assets/images/products/mens-cotton-crewneck-tshirt.webp',
    price: 1350, salePrice: 1050, purchasePrice: 600,
    sku: 'MENS-003', stock: 75, tags: ['tshirt', 'crewneck', 'mens']
  },
  {
    name: "Men's Stretch Fit Chino Trousers",
    categorySlug: 'mens-clothing',
    image: '/assets/images/products/mens-stretch-chino-pants.webp',
    price: 2400, salePrice: 1890, purchasePrice: 1100,
    sku: 'MENS-004', stock: 55, tags: ['chinos', 'pants', 'mens-fashion']
  },
  {
    name: "Men's Classic Pique Polo Top",
    categorySlug: 'mens-clothing',
    image: '/assets/images/products/mens-classic-polo-shirt.webp',
    price: 1750, salePrice: 1390, purchasePrice: 800,
    sku: 'MENS-005', stock: 65, tags: ['polo', 'mens', 'casual']
  },

  // 9. Mobile & Accessories (mobile-accessories)
  {
    name: 'Adjustable Metal Desk Phone Stand',
    categorySlug: 'mobile-accessories',
    image: '/assets/images/products/adjustable-desk-phone-stand.webp',
    price: 850, salePrice: 650, purchasePrice: 350,
    sku: 'MOB-001', stock: 80, tags: ['phone-stand', 'mobile-acc', 'desk']
  },
  {
    name: 'Fast Charging Braided USB-C Cable 2M',
    categorySlug: 'mobile-accessories',
    image: '/assets/images/products/braided-usb-c-cable.webp',
    price: 650, salePrice: 490, purchasePrice: 250,
    sku: 'MOB-002', stock: 120, tags: ['usb-c', 'cable', 'charger']
  },
  {
    name: 'Magnetic Leather Shockproof Phone Case',
    categorySlug: 'mobile-accessories',
    image: '/assets/images/products/magnetic-leather-phone-case.webp',
    price: 1250, salePrice: 950, purchasePrice: 500,
    sku: 'MOB-003', stock: 70, tags: ['phone-case', 'magnetic', 'leather']
  },
  {
    name: '9H Hardness Tempered Glass Screen Protector',
    categorySlug: 'mobile-accessories',
    image: '/assets/images/products/tempered-glass-screen-protector.webp',
    price: 450, salePrice: 320, purchasePrice: 150,
    sku: 'MOB-004', stock: 150, tags: ['screen-protector', 'tempered-glass', 'mobile']
  },
  {
    name: 'Ultra Slim Fast 10000mAh Power Bank',
    categorySlug: 'mobile-accessories',
    image: '/assets/images/products/ultra-slim-power-bank.webp',
    price: 2400, salePrice: 1890, purchasePrice: 1100,
    sku: 'MOB-005', stock: 50, tags: ['power-bank', 'fast-charging', 'portable']
  },

  // 10. Jewelry & Ornaments (jewelry)
  {
    name: 'Solitaire Diamond Stud Earrings',
    categorySlug: 'jewelry',
    image: '/assets/images/products/diamond-stud-earrings.webp',
    price: 3500, salePrice: 2800, purchasePrice: 1700,
    sku: 'JEWEL-001', stock: 30, tags: ['earrings', 'diamond', 'jewelry']
  },
  {
    name: '18K Gold Plated Pendant Necklace',
    categorySlug: 'jewelry',
    image: '/assets/images/products/gold-pendant-necklace.webp',
    price: 2800, salePrice: 2200, purchasePrice: 1300,
    sku: 'JEWEL-002', stock: 40, tags: ['necklace', 'gold', 'jewelry']
  },
  {
    name: 'Minimalist Smooth Gold Ring',
    categorySlug: 'jewelry',
    image: '/assets/images/products/minimalist-gold-ring.webp',
    price: 1800, salePrice: 1390, purchasePrice: 800,
    sku: 'JEWEL-003', stock: 50, tags: ['ring', 'gold', 'minimalist']
  },
  {
    name: 'Freshwater Pearl Drop Necklace',
    categorySlug: 'jewelry',
    image: '/assets/images/products/pearl-drop-necklace.webp',
    price: 2400, salePrice: 1890, purchasePrice: 1100,
    sku: 'JEWEL-004', stock: 35, tags: ['pearl', 'necklace', 'jewelry']
  },
  {
    name: '925 Sterling Silver Chain Bracelet',
    categorySlug: 'jewelry',
    image: '/assets/images/products/silver-chain-bracelet.webp',
    price: 1950, salePrice: 1550, purchasePrice: 900,
    sku: 'JEWEL-005', stock: 45, tags: ['bracelet', 'silver', 'jewelry']
  },

  // 11. Pants & Trousers (pants)
  {
    name: 'Charcoal Grey Athletic Jogger Pants',
    categorySlug: 'pants',
    image: '/assets/images/products/charcoal-grey-jogger-pants.webp',
    price: 1850, salePrice: 1450, purchasePrice: 850,
    sku: 'PANTS-001', stock: 60, tags: ['joggers', 'pants', 'athletic']
  },
  {
    name: 'Classic Black Gabardine Formal Pants',
    categorySlug: 'pants',
    image: '/assets/images/products/classic-black-gabardine-pants.webp',
    price: 2200, salePrice: 1750, purchasePrice: 1000,
    sku: 'PANTS-002', stock: 50, tags: ['formal-pants', 'black', 'gabardine']
  },
  {
    name: 'Dark Blue Indigo Slim Denim Jeans',
    categorySlug: 'pants',
    image: '/assets/images/products/dark-blue-indigo-jeans.webp',
    price: 2600, salePrice: 2050, purchasePrice: 1200,
    sku: 'PANTS-003', stock: 55, tags: ['jeans', 'indigo', 'denim']
  },
  {
    name: 'Olive Green Multi-Pocket Cargo Pants',
    categorySlug: 'pants',
    image: '/assets/images/products/olive-green-cargo-pants.webp',
    price: 2400, salePrice: 1890, purchasePrice: 1100,
    sku: 'PANTS-004', stock: 45, tags: ['cargo', 'pants', 'streetwear']
  },
  {
    name: 'Slim Fit Stretch Khaki Chino Pants',
    categorySlug: 'pants',
    image: '/assets/images/products/slim-fit-khaki-chinos.webp',
    price: 2100, salePrice: 1650, purchasePrice: 950,
    sku: 'PANTS-005', stock: 65, tags: ['chinos', 'khaki', 'pants']
  },

  // 12. Polo Shirts (polo-shirts)
  {
    name: 'Burgundy Classic Cotton Polo Shirt',
    categorySlug: 'polo-shirts',
    image: '/assets/images/products/burgundy-classic-polo.webp',
    price: 1650, salePrice: 1290, purchasePrice: 750,
    sku: 'POLO-001', stock: 50, tags: ['polo', 'burgundy', 'cotton']
  },
  {
    name: 'Charcoal Grey Premium Heather Polo',
    categorySlug: 'polo-shirts',
    image: '/assets/images/products/charcoal-grey-premium-polo.webp',
    price: 1750, salePrice: 1390, purchasePrice: 800,
    sku: 'POLO-002', stock: 60, tags: ['polo', 'grey', 'premium']
  },
  {
    name: 'Forest Green Active Breathable Polo',
    categorySlug: 'polo-shirts',
    image: '/assets/images/products/forest-green-active-polo.webp',
    price: 1600, salePrice: 1250, purchasePrice: 700,
    sku: 'POLO-003', stock: 55, tags: ['polo', 'green', 'active']
  },
  {
    name: 'Premium White Organic Cotton Polo',
    categorySlug: 'polo-shirts',
    image: '/assets/images/products/premium-white-cotton-polo.webp',
    price: 1800, salePrice: 1450, purchasePrice: 850,
    sku: 'POLO-004', stock: 70, tags: ['polo', 'white', 'cotton']
  },
  {
    name: 'Royal Blue Pique Fabric Polo Shirt',
    categorySlug: 'polo-shirts',
    image: '/assets/images/products/royal-blue-pique-polo.webp',
    price: 1700, salePrice: 1350, purchasePrice: 780,
    sku: 'POLO-005', stock: 45, tags: ['polo', 'blue', 'pique']
  },

  // 13. Casual & Formal Shirts (shirts)
  {
    name: 'Black Casual Breathable Linen Shirt',
    categorySlug: 'shirts',
    image: '/assets/images/products/black-casual-linen-shirt.webp',
    price: 2200, salePrice: 1750, purchasePrice: 1000,
    sku: 'SHIRT-001', stock: 50, tags: ['shirt', 'linen', 'black']
  },
  {
    name: 'Classic Blue Oxford Cotton Shirt',
    categorySlug: 'shirts',
    image: '/assets/images/products/classic-blue-oxford-shirt.webp',
    price: 2300, salePrice: 1850, purchasePrice: 1050,
    sku: 'SHIRT-002', stock: 60, tags: ['shirt', 'oxford', 'blue']
  },
  {
    name: 'Olive Green Utility Pocket Shirt',
    categorySlug: 'shirts',
    image: '/assets/images/products/olive-green-utility-shirt.webp',
    price: 2100, salePrice: 1650, purchasePrice: 950,
    sku: 'SHIRT-003', stock: 45, tags: ['shirt', 'utility', 'green']
  },
  {
    name: 'Red Checked Cotton Flannel Shirt',
    categorySlug: 'shirts',
    image: '/assets/images/products/red-checked-flannel-shirt.webp',
    price: 2400, salePrice: 1890, purchasePrice: 1100,
    sku: 'SHIRT-004', stock: 55, tags: ['shirt', 'flannel', 'checked']
  },
  {
    name: 'White Premium Formal Dress Shirt',
    categorySlug: 'shirts',
    image: '/assets/images/products/white-formal-dress-shirt.webp',
    price: 2500, salePrice: 1990, purchasePrice: 1150,
    sku: 'SHIRT-005', stock: 65, tags: ['shirt', 'formal', 'white']
  },

  // 14. Men's & Women's Shoes (shoes)
  {
    name: 'Black Formal Genuine Oxford Shoes',
    categorySlug: 'shoes',
    image: '/assets/images/products/black-formal-oxford-shoes.webp',
    price: 4500, salePrice: 3600, purchasePrice: 2200,
    sku: 'SHOES-001', stock: 35, tags: ['formal-shoes', 'oxford', 'leather']
  },
  {
    name: 'Casual Slip-On Canvas Loafers',
    categorySlug: 'shoes',
    image: '/assets/images/products/casual-canvas-loafers.webp',
    price: 2200, salePrice: 1750, purchasePrice: 1000,
    sku: 'SHOES-002', stock: 50, tags: ['loafers', 'canvas', 'casual']
  },
  {
    name: 'Classic Brown Leather Formal Shoes',
    categorySlug: 'shoes',
    image: '/assets/images/products/classic-brown-leather-shoes.webp',
    price: 4200, salePrice: 3350, purchasePrice: 2000,
    sku: 'SHOES-003', stock: 40, tags: ['leather-shoes', 'brown', 'formal']
  },
  {
    name: 'Lightweight Running Athletic Shoes',
    categorySlug: 'shoes',
    image: '/assets/images/products/running-athletic-shoes.webp',
    price: 3200, salePrice: 2500, purchasePrice: 1500,
    sku: 'SHOES-004', stock: 60, tags: ['sports-shoes', 'running', 'sneakers']
  },
  {
    name: 'Classic White Sport Leather Sneakers',
    categorySlug: 'shoes',
    image: '/assets/images/products/white-sport-sneakers.webp',
    price: 2900, salePrice: 2290, purchasePrice: 1350,
    sku: 'SHOES-005', stock: 55, tags: ['sneakers', 'white-shoes', 'sport']
  },

  // 15. Sports & Fitness (sports-fitness)
  {
    name: 'Adjustable Dumbbell Training Set 20KG',
    categorySlug: 'sports-fitness',
    image: '/assets/images/products/adjustable-dumbbell-set.webp',
    price: 5500, salePrice: 4390, purchasePrice: 2600,
    sku: 'SPORT-001', stock: 25, tags: ['dumbbells', 'fitness', 'workout']
  },
  {
    name: 'Insulated Stainless Steel Sports Water Bottle',
    categorySlug: 'sports-fitness',
    image: '/assets/images/products/insulated-sports-water-bottle.webp',
    price: 1200, salePrice: 950, purchasePrice: 500,
    sku: 'SPORT-002', stock: 75, tags: ['water-bottle', 'sports', 'fitness']
  },
  {
    name: 'Extra Thick Non-Slip Yoga Mat',
    categorySlug: 'sports-fitness',
    image: '/assets/images/products/non-slip-yoga-mat.webp',
    price: 1800, salePrice: 1390, purchasePrice: 800,
    sku: 'SPORT-003', stock: 50, tags: ['yoga-mat', 'fitness', 'exercise']
  },
  {
    name: 'Full Body Resistance Bands Set 5-Pack',
    categorySlug: 'sports-fitness',
    image: '/assets/images/products/resistance-bands-pack.webp',
    price: 1400, salePrice: 1090, purchasePrice: 600,
    sku: 'SPORT-004', stock: 80, tags: ['resistance-bands', 'fitness', 'home-workout']
  },
  {
    name: 'Smart Heart Rate Fitness Tracker Band',
    categorySlug: 'sports-fitness',
    image: '/assets/images/products/smart-fitness-tracker-band.webp',
    price: 2500, salePrice: 1990, purchasePrice: 1150,
    sku: 'SPORT-005', stock: 45, tags: ['fitness-band', 'smart-tracker', 'sport']
  },

  // 16. Sunglasses & Eyewear (sunglasses)
  {
    name: 'Chic Cat-Eye Polarized Sunglasses',
    categorySlug: 'sunglasses',
    image: '/assets/images/products/chic-cat-eye-sunglasses.webp',
    price: 1800, salePrice: 1390, purchasePrice: 800,
    sku: 'SUN-001', stock: 45, tags: ['sunglasses', 'cat-eye', 'eyewear']
  },
  {
    name: 'Classic Metal Frame Aviator Sunglasses',
    categorySlug: 'sunglasses',
    image: '/assets/images/products/classic-aviator-sunglasses.webp',
    price: 1950, salePrice: 1490, purchasePrice: 850,
    sku: 'SUN-002', stock: 60, tags: ['aviator', 'sunglasses', 'classic']
  },
  {
    name: 'Retro Wayfarer Matte Finish Sunglasses',
    categorySlug: 'sunglasses',
    image: '/assets/images/products/retro-wayfarer-sunglasses.webp',
    price: 1650, salePrice: 1290, purchasePrice: 750,
    sku: 'SUN-003', stock: 55, tags: ['wayfarer', 'retro', 'sunglasses']
  },
  {
    name: 'Outdoor Sport Polarized UV400 Sunglasses',
    categorySlug: 'sunglasses',
    image: '/assets/images/products/sport-polarized-sunglasses.webp',
    price: 1750, salePrice: 1350, purchasePrice: 780,
    sku: 'SUN-004', stock: 50, tags: ['sport-sunglasses', 'polarized', 'eyewear']
  },
  {
    name: 'Trendy Round Metal Frame Sunglasses',
    categorySlug: 'sunglasses',
    image: '/assets/images/products/trendy-round-sunglasses.webp',
    price: 1550, salePrice: 1190, purchasePrice: 680,
    sku: 'SUN-005', stock: 65, tags: ['round-sunglasses', 'trendy', 'fashion']
  },

  // 17. T-Shirts & Tops (t-shirts)
  {
    name: 'Charcoal Grey Heather Soft T-Shirt',
    categorySlug: 't-shirts',
    image: '/assets/images/products/charcoal-grey-heather-tshirt.webp',
    price: 1200, salePrice: 890, purchasePrice: 500,
    sku: 'TEE-001', stock: 80, tags: ['tshirt', 'grey', 'cotton']
  },
  {
    name: 'Classic Black Premium Cotton T-Shirt',
    categorySlug: 't-shirts',
    image: '/assets/images/products/classic-black-cotton-tshirt.webp',
    price: 1100, salePrice: 850, purchasePrice: 450,
    sku: 'TEE-002', stock: 100, tags: ['tshirt', 'black', 'basic']
  },
  {
    name: 'Crewneck Pure White Cotton T-Shirt',
    categorySlug: 't-shirts',
    image: '/assets/images/products/crewneck-white-cotton-tshirt.webp',
    price: 1100, salePrice: 850, purchasePrice: 450,
    sku: 'TEE-003', stock: 95, tags: ['tshirt', 'white', 'crewneck']
  },
  {
    name: 'Navy Blue Slim Fit Comfy T-Shirt',
    categorySlug: 't-shirts',
    image: '/assets/images/products/navy-blue-slim-fit-tshirt.webp',
    price: 1250, salePrice: 950, purchasePrice: 520,
    sku: 'TEE-004', stock: 85, tags: ['tshirt', 'navy', 'slim-fit']
  },
  {
    name: 'Olive Green Oversized Streetwear T-Shirt',
    categorySlug: 't-shirts',
    image: '/assets/images/products/olive-green-streetwear-tshirt.webp',
    price: 1350, salePrice: 1050, purchasePrice: 580,
    sku: 'TEE-005', stock: 70, tags: ['tshirt', 'green', 'streetwear']
  },

  // 18. Travel & Luggage (travel-bags)
  {
    name: 'Compact Hanging Travel Toiletries Bag',
    categorySlug: 'travel-bags',
    image: '/assets/images/products/compact-travel-toiletries-bag.webp',
    price: 1400, salePrice: 1090, purchasePrice: 600,
    sku: 'TRAVEL-001', stock: 60, tags: ['toiletries-bag', 'travel', 'organizer']
  },
  {
    name: 'Ergonomic Memory Foam Travel Neck Pillow',
    categorySlug: 'travel-bags',
    image: '/assets/images/products/ergonomic-travel-neck-pillow.webp',
    price: 1650, salePrice: 1290, purchasePrice: 700,
    sku: 'TRAVEL-002', stock: 50, tags: ['neck-pillow', 'travel', 'comfort']
  },
  {
    name: '24 Inch Hardside Spinner Travel Suitcase',
    categorySlug: 'travel-bags',
    image: '/assets/images/products/hardside-spinner-suitcase.webp',
    price: 6500, salePrice: 5200, purchasePrice: 3200,
    sku: 'TRAVEL-003', stock: 25, tags: ['suitcase', 'luggage', 'travel']
  },
  {
    name: 'RFID Blocking Leather Travel Wallet Passport Holder',
    categorySlug: 'travel-bags',
    image: '/assets/images/products/rfid-blocking-travel-wallet.webp',
    price: 1500, salePrice: 1190, purchasePrice: 650,
    sku: 'TRAVEL-004', stock: 70, tags: ['travel-wallet', 'passport-holder', 'rfid']
  },
  {
    name: 'Universal All-in-One World Travel Adapter',
    categorySlug: 'travel-bags',
    image: '/assets/images/products/universal-travel-adapter.webp',
    price: 1850, salePrice: 1390, purchasePrice: 800,
    sku: 'TRAVEL-005', stock: 65, tags: ['travel-adapter', 'universal-plug', 'gadget']
  },

  // 19. Watches & Clocks (watches)
  {
    name: 'Classic Brown Leather Strap Analog Watch',
    categorySlug: 'watches',
    image: '/assets/images/products/classic-leather-strap-watch.webp',
    price: 3200, salePrice: 2500, purchasePrice: 1500,
    sku: 'WATCH-001', stock: 40, tags: ['watch', 'leather-strap', 'analog']
  },
  {
    name: 'Luxury Gold Automatic Skeleton Watch',
    categorySlug: 'watches',
    image: '/assets/images/products/luxury-gold-automatic-watch.webp',
    price: 6800, salePrice: 5400, purchasePrice: 3400,
    sku: 'WATCH-002', stock: 20, tags: ['luxury-watch', 'automatic', 'gold']
  },
  {
    name: 'Minimalist Silver Mesh Dial Unisex Watch',
    categorySlug: 'watches',
    image: '/assets/images/products/minimalist-silver-mesh-watch.webp',
    price: 2800, salePrice: 2200, purchasePrice: 1300,
    sku: 'WATCH-003', stock: 45, tags: ['silver-watch', 'mesh', 'minimalist']
  },
  {
    name: 'Smart Touchscreen Fitness & Health Watch',
    categorySlug: 'watches',
    image: '/assets/images/products/smart-touchscreen-fitness-watch.webp',
    price: 4200, salePrice: 3350, purchasePrice: 2000,
    sku: 'WATCH-004', stock: 50, tags: ['smartwatch', 'touchscreen', 'fitness']
  },
  {
    name: 'Sports Chronograph 50M Waterproof Watch',
    categorySlug: 'watches',
    image: '/assets/images/products/sports-chronograph-waterproof-watch.webp',
    price: 3900, salePrice: 3100, purchasePrice: 1800,
    sku: 'WATCH-005', stock: 35, tags: ['sport-watch', 'chronograph', 'waterproof']
  }
];

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seed() {
  try {
    await mongoose.connect(mongodbUri, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected to MongoDB successfully.');

    // Fetch category map by slug
    const allCategories = await Category.find({});
    const categoryMap = {};
    allCategories.forEach(c => {
      categoryMap[c.slug] = c._id;
    });

    console.log(`Found ${allCategories.length} categories in database.`);

    // Clear existing products
    const deleteResult = await Product.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing products.`);

    // Distribute section flags:
    // 10 for New Arrival (indices 0 to 9)
    // 10 for Flash Sale (indices 10 to 19)
    // 10 for Featured (indices 20 to 29)
    let seededCount = 0;
    let newArrivalCount = 0;
    let flashSaleCount = 0;
    let featuredCount = 0;

    for (let i = 0; i < productsData.length; i++) {
      const p = productsData[i];
      const categoryId = categoryMap[p.categorySlug];

      const isNewArrival = i < 10;
      const isFlashSale = i >= 10 && i < 20;
      const isFeatured = i >= 20 && i < 30;

      if (isNewArrival) newArrivalCount++;
      if (isFlashSale) flashSaleCount++;
      if (isFeatured) featuredCount++;

      const slug = generateSlug(p.name);

      await Product.create({
        name: p.name,
        slug: slug,
        description: `High-quality ${p.name}. Crafted with premium materials for maximum durability and comfort. Available now on Swapnobaz platform.`,
        price: p.price,
        salePrice: p.salePrice,
        purchasePrice: p.purchasePrice,
        discountRate: Math.round(((p.price - p.salePrice) / p.price) * 100),
        sku: p.sku,
        stock: p.stock,
        categories: categoryId ? [categoryId] : [],
        tags: p.tags,
        images: [p.image],
        isFeatured: isFeatured,
        isNewArrival: isNewArrival,
        isFlashSale: isFlashSale,
        isPublished: true,
        ratings: Number((4.2 + Math.random() * 0.7).toFixed(1)),
        numReviews: Math.floor(10 + Math.random() * 40),
        views: Math.floor(100 + Math.random() * 500),
        totalSales: Math.floor(15 + Math.random() * 50)
      });

      seededCount++;
    }

    console.log(`\n=== Product Seeding Summary ===`);
    console.log(`Total Products Seeded: ${seededCount}`);
    console.log(`New Arrival Section: ${newArrivalCount} Products`);
    console.log(`Flash Sale Section: ${flashSaleCount} Products`);
    console.log(`Featured Section: ${featuredCount} Products`);
    console.log(`==================================\n`);

  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
