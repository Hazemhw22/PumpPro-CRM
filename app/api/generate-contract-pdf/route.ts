import { NextResponse } from 'next/server';
import { PDFService } from '@/components/pdf/pdf-service';
import { InvoiceDealPDFGenerator } from '@/components/pdf/invoice-deal-pdf';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const pdfData = body?.pdfData;
        const docType = body?.docType as 'invoice' | 'receipt' | undefined;

        let html: string | null = null;

        if (pdfData) {
            const data = { ...pdfData, doc_type: docType || 'receipt' };
            html = await InvoiceDealPDFGenerator.generateHTML(data);
        } else {
            const contractHtml: string | undefined = body?.contractHtml;
            if (!contractHtml || typeof contractHtml !== 'string') {
                return NextResponse.json({ error: 'Missing contractHtml or pdfData in request' }, { status: 400 });
            }
            html = contractHtml;
        }

        const filename: string = body?.filename || `contract-${Date.now()}.pdf`;
        const pdfBytes = await PDFService.getInstance().generateContractPDF({ contractHtml: html });

        return new Response(pdfBytes as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }
}
