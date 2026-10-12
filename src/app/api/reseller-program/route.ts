import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/db';
import ResellerProgramPage from '@/models/ResellerProgramPage';
import { DEFAULT_RESELLER_PROGRAM_DATA } from '@/lib/default-reseller-program';
import { auth } from '@/auth';

export async function GET() {
  try {
    await connectToDatabase();
    const doc = await ResellerProgramPage.findOne().sort({ updatedAt: -1 }).lean();

    if (!doc) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_RESELLER_PROGRAM_DATA,
        isDefault: true,
      });
    }

    // Merge defaults with doc to guarantee all sections exist
    const heroBenefits =
      doc.hero?.benefits && Array.isArray(doc.hero.benefits) && doc.hero.benefits.length > 0
        ? doc.hero.benefits
        : DEFAULT_RESELLER_PROGRAM_DATA.hero.benefits;

    const mergedData = {
      hero: {
        ...DEFAULT_RESELLER_PROGRAM_DATA.hero,
        ...(doc.hero || {}),
        benefits: heroBenefits,
      },
      pricingHeader: { ...DEFAULT_RESELLER_PROGRAM_DATA.pricingHeader, ...(doc.pricingHeader || {}) },
      packages: doc.packages?.length ? doc.packages : DEFAULT_RESELLER_PROGRAM_DATA.packages,
      whyChooseUs: { ...DEFAULT_RESELLER_PROGRAM_DATA.whyChooseUs, ...(doc.whyChooseUs || {}) },
      workflow: { ...DEFAULT_RESELLER_PROGRAM_DATA.workflow, ...(doc.workflow || {}) },
      comparisonTable: { ...DEFAULT_RESELLER_PROGRAM_DATA.comparisonTable, ...(doc.comparisonTable || {}) },
      faqs: { ...DEFAULT_RESELLER_PROGRAM_DATA.faqs, ...(doc.faqs || {}) },
      importantInfo: { ...DEFAULT_RESELLER_PROGRAM_DATA.importantInfo, ...(doc.importantInfo || {}) },
    };

    return NextResponse.json({
      success: true,
      data: mergedData,
      updatedAt: doc.updatedAt,
      isDefault: false,
    });
  } catch (error: any) {
    console.error('Error fetching reseller program data:', error);
    return NextResponse.json(
      { success: false, data: DEFAULT_RESELLER_PROGRAM_DATA, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const userRole = (session?.user as any)?.role;
    const userEmail = session?.user?.email?.toLowerCase();

    const isAdminOrSuperAdmin =
      userRole === 'admin' ||
      userRole === 'super_admin' ||
      userEmail === 'imranshuvo101@gmail.com';

    if (!isAdminOrSuperAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin or Super Admin permission required.' },
        { status: 401 }
      );
    }

    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid payload.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let doc = await ResellerProgramPage.findOne().sort({ updatedAt: -1 });

    const updatePayload: Record<string, any> = {
      updatedBy: userEmail || userRole || 'admin',
    };

    if (body.hero !== undefined) updatePayload.hero = body.hero;
    if (body.pricingHeader !== undefined) updatePayload.pricingHeader = body.pricingHeader;
    if (body.packages !== undefined) updatePayload.packages = body.packages;
    if (body.whyChooseUs !== undefined) updatePayload.whyChooseUs = body.whyChooseUs;
    if (body.workflow !== undefined) updatePayload.workflow = body.workflow;
    if (body.comparisonTable !== undefined) updatePayload.comparisonTable = body.comparisonTable;
    if (body.faqs !== undefined) updatePayload.faqs = body.faqs;
    if (body.importantInfo !== undefined) updatePayload.importantInfo = body.importantInfo;

    if (doc) {
      Object.assign(doc, updatePayload);
      await doc.save();
    } else {
      const fullDoc = {
        hero: updatePayload.hero || DEFAULT_RESELLER_PROGRAM_DATA.hero,
        pricingHeader: updatePayload.pricingHeader || DEFAULT_RESELLER_PROGRAM_DATA.pricingHeader,
        packages: updatePayload.packages || DEFAULT_RESELLER_PROGRAM_DATA.packages,
        whyChooseUs: updatePayload.whyChooseUs || DEFAULT_RESELLER_PROGRAM_DATA.whyChooseUs,
        workflow: updatePayload.workflow || DEFAULT_RESELLER_PROGRAM_DATA.workflow,
        comparisonTable: updatePayload.comparisonTable || DEFAULT_RESELLER_PROGRAM_DATA.comparisonTable,
        faqs: updatePayload.faqs || DEFAULT_RESELLER_PROGRAM_DATA.faqs,
        importantInfo: updatePayload.importantInfo || DEFAULT_RESELLER_PROGRAM_DATA.importantInfo,
        updatedBy: updatePayload.updatedBy,
      };
      doc = await ResellerProgramPage.create(fullDoc);
    }

    revalidatePath('/reseller-program');
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: 'Reseller program content successfully saved!',
      data: doc,
    });
  } catch (error: any) {
    console.error('Error saving reseller program data:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const PATCH = POST;
