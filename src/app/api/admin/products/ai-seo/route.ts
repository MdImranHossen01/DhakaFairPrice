import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !['admin', 'super_admin', 'manager', 'reseller'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, descriptionText } = body;

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    await dbConnect();
    const settings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean();
    const apiKey = settings?.aiConfig?.geminiApiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is not configured in System Design settings.' }, { status: 503 });
    }

    const selectedKey = apiKey.split(',')[0].trim();
    const ai = new GoogleGenAI({ apiKey: selectedKey });

    const prompt = `Based on the product name "${name}" and description text "${descriptionText || ''}", generate optimized SEO parameters. You must respond with a valid JSON object ONLY. Do not include markdown code block formatting (such as \`\`\`json). The JSON object must have exactly these keys:
- "metaTitle": string (Max 60 chars)
- "metaDescription": string (Max 160 chars)
- "tags": array of strings (SEO keywords/tags, min 5)
- "faqs": array of objects, where each object has "question" (string) and "answer" (string) keys (FAQ list, min 2)

Example output:
{"metaTitle": "Title Here", "metaDescription": "Description Here", "tags": ["tag1", "tag2"], "faqs": [{"question": "Q?", "answer": "A"}]}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text || '{}';
    // Clean potential markdown output
    const cleanJsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonText);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AI SEO Endpoint Error]', error);
    return NextResponse.json({ error: 'Failed to generate SEO parameters' }, { status: 500 });
  }
}
