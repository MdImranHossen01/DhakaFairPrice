const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const faqsData = [
  {
    question: 'How do I place an order on Swapnobaz?',
    answer: 'To place an order, browse our collection, select your preferred size or color variant, and click "Add to Cart" or "Buy Now". Proceed to the checkout page, enter your delivery address and contact number, choose your payment method (Cash on Delivery or Mobile Banking), and confirm your order.',
    order: 1,
    isActive: true,
    resellerId: null
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept Cash on Delivery (COD) nationwide throughout Bangladesh, as well as secure instant digital payments via bKash, Nagad, Rocket, and Visa/MasterCard debit/credit cards.',
    order: 2,
    isActive: true,
    resellerId: null
  },
  {
    question: 'How long does delivery take and what are the shipping fees?',
    answer: 'Inside Dhaka, deliveries are completed within 24–48 hours (standard charge: ৳60). Outside Dhaka delivery takes 2–4 business days (charge: ৳120). We also offer free delivery promotions on orders meeting the minimum order threshold.',
    order: 3,
    isActive: true,
    resellerId: null
  },
  {
    question: 'How can I track my shipment?',
    answer: 'You can track your order in real-time by visiting our Order Tracking page (/track-order) and entering your Order ID and phone number. You will also receive automated SMS notifications as your package is dispatched.',
    order: 4,
    isActive: true,
    resellerId: null
  },
  {
    question: 'What is your return and refund policy?',
    answer: 'We offer a hassle-free 7-day return and exchange policy. If an item is damaged, defective, or incorrectly sized upon delivery, contact our support team with your order details to arrange an immediate replacement or refund.',
    order: 5,
    isActive: true,
    resellerId: null
  },
  {
    question: 'What is the Swapnobaz Reseller Program?',
    answer: 'The Swapnobaz Reseller Program allows entrepreneurs to start their own online dropshipping business with zero capital. You get your own branded storefront and custom domain to sell quality products at your own prices, while Swapnobaz handles inventory, packaging, and courier delivery.',
    order: 6,
    isActive: true,
    resellerId: null
  },
  {
    question: 'How do I register as a reseller?',
    answer: 'Joining as a reseller is 100% free with no membership fees. Simply visit /reseller/register, fill in your store name, subdomain, and contact details, and submit your registration to get started right away.',
    order: 7,
    isActive: true,
    resellerId: null
  },
  {
    question: 'How do resellers receive their profit payouts?',
    answer: 'Whenever an order placed through your reseller store is successfully delivered to the customer, your profit margin is credited instantly to your Reseller Wallet. You can withdraw your earnings anytime directly to your bKash, Nagad, or Bank account.',
    order: 8,
    isActive: true,
    resellerId: null
  },
  {
    question: 'Are all products authentic and quality checked?',
    answer: 'Yes! All items listed in our catalog are directly sourced from verified manufacturers and undergo comprehensive quality checks prior to shipment to ensure complete customer satisfaction.',
    order: 9,
    isActive: true,
    resellerId: null
  },
  {
    question: 'How can I contact customer support?',
    answer: 'Our customer support team is available 6 days a week (9:00 AM to 10:00 PM). You can reach us via our Contact Us page (/contact), email us at support@swapnobaz.com, or call our direct customer helpline.',
    order: 10,
    isActive: true,
    resellerId: null
  }
];

async function seed() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/swapnobaz';
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    await db.collection('faqs').deleteMany({ resellerId: null });
    const result = await db.collection('faqs').insertMany(
      faqsData.map(f => ({ ...f, createdAt: new Date(), updatedAt: new Date() }))
    );
    console.log('Successfully seeded FAQs count:', result.insertedCount);
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
