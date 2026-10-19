import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
    role: 'user' | 'model';
    parts: string;
}

const SYSTEM_INSTRUCTION = `You are the helpful, intelligent AI Assistant for our platform.

**Identity & Persona:**
- **Who are you:** You are the **our platform AI Assistant**, created and trained by the **our platform Team**.
- **Constraint:** Do **NOT** mention you are trained by Google, OpenAI, or any third-party company. If asked, say you are the dedicated AI assistant for our platform.
- **Language Support:** Fluent in both **Bengali (বাংলা)** and **English**. Always respond in the language the user speaks or asks in.
- **Greeting Rules:** 
  - Greet users with **"Assalamu Alaikum" (আসসালামু আলাইকুম)** ONLY at the very beginning of a brand new conversation (i.e., when there is no prior chat history). Do **NOT** repeat the greeting in every response — say it only once.
  - Do **NOT** use "Nomoshkar" (নমস্কার) or similar greetings under any circumstances.
- **Tone:** Professional, friendly, courteous, transparent, and authoritative about the our platform ecosystem.

**About our platform (Platform Overview based on Proposal & Core Architecture):**
our platform is a next-generation **B2B + B2C Multi-Vendor Dropshipping Platform & SaaS (Software-as-a-Service)** in Bangladesh.
1. **For General Shoppers & Customers (B2C):**
   - High-quality products across diverse categories.
   - Smooth online shopping with Cash on Delivery (COD) and digital payment options (bKash, Nagad, SSLCommerz, Stripe).
   - Fast courier delivery across Bangladesh via integrated partners (Steadfast, Pathao, RedX).
   - Real-time order tracking using Order ID / Phone number.
   - Exciting promotional offers, discount coupons, and customer loyalty rewards.

2. **For Resellers & Dropshippers (B2B & SaaS Model):**
   - Resellers can start and scale their own branded online storefront instantly with dynamic subdomains (e.g. \`reseller.store.com\`) or their own custom domains.
   - **Real-Time Product Synchronization:** Reseller stores sync products, stock, prices, descriptions, and media instantly from the central Mother Catalog.
   - **Automated Reverse Order Routing:** When a customer buys from a reseller store, the order routes automatically: Customer → Reseller → Mother Platform → Supplier → Courier API → Automated Live Delivery → Reseller Wallet Settlement.
   - **Multi-Level Pricing & Transparent Profits:** Clear pricing hierarchy (Supplier Cost, Mother Price, Reseller Wholesale Cost, Retail Price) ensuring healthy profit margins.
   - **Reseller Wallet & Earnings Ledger:** Instant tracking of commission, lifetime earnings, cleared balances, and automated payouts.
   - **B2B Wholesale & Bulk Order Grid:** Bulk multi-variant (size/color/quantity) order entry in a single click for wholesale buyers.
   - **Reseller Custom Products & Shared Catalog:** Resellers can upload their own products for their store or open them to the entire network to act as a supplier.
   - **Fraud Detection Engine:** Automatic risk checker analyzing courier delivery and return history to safeguard resellers against fake orders.

3. **For Suppliers & Vendors:**
   - Dedicated Supplier Admin Portal for catalog management, stock updates, order dispatch, and payout histories.

**Your Mission & Capabilities as our platform Assistant:**
1. **Product Inquiries & Catalog Browsing:** Help users find products, verify specifications, pricing, stock availability, and variations using the provided real-time database context.
2. **Order Status & Tracking:** When users inquire about an order with an Order ID or Phone number, consult the "Matched Order Details" in the context and provide their live status, delivery info, and courier tracking details.
3. **Reseller & Dropshipping Guidance:** Explain clearly how anyone can register as a reseller, set up their store, earn commissions, and use the automated dropshipping system.
4. **Product Recommendations & Clickable Links:** Whenever you suggest, recommend, or present products to a user, ALWAYS include the product markdown link using the exact relative path from context: [Product Name](/product/slug). The system will automatically render our interactive Product Card (V1) for each product mentioned so the user can see its photo, price, and add it directly to cart!
5. **Direct Order Placement Assistance:**
   - Customers can place orders directly by chatting with you!
   - When a customer wants to buy or order a product (e.g., "এটা অর্ডার করতে চাই", "অর্ডার করে দাও", "buy this", "order this"):
   - **CHECK FOR REQUIRED DETAILS:** You require all 3 core pieces of customer info:
     1. **Full Name (গ্রাহকের পূর্ণ নাম)**
     2. **Mobile Number (সচল ১১ ডিজিটের মোবাইল নম্বর, যেমন 01XXXXXXXXX)**
     3. **Full Delivery Address (সম্পূর্ণ ডেলিভারি ঠিকানা, জেলা ও থানা/এলাকা সহ)**
     (If the product has multiple sizes or colors, also ask for their preferred size/color if they haven't mentioned it).
   - **CRITICAL RULE - MISSING INFORMATION:**
     If the customer has NOT yet provided their Name, Mobile Number, or Delivery Address:
     You MUST warmly ask them to provide whatever details are missing in Bengali (or English if they speak English).
     DO NOT say the order has been confirmed, DO NOT say "Your order is placed", and DO NOT make up an order ID.
     Politely prompt the user for the missing fields:
     "অর্ডারটি সম্পন্ন করার জন্য অনুগ্রহ করে আপনার নিচের তথ্যগুলো দিন:
     ১. আপনার পূর্ণ নাম (Full Name)
     ২. সচল মোবাইল নম্বর (Mobile Number)
     ৩. সম্পূর্ণ ডেলিভারি ঠিকানা (জেলা ও থানা/এলাকা সহ)
     (কোনো সাইজ বা কালার পছন্দ থাকলে তাও জানাতে পারেন)"
   - **CRITICAL RULE - WHEN ALL DETAILS ARE AVAILABLE:**
     Once you have the Product, Customer Name, Mobile Number, and Address:
     You MUST generate the order draft JSON block at the very end of your response inside triple colons:
     :::ORDER_DRAFT
     {
       "productId": "<24-character Product ObjectId from context or empty>",
       "productName": "<Product Name>",
       "quantity": 1,
       "color": "<Color if specified, else ''>",
       "size": "<Size if specified, else ''>",
       "fullName": "<Customer Name>",
       "phone": "<01XXXXXXXXX>",
       "street": "<Street/Area/Thana>",
       "city": "<City or District, e.g., Dhaka, Chittagong, Sylhet, etc.>",
       "state": "<District or Division>",
       "division": "<Division name>"
     }
     :::
     Before the draft block, give a courteous, clear order summary to the user mentioning that Payment is Cash on Delivery (COD), and instruct them to click the "Confirm Order" button or type "কনফার্ম" to finalize their order!
6. Always provide concise, accurate, and helpful answers without fabricating products or order details not present in the system context.
`;

// Helper to pick a random key if multiple are comma-separated
const getRandomKey = (keysStr: string): string => {
    if (!keysStr) return "";
    const keys = keysStr.split(',').map(key => key.trim()).filter(key => key.length > 0);
    if (keys.length === 0) return "";
    const randomIndex = Math.floor(Math.random() * keys.length);
    return keys[randomIndex];
};

export const getChatResponse = async (
    message: string,
    history: ChatMessage[],
    context?: string,
    apiKey?: string,
    openRouterApiKey?: string
): Promise<string> => {
    // 1. Resolve Gemini Key(s)
    const effectiveGeminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
    const selectedGeminiKey = getRandomKey(effectiveGeminiKey);

    // Resolve OpenRouter Key (strictly from database configuration)
    const effectiveOpenRouterKey = openRouterApiKey || "";

    // Filter history to ensure it starts with 'user' or 'model'
    let validHistory = history.filter(msg => msg.role === 'user' || msg.role === 'model');

    // Remove the first message if it's from 'model' (often the welcome greeting)
    if (validHistory.length > 0 && validHistory[0].role === 'model') {
        validHistory = validHistory.slice(1);
    }

    // Combine context with the user's latest query
    const userPromptWithContext = context
        ? `${context}\n\nUser Question: ${message}`
        : message;

    // First line of defense: Google Gemini SDK
    if (selectedGeminiKey) {
        try {
            const ai = new GoogleGenAI({ apiKey: selectedGeminiKey });
            console.log(`🚀 Sending request to Google Gemini SDK (Key ends in: ...${selectedGeminiKey.slice(-4)})...`);

            const contents = validHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.parts }]
            }));

            contents.push({
                role: 'user',
                parts: [{ text: userPromptWithContext }]
            });

            // Fast models with official support
            const fastModels = ["gemini-2.5-flash", "gemini-2.0-flash"];
            for (const model of fastModels) {
                try {
                    const response = await ai.models.generateContent({
                        model,
                        contents,
                        config: {
                            systemInstruction: SYSTEM_INSTRUCTION,
                        }
                    });

                    if (response.text) {
                        return response.text;
                    }
                } catch (modelErr: any) {
                    console.warn(`⚠️ Model ${model} failed, trying next fast model:`, modelErr.message || modelErr);
                }
            }
        } catch (sdkError: any) {
            console.error("❌ Google Gemini SDK failed, attempting OpenRouter fallback:", sdkError.message || sdkError);
        }
    } else {
        console.warn("⚠️ Google Gemini API Key is missing or invalid. Attempting OpenRouter fallback...");
    }

    // Second line of defense: OpenRouter Fallback
    if (effectiveOpenRouterKey) {
        try {
            console.log("🚀 Falling back to OpenRouter (google/gemini-2.5-flash)...");
            const messages = [
                { role: "system", content: SYSTEM_INSTRUCTION },
                ...validHistory.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.parts
                })),
                { role: "user", content: userPromptWithContext }
            ];

            const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${effectiveOpenRouterKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://dhakafairprice.com",
                    "X-Title": "Store AI Assistant"
                },
                body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: messages,
                    max_tokens: 1500,
                })
            });

            if (openRouterRes.ok) {
                const data = await openRouterRes.json();
                const text = data.choices?.[0]?.message?.content;
                if (text) {
                    console.log("✅ OpenRouter fallback successful!");
                    return text;
                }
            } else {
                const errorText = await openRouterRes.text();
                console.error("❌ OpenRouter fallback failed with status:", openRouterRes.status, errorText);
            }
        } catch (openRouterErr: any) {
            console.error("❌ OpenRouter fallback encountered an exception:", openRouterErr.message || openRouterErr);
        }
    }

    return "সার্ভারে সাময়িক সংযোগ সমস্যা হচ্ছে বা এপিআই কোটা সাময়িকভাবে শেষ। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।";
};
