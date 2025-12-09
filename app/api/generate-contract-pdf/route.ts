import { NextResponse } from 'next/server';
import { PDFService } from '@/components/pdf/pdf-service';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf';

export const runtime = 'nodejs';

/**
 * إصلاح روابط الصور لكي يتمكن Puppeteer على Vercel من تحميلها
 */
function fixImageUrls(html: string) {
    let base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || 'http://localhost:3000';

    base = base.replace(/\/$/, ''); // إزالة / الأخير إذا موجود

    return html.replace(/src="\//g, `src="${base}/`);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const pdfData = body?.pdfData;
        const docType = body?.docType as 'invoice' | 'receipt' | undefined;

        console.log(
            '[generate-contract-pdf] received pdfData.services length=',
            Array.isArray(pdfData?.services) ? pdfData.services.length : 'N/A',
            'pdfData.booking_services length=',
            Array.isArray(pdfData?.booking_services) ? pdfData.booking_services.length : 'N/A',
            'pdfData.no_price=',
            pdfData?.no_price,
        );

        // Log all services details for debugging
        if (Array.isArray(pdfData?.services)) {
            console.log(
                '[generate-contract-pdf] services details:',
                pdfData.services.map((s: any) => ({ name: s.name, qty: s.quantity })),
            );
        }
        if (Array.isArray(pdfData?.booking_services)) {
            console.log(
                '[generate-contract-pdf] booking_services details:',
                pdfData.booking_services.map((s: any) => ({ name: s.name, qty: s.quantity })),
            );
        }

        let html: string | null = null;

        if (pdfData) {
            const data = { ...pdfData, doc_type: docType || 'receipt' };
            html = await InvoiceDealPDFGenerator.generateHTML(data);

            console.log('[generate-contract-pdf] generated HTML length=', html ? html.length : 0);
        } else {
            const contractHtml: string | undefined = body?.contractHtml;
            if (!contractHtml || typeof contractHtml !== 'string') {
                return NextResponse.json({ error: 'Missing contractHtml or pdfData in request' }, { status: 400 });
            }
            html = contractHtml;
        }

        // إذا طلب المستخدم معاينة HTML
        if (body?.preview === true) {
            return new Response(html || '', {
                status: 200,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        html = fixImageUrls(html);
        console.log('[generate-contract-pdf] After fixImageUrls');

        const filename: string = body?.filename || `contract-${Date.now()}.pdf`;

        try {
            const pdfBytes = await PDFService.getInstance().generateContractPDF({ contractHtml: html });

            return new Response(pdfBytes as any, {
                status: 200,
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                },
            });
        } catch (renderErr) {
            console.error('[generate-contract-pdf] PDF rendering error:', renderErr);
            return NextResponse.json({ error: String((renderErr as any)?.message || renderErr) }, { status: 500 });
        }
    } catch (err: any) {
        console.error('[generate-contract-pdf] unexpected error:', err);
        return NextResponse.json({ error: String((err as any)?.message || err) }, { status: 400 });
    }
}
