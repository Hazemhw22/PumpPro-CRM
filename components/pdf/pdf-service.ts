// Simple HTML to PDF converter using Puppeteer
async function htmlToPdfBuffer(html: string): Promise<Uint8Array> {
    try {
        const puppeteerMod = await import('puppeteer');
        const puppeteer: any = (puppeteerMod as any).default || puppeteerMod;

        console.log('[PDFService] Launching Puppeteer...');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        await page.setContent(html, { waitUntil: 'networkidle0' });
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for images

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20mm', right: '16mm', bottom: '20mm', left: '16mm' },
        });

        await page.close();
        await browser.close();

        console.log('[PDFService] PDF generated successfully');
        return new Uint8Array(pdfBuffer);
    } catch (e) {
        console.error('[PDFService] Puppeteer failed:', String(e));
        throw e;
    }
}

// Create minimal text-only PDF
function createMinimalPdf(text: string): Uint8Array {
    const sanitizedText = text.slice(0, 2000).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const encoder = new TextEncoder();
    const header = '%PDF-1.4\n';
    const streamContent = `BT /F1 12 Tf 50 750 Td (${sanitizedText}) Tj ET`;
    const streamBytes = encoder.encode(streamContent);

    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n';
    const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
    const obj4Prefix = `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`;
    const obj4Suffix = '\nendstream\nendobj\n';
    const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

    const parts: Uint8Array[] = [];
    parts.push(encoder.encode(header));

    const offsets: number[] = [];
    let cursor = header.length;

    const addObj = (s: string | Uint8Array) => {
        const bytes = typeof s === 'string' ? encoder.encode(s) : s;
        parts.push(bytes);
        cursor += bytes.length;
    };

    offsets.push(cursor);
    addObj(obj1);
    offsets.push(cursor);
    addObj(obj2);
    offsets.push(cursor);
    addObj(obj3);
    offsets.push(cursor);
    addObj(obj4Prefix);
    addObj(streamBytes);
    addObj(obj4Suffix);
    offsets.push(cursor);
    addObj(obj5);

    const xrefStart = cursor;
    const xrefHeader = `xref\n0 6\n`;
    const freeEntry = '0000000000 65535 f \n';
    const pad = (n: number) => String(n).padStart(10, '0');
    const xrefEntries = offsets.map((o) => `${pad(o)} 00000 n \n`).join('');
    const xref = xrefHeader + freeEntry + xrefEntries;
    const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    addObj(xref);
    addObj(trailer);

    const totalLength = parts.reduce((sum: number, u: Uint8Array) => sum + u.length, 0);
    const out = new Uint8Array(totalLength);
    let pos = 0;
    for (const u of parts) {
        out.set(u, pos);
        pos += u.length;
    }
    return out;
}

export class PDFService {
    private static instance: PDFService | null = null;

    static getInstance(): PDFService {
        if (!PDFService.instance) {
            PDFService.instance = new PDFService();
        }
        return PDFService.instance;
    }

    async generateContractPDF({ contractHtml }: { contractHtml: string }): Promise<Uint8Array> {
        try {
            console.log('[PDFService] Starting PDF generation from HTML...');
            return await htmlToPdfBuffer(contractHtml);
        } catch (e) {
            console.error('[PDFService] PDF generation failed, using fallback:', String(e));

            // Fallback: create minimal text-only PDF
            try {
                const noTags = contractHtml
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ');
                const collapsed = noTags.replace(/\s+/g, ' ').trim();
                const text = collapsed.slice(0, 4000) || 'Document';
                console.log('[PDFService] Creating fallback PDF with text excerpt...');
                return createMinimalPdf(text);
            } catch (fallbackErr) {
                console.error('[PDFService] Fallback also failed:', String(fallbackErr));
                // Create absolutely minimal PDF
                return createMinimalPdf('Error generating PDF. Check logs.');
            }
        }
    }
}
