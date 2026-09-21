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
  mongodbUri = 'mongodb+srv://Climax Apparels:xI2QuBaFZsYQ5vRD@cluster0.e5n1hnl.mongodb.net/Climax Apparels';
}

console.log('Connecting to MongoDB...');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    image: { type: String },
    parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

const categoryHierarchy = [
  {
    name: 'Women',
    slug: 'women',
    image: '/assets/images/cagetory/ArongCategory/D1-Women-Dp-Thumb-Summer26-02-07-2026-SM.webp',
    subcategories: [
      {
        name: 'Saree',
        slug: 'women-saree',
        subcategories: [
          { name: 'Cotton', slug: 'women-saree-cotton' },
          { name: 'Muslin', slug: 'women-saree-muslin' },
          { name: 'Silk', slug: 'women-saree-silk' },
          { name: 'Katan', slug: 'women-saree-katan' },
          { name: 'Nakshi Kantha', slug: 'women-saree-nakshi-kantha' },
          { name: 'Jamdani', slug: 'women-saree-jamdani' },
          { name: 'Brac Silk', slug: 'women-saree-brac-silk' }
        ]
      },
      {
        name: 'Shalwar Kameez',
        slug: 'women-shalwar-kameez',
        subcategories: [
          { name: 'Cotton & Blends', slug: 'women-shalwar-kameez-cotton-blends' },
          { name: 'Silk', slug: 'women-shalwar-kameez-silk' }
        ]
      },
      { name: 'Kurta', slug: 'women-kurta' },
      { name: 'Panjabi', slug: 'women-panjabi' },
      { name: 'Tops', slug: 'women-tops' },
      { name: 'Coats & Jackets', slug: 'women-coats-jackets' },
      { name: 'Shrugs', slug: 'women-shrugs' },
      { name: 'Skirts', slug: 'women-skirts' },
      { name: 'Pants', slug: 'women-pants' },
      {
        name: 'Maternity',
        slug: 'women-maternity',
        subcategories: [
          { name: 'Tops', slug: 'women-maternity-tops' },
          { name: 'Tunics', slug: 'women-maternity-tunics' },
          { name: 'Dresses', slug: 'women-maternity-dresses' },
          { name: 'Pants', slug: 'women-maternity-pants' }
        ]
      },
      { name: 'Dupatta', slug: 'women-dupatta' },
      { name: 'Scarves', slug: 'women-scarves' },
      { name: 'Nightwear', slug: 'women-nightwear' },
      {
        name: 'Shawls',
        slug: 'women-shawls',
        subcategories: [
          { name: 'Viscose', slug: 'women-shawls-viscose' },
          { name: 'Cotton', slug: 'women-shawls-cotton' },
          { name: 'Silk', slug: 'women-shawls-silk' },
          { name: 'Endi', slug: 'women-shawls-endi' },
          { name: 'Nakshi Kantha', slug: 'women-shawls-nakshi-kantha' }
        ]
      },
      {
        name: 'Fabric (Metres)',
        slug: 'women-fabric',
        subcategories: [
          { name: '2-Piece Jamdani Sets', slug: 'women-fabric-2pc-jamdani' },
          { name: '3-Piece Sets', slug: 'women-fabric-3pc-sets' }
        ]
      },
      {
        name: 'Shoes',
        slug: 'women-shoes',
        subcategories: [
          { name: 'Sandals', slug: 'women-shoes-sandals' },
          { name: 'Heels', slug: 'women-shoes-heels' },
          { name: 'Pumps', slug: 'women-shoes-pumps' },
          { name: 'Nagras', slug: 'women-shoes-nagras' }
        ]
      },
      {
        name: 'Accessories',
        slug: 'women-accessories',
        subcategories: [
          { name: 'Bags', slug: 'women-accessories-bags' },
          { name: 'Purses', slug: 'women-accessories-purses' },
          { name: 'Wallets', slug: 'women-accessories-wallets' },
          { name: 'Card Holders', slug: 'women-accessories-card-holders' },
          { name: 'Key Rings', slug: 'women-accessories-key-rings' }
        ]
      },
      { name: 'Taaga', slug: 'women-taaga' }
    ]
  },
  {
    name: 'Men',
    slug: 'men',
    image: '/assets/images/cagetory/ArongCategory/D2-Men-Dp-Thumb-Summer26-02-07-2026-SM.webp',
    subcategories: [
      {
        name: 'Panjabi',
        slug: 'men-panjabi',
        subcategories: [
          { name: 'Cotton & Blends', slug: 'men-panjabi-cotton-blends' },
          { name: 'Addi', slug: 'men-panjabi-addi' },
          { name: 'Endi', slug: 'men-panjabi-endi' },
          { name: 'Silk', slug: 'men-panjabi-silk' },
          { name: 'Muslin & Jamdani', slug: 'men-panjabi-muslin-jamdani' }
        ]
      },
      {
        name: 'Panjabi Pajama Sets',
        slug: 'men-panjabi-pajama-sets',
        subcategories: [
          { name: 'Cotton & Blends', slug: 'men-panjabi-pajama-sets-cotton' },
          { name: 'Silk', slug: 'men-panjabi-pajama-sets-silk' }
        ]
      },
      { name: 'Pajama', slug: 'men-pajama' },
      { name: 'Coaty', slug: 'men-coaty' },
      { name: 'Short Kurta', slug: 'men-short-kurta' },
      { name: 'Jackets', slug: 'men-jackets' },
      {
        name: 'Trousers',
        slug: 'men-trousers',
        subcategories: [
          { name: 'Chinos', slug: 'men-trousers-chinos' },
          { name: 'Denim', slug: 'men-trousers-denim' },
          { name: 'Lounge Wear', slug: 'men-trousers-lounge-wear' }
        ]
      },
      {
        name: 'Shirts',
        slug: 'men-shirts',
        subcategories: [
          { name: 'Ethnic', slug: 'men-shirts-ethnic' },
          { name: 'Casual', slug: 'men-shirts-casual' },
          { name: 'Executive', slug: 'men-shirts-executive' }
        ]
      },
      {
        name: 'Fatua',
        slug: 'men-fatua',
        subcategories: [
          { name: 'Cotton & Blends', slug: 'men-fatua-cotton-blends' },
          { name: 'Endi', slug: 'men-fatua-endi' },
          { name: 'Silk', slug: 'men-fatua-silk' }
        ]
      },
      { name: 'Lungi', slug: 'men-lungi' },
      { name: 'Shawls', slug: 'men-shawls' },
      { name: 'Scarves & Mufflers', slug: 'men-scarves-mufflers' },
      { name: 'T-Shirts', slug: 'men-t-shirts' },
      { name: 'Polos', slug: 'men-polos' },
      { name: 'Sleeping Suits', slug: 'men-sleeping-suits' },
      {
        name: 'Shoes',
        slug: 'men-shoes',
        subcategories: [
          { name: 'Sandals', slug: 'men-shoes-sandals' },
          { name: 'Shoes', slug: 'men-shoes-shoes' },
          { name: 'Nagras', slug: 'men-shoes-nagras' }
        ]
      },
      {
        name: 'Accessories',
        slug: 'men-accessories',
        subcategories: [
          { name: 'Belts', slug: 'men-accessories-belts' },
          { name: 'Wallets', slug: 'men-accessories-wallets' },
          { name: 'Card Holders', slug: 'men-accessories-card-holders' },
          { name: 'Key Rings', slug: 'men-accessories-key-rings' },
          { name: 'Bags', slug: 'men-accessories-bags' },
          { name: 'Attar', slug: 'men-accessories-attar' }
        ]
      },
      { name: 'Tupi', slug: 'men-tupi' }
    ]
  },
  {
    name: 'Kids\'',
    slug: 'kids',
    image: '/assets/images/cagetory/ArongCategory/D-Dept-Thumb-KIDS-Sum26-08-07-2026-SM.webp',
    subcategories: [
      { name: 'Kids New Arrivals', slug: 'kids-new-arrivals' },
      { name: 'Kids Partywear', slug: 'kids-partywear' },
      {
        name: 'Junior Girls (2Y-9Y)',
        slug: 'kids-junior-girls',
        subcategories: [
          { name: 'Frocks', slug: 'kids-junior-girls-frocks' },
          { name: 'Skirt Tops', slug: 'kids-junior-girls-skirt-tops' },
          { name: 'Pant Tops', slug: 'kids-junior-girls-pant-tops' },
          { name: 'T-Shirts', slug: 'kids-junior-girls-t-shirts' },
          { name: 'Shalwar Kameez', slug: 'kids-junior-girls-shalwar-kameez' },
          { name: 'Ghagra Choli', slug: 'kids-junior-girls-ghagra-choli' },
          { name: 'Saree', slug: 'kids-junior-girls-saree' },
          { name: 'Sweaters & Jackets', slug: 'kids-junior-girls-sweaters-jackets' },
          { name: 'Shawls', slug: 'kids-junior-girls-shawls' }
        ]
      },
      {
        name: 'Girls (8Y-15Y)',
        slug: 'kids-girls',
        subcategories: [
          { name: 'Frocks', slug: 'kids-girls-frocks' },
          { name: 'Tops', slug: 'kids-girls-tops' },
          { name: 'Skirts', slug: 'kids-girls-skirts' },
          { name: 'Pants', slug: 'kids-girls-pants' },
          { name: 'Shalwar Kameez', slug: 'kids-girls-shalwar-kameez' },
          { name: 'Ghagra Choli', slug: 'kids-girls-ghagra-choli' },
          { name: 'Sweaters & Jackets', slug: 'kids-girls-sweaters-jackets' },
          { name: 'Shawls', slug: 'kids-girls-shawls' },
          { name: 'T-Shirts', slug: 'kids-girls-t-shirts' }
        ]
      },
      {
        name: 'Boys (8Y-15Y)',
        slug: 'kids-boys',
        subcategories: [
          { name: 'Shirts', slug: 'kids-boys-shirts' }
        ]
      },
      {
        name: 'Newborn Girls (0-1.5Y)',
        slug: 'kids-newborn-girls',
        subcategories: [
          { name: 'Nima', slug: 'kids-newborn-girls-nima' },
          { name: 'Frocks', slug: 'kids-newborn-girls-frocks' },
          { name: 'Skirt Tops', slug: 'kids-newborn-girls-skirt-tops' },
          { name: 'Pant Tops', slug: 'kids-newborn-girls-pant-tops' },
          { name: 'Shalwar Kameez', slug: 'kids-newborn-girls-shalwar-kameez' },
          { name: 'Ghagra Choli', slug: 'kids-newborn-girls-ghagra-choli' },
          { name: 'Shawls', slug: 'kids-newborn-girls-shawls' },
          { name: 'Nappy & Pants', slug: 'kids-newborn-girls-nappy-pants' },
          { name: 'Bibs', slug: 'kids-newborn-girls-bibs' },
          { name: 'Feeder Covers', slug: 'kids-newborn-girls-feeder-covers' }
        ]
      },
      {
        name: 'Newborn Boys (0-1.5Y)',
        slug: 'kids-newborn-boys',
        subcategories: []
      },
      {
        name: 'Shoes',
        slug: 'kids-shoes',
        subcategories: [
          { name: 'Newborn (0.3Y-1.5Y)', slug: 'kids-shoes-newborn' },
          { name: 'Toddler (1Y-3Y)', slug: 'kids-shoes-toddler' },
          { name: 'Junior Girls (4Y-6Y)', slug: 'kids-shoes-junior-girls' },
          { name: 'Junior Boys (4Y-6Y)', slug: 'kids-shoes-junior-boys' },
          { name: 'Girls (7Y-14Y)', slug: 'kids-shoes-girls' },
          { name: 'Boys (7Y-14Y)', slug: 'kids-shoes-boys' }
        ]
      },
      {
        name: 'Toys & Books',
        slug: 'kids-toys-books',
        subcategories: [
          { name: 'Books', slug: 'kids-toys-books-books' },
          { name: 'Learning & Education', slug: 'kids-toys-books-learning-education' },
          { name: 'Stuffed & Plush Toys', slug: 'kids-toys-books-stuffed-plush-toys' },
          { name: 'Wooden Toys', slug: 'kids-toys-books-wooden-toys' }
        ]
      }
    ]
  },
  {
    name: 'Home Décor',
    slug: 'home-decor',
    image: '/assets/images/cagetory/ArongCategory/D-HD-Dept-Thumb-EID2-Full-Launch-23-04-2026-SM.webp',
    subcategories: [
      {
        name: 'Living',
        slug: 'home-decor-living',
        subcategories: [
          { name: 'Bedcovers', slug: 'home-decor-living-bedcovers' },
          { name: 'Kantha & Quilt', slug: 'home-decor-living-kantha-quilt' },
          { name: 'Cushion Covers', slug: 'home-decor-living-cushion-covers' },
          { name: 'Curtains', slug: 'home-decor-living-curtains' },
          { name: 'Pillows & Cushions', slug: 'home-decor-living-pillows-cushions' },
          { name: 'Pillow Covers', slug: 'home-decor-living-pillow-covers' },
          { name: 'Sofa Throw', slug: 'home-decor-living-sofa-throw' },
          { name: 'Table Covers & Sofa Backs', slug: 'home-decor-living-table-sofa' },
          { name: 'Rugs & Carpets', slug: 'home-decor-living-rugs-carpets' }
        ]
      },
      {
        name: 'Dining',
        slug: 'home-decor-dining',
        subcategories: [
          { name: 'Dinnerware Sets', slug: 'home-decor-dining-dinnerware' },
          { name: 'Plates & Platters', slug: 'home-decor-dining-plates' },
          { name: 'Bowls', slug: 'home-decor-dining-bowls' },
          { name: 'Cups Mugs & Jugs', slug: 'home-decor-dining-cups-mugs' },
          { name: 'Kitchen Accessories', slug: 'home-decor-dining-kitchen' },
          { name: 'Cutlery & Utensils', slug: 'home-decor-dining-cutlery' },
          { name: 'Trays', slug: 'home-decor-dining-trays' },
          { name: 'Tablecloths', slug: 'home-decor-dining-tablecloths' },
          { name: 'Runners', slug: 'home-decor-dining-runners' },
          { name: 'Placemats & Napkins', slug: 'home-decor-dining-placemats' },
          { name: 'Napkin Holders', slug: 'home-decor-dining-napkin-holders' }
        ]
      },
      {
        name: 'Décor',
        slug: 'home-decor-decor',
        subcategories: [
          { name: 'Wall Hangings', slug: 'home-decor-decor-wall-hangings' },
          { name: 'Photo Frames', slug: 'home-decor-decor-photo-frames' },
          { name: 'Brass Novelties', slug: 'home-decor-decor-brass' },
          { name: 'Cast Iron Novelties', slug: 'home-decor-decor-cast-iron' },
          { name: 'Vases', slug: 'home-decor-decor-vases' },
          { name: 'Lamps & Shades', slug: 'home-decor-decor-lamps' },
          { name: 'Candles', slug: 'home-decor-decor-candles' },
          { name: 'Lanterns & Candle Stands', slug: 'home-decor-decor-lanterns' },
          { name: 'Mirrors', slug: 'home-decor-decor-mirrors' },
          { name: 'Wooden Accents', slug: 'home-decor-decor-wooden' },
          { name: 'Boxes', slug: 'home-decor-decor-boxes' },
          { name: 'Dry Flowers & Potpourri', slug: 'home-decor-decor-dry-flowers' }
        ]
      },
      { name: 'Kids Home', slug: 'home-decor-kids-home' },
      {
        name: 'Stationery & Gift Cards',
        slug: 'home-decor-stationery',
        subcategories: [
          { name: 'Aarong Gift Card', slug: 'home-decor-stationery-gift-card' },
          { name: 'Books', slug: 'home-decor-stationery-books' },
          { name: 'Cards', slug: 'home-decor-stationery-cards' },
          { name: 'Notebooks', slug: 'home-decor-stationery-notebooks' },
          { name: 'Folders', slug: 'home-decor-stationery-folders' },
          { name: 'Desk Accessories', slug: 'home-decor-stationery-desk' },
          { name: 'Recycled Paper Products', slug: 'home-decor-stationery-recycled' },
          { name: 'Wrapping Paper', slug: 'home-decor-stationery-wrapping' }
        ]
      },
      {
        name: 'Lawn & Gardening',
        slug: 'home-decor-gardening',
        subcategories: [
          { name: 'Indoor Plants', slug: 'home-decor-gardening-plants' }
        ]
      }
    ]
  },
  {
    name: 'Jewellery',
    slug: 'jewellery',
    image: '/assets/images/cagetory/ArongCategory/d-jewellery-eid2-dept-thum-30-04-2026-sm.webp',
    subcategories: [
      {
        name: 'Earrings',
        slug: 'jewellery-earrings',
        subcategories: [
          { name: 'Pearl', slug: 'jewellery-earrings-pearl' },
          { name: 'Fashion', slug: 'jewellery-earrings-fashion' }
        ]
      },
      {
        name: 'Necklaces',
        slug: 'jewellery-necklaces',
        subcategories: [
          { name: 'Pearl', slug: 'jewellery-necklaces-pearl' },
          { name: 'Fashion', slug: 'jewellery-necklaces-fashion' }
        ]
      },
      {
        name: 'Necklace Sets',
        slug: 'jewellery-necklace-sets',
        subcategories: [
          { name: 'Pearl', slug: 'jewellery-necklace-sets-pearl' },
          { name: 'Fashion', slug: 'jewellery-necklace-sets-fashion' }
        ]
      },
      {
        name: 'Bracelets & Bangles',
        slug: 'jewellery-bracelets-bangles',
        subcategories: [
          { name: 'Pearl', slug: 'jewellery-bracelets-bangles-pearl' },
          { name: 'Fashion', slug: 'jewellery-bracelets-bangles-fashion' }
        ]
      },
      {
        name: 'Rings',
        slug: 'jewellery-rings',
        subcategories: [
          { name: 'Pearl', slug: 'jewellery-rings-pearl' },
          { name: 'Fashion', slug: 'jewellery-rings-fashion' }
        ]
      },
      {
        name: 'Anklets',
        slug: 'jewellery-anklets',
        subcategories: [
          { name: 'Fashion', slug: 'jewellery-anklets-fashion' },
          { name: 'Pearl', slug: 'jewellery-anklets-pearl' }
        ]
      },
      {
        name: 'Lockets & Pendants',
        slug: 'jewellery-lockets-pendants',
        subcategories: [
          { name: 'Pearl', slug: 'jewellery-lockets-pendants-pearl' },
          { name: 'Fashion', slug: 'jewellery-lockets-pendants-fashion' }
        ]
      },
      { name: 'Hair Accessories', slug: 'jewellery-hair-accessories' },
      { name: 'Jewellery Box', slug: 'jewellery-box' }
    ]
  },
  {
    name: 'Skin & Hair',
    slug: 'skin-hair',
    image: '/assets/images/cagetory/ArongCategory/D-AE-Skin-and-Hair-Dept-Thumb-10-05-2026-SM.webp',
    subcategories: [
      { name: 'Summer Glow', slug: 'skin-hair-summer-glow' },
      { name: 'New Arrivals', slug: 'skin-hair-new-arrivals' },
      { name: 'Gift Baskets', slug: 'skin-hair-gift-baskets' },
      { name: 'Handmade Soaps', slug: 'skin-hair-handmade-soaps' },
      { name: 'Body Washes', slug: 'skin-hair-body-washes' },
      { name: 'Body Care', slug: 'skin-hair-body-care' },
      { name: 'Face Washes', slug: 'skin-hair-face-washes' },
      { name: 'Toners', slug: 'skin-hair-toners' },
      { name: 'Lip Balms', slug: 'skin-hair-lip-balms' },
      { name: 'Soothing Gels', slug: 'skin-hair-soothing-gels' },
      { name: 'Body Lotion', slug: 'skin-hair-body-lotion' },
      { name: 'Face Packs', slug: 'skin-hair-face-packs' },
      { name: 'Hair Packs', slug: 'skin-hair-hair-packs' },
      { name: 'Hair & Body Oils', slug: 'skin-hair-hair-body-oils' },
      { name: 'Essential Oils', slug: 'skin-hair-essential-oils' },
      { name: 'Face Masks', slug: 'skin-hair-face-masks' },
      { name: 'Shampoo', slug: 'skin-hair-shampoo' },
      { name: 'Accessories', slug: 'skin-hair-accessories' },
      { name: 'Candles & Diffusers', slug: 'skin-hair-candles-diffusers' },
      { name: 'Scented Candles', slug: 'skin-hair-scented-candles' }
    ]
  },
  {
    name: 'Gifts & Crafts',
    slug: 'gifts-crafts',
    image: '/assets/images/cagetory/ArongCategory/d-gift-crafts-dept-thumb-10-09-2025-sm.webp',
    subcategories: [
      { name: 'Gift Cards', slug: 'gifts-crafts-gift-cards' },
      { name: 'Earth Gift Baskets', slug: 'gifts-crafts-earth-gift-baskets' },
      {
        name: 'Souvenirs',
        slug: 'gifts-crafts-souvenirs',
        subcategories: [
          { name: 'Novelties', slug: 'gifts-crafts-souvenirs-novelties' },
          { name: 'Nakshi Kantha Tapestries', slug: 'gifts-crafts-souvenirs-nakshi-kantha' },
          { name: 'T-Shirts', slug: 'gifts-crafts-souvenirs-t-shirts' },
          { name: 'Traditional Toys & Dolls', slug: 'gifts-crafts-souvenirs-toys-dolls' }
        ]
      },
      { name: 'Books', slug: 'gifts-crafts-books' },
      { name: 'Lawn & Gardening', slug: 'gifts-crafts-lawn-gardening' },
      {
        name: 'Occasions',
        slug: 'gifts-crafts-occasions',
        subcategories: [
          { name: 'Anniversaries', slug: 'gifts-crafts-occasions-anniversaries' },
          { name: 'Baby Showers', slug: 'gifts-crafts-occasions-baby-showers' },
          { name: 'Bridal Showers', slug: 'gifts-crafts-occasions-bridal-showers' },
          { name: 'Farewells', slug: 'gifts-crafts-occasions-farewells' },
          { name: 'Wedding Gifts', slug: 'gifts-crafts-occasions-wedding-gifts' }
        ]
      },
      {
        name: 'Gift Ideas by Price',
        slug: 'gifts-crafts-by-price',
        subcategories: [
          { name: 'Under BDT 1000', slug: 'gifts-crafts-by-price-under-1000' },
          { name: 'BDT 1001 - 3000', slug: 'gifts-crafts-by-price-1001-3000' },
          { name: 'BDT 3001 - 5000', slug: 'gifts-crafts-by-price-3001-5000' },
          { name: 'Above BDT 5000', slug: 'gifts-crafts-by-price-above-5000' }
        ]
      },
      {
        name: 'Textile Crafts',
        slug: 'gifts-crafts-textile',
        subcategories: [
          { name: 'Block Printing', slug: 'gifts-crafts-textile-block' },
          { name: 'Embroidery', slug: 'gifts-crafts-textile-embroidery' },
          { name: 'Jamdani', slug: 'gifts-crafts-textile-jamdani' },
          { name: 'Katan', slug: 'gifts-crafts-textile-katan' },
          { name: 'Nakshi Kantha', slug: 'gifts-crafts-textile-nakshi-kantha' },
          { name: 'Screen Printing', slug: 'gifts-crafts-textile-screen' },
          { name: 'Tie-Dye', slug: 'gifts-crafts-textile-tie-dye' },
          { name: 'Weaving', slug: 'gifts-crafts-textile-weaving' }
        ]
      },
      {
        name: 'Non Textile Crafts',
        slug: 'gifts-crafts-non-textile',
        subcategories: [
          { name: 'Bamboo & Cane', slug: 'gifts-crafts-non-textile-bamboo' },
          { name: 'Candles', slug: 'gifts-crafts-non-textile-candles' },
          { name: 'Rugs & Carpets', slug: 'gifts-crafts-non-textile-rugs' },
          { name: 'Studio Ceramics', slug: 'gifts-crafts-non-textile-ceramics' },
          { name: 'Jewellery', slug: 'gifts-crafts-non-textile-jewellery' },
          { name: 'Leather', slug: 'gifts-crafts-non-textile-leather' },
          { name: 'Metal', slug: 'gifts-crafts-non-textile-metal' },
          { name: 'Natural Fibres', slug: 'gifts-crafts-non-textile-fibres' },
          { name: 'Recycled Handmade Paper', slug: 'gifts-crafts-non-textile-paper' },
          { name: 'Terracotta & Clay', slug: 'gifts-crafts-non-textile-clay' },
          { name: 'Toys & Traditional Dolls', slug: 'gifts-crafts-non-textile-toys' },
          { name: 'Wood', slug: 'gifts-crafts-non-textile-wood' }
        ]
      }
    ]
  },
  {
    name: 'Wedding',
    slug: 'wedding',
    image: '/assets/images/cagetory/ArongCategory/200-8-D-aarong-wedding-dept-thumb-19-07-2025.webp',
    subcategories: [
      {
        name: 'Women',
        slug: 'wedding-women',
        subcategories: [
          { name: 'Saree', slug: 'wedding-women-saree' },
          { name: 'Shalwar Kameez', slug: 'wedding-women-shalwar-kameez' },
          { name: 'Purses & Batua', slug: 'wedding-women-purses-batua' }
        ]
      },
      {
        name: 'Men',
        slug: 'wedding-men',
        subcategories: [
          { name: 'Panjabi', slug: 'wedding-men-panjabi' },
          { name: 'Coaty', slug: 'wedding-men-coaty' }
        ]
      },
      {
        name: 'Home Décor',
        slug: 'wedding-home-decor',
        subcategories: [
          { name: 'Living', slug: 'wedding-home-decor-living' },
          { name: 'Dining', slug: 'wedding-home-decor-dining' },
          { name: 'Décor', slug: 'wedding-home-decor-decor' }
        ]
      },
      {
        name: 'Jewellery',
        slug: 'wedding-jewellery',
        subcategories: [
          { name: 'Pearl', slug: 'wedding-jewellery-pearl' },
          { name: 'Fashion', slug: 'wedding-jewellery-fashion' }
        ]
      },
      { name: 'Skin & Hair', slug: 'wedding-skin-hair' },
      { name: 'Aarong Gift Card', slug: 'wedding-gift-card' }
    ]
  }
];

async function seedCategory(node, parentId = null) {
  const created = await Category.create({
    name: node.name,
    slug: node.slug,
    parentCategory: parentId,
    image: node.image || null,
    isActive: true,
  });
  console.log(`Created: ${created.name} (${created.slug})`);
  if (node.subcategories && node.subcategories.length > 0) {
    for (const sub of node.subcategories) {
      await seedCategory(sub, created._id);
    }
  }
}

async function seed() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB successfully.');

    // Clear existing categories
    const deleteResult = await Category.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing categories.`);

    // Insert new hierarchy
    for (const mainCat of categoryHierarchy) {
      await seedCategory(mainCat, null);
    }
    console.log(`Seeding completed successfully!`);

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

seed();
