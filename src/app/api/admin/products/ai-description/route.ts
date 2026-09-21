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
    const { name, category, features } = body;

    if (!name) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    await dbConnect();
    const settings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean();
    const apiKey = settings?.aiConfig?.geminiApiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API Key is not configured in System Design settings.' }, { status: 503 });
    }

    // Handle comma-separated keys if any
    const selectedKey = apiKey.split(',')[0].trim();

    const ai = new GoogleGenAI({ apiKey: selectedKey });
    const prompt = `Write a premium, engaging, and detailed product description for a product named "${name}"${category ? ` in the category "${category}"` : ''}.${features ? ` Highlight the following features: ${features}.` : ''} Output ONLY the formatted HTML description (using clean tags like <p>, <ul>, <li>, <strong>) and nothing else. No markdown block formatting, no preamble.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const description = response.text || '';
    return NextResponse.json({ description });
  } catch (error: any) {
    console.error('[AI Description Endpoint Error]', error);
    return NextResponse.json({ error: 'Failed to generate description' }, { status: 500 });
  }
}
