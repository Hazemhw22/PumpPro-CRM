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

// Create minimal text-only PDF with better content extraction
function createMinimalPdf(text: string): Uint8Array {
    // Extract more structured content from HTML - split by common delimiters
    let content = text;

    // Remove common HTML tags to get better readability
    content = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, ' ');

    // Clean up excessive whitespace
    content = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n');

    // Ensure we don't exceed PDF content limits
    const lines = content.split('\n');
    const maxLinesPerPage = 35; // Roughly 35 lines per page for 12pt font

    // Take first 3 pages worth of content
    const contentLines = lines.slice(0, maxLinesPerPage * 3);
    const finalContent = contentLines.join('\n');

    const sanitizedText = finalContent.slice(0, 3000).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

    const encoder = new TextEncoder();
    const header = '%PDF-1.4\n';

    // Build multi-line content stream
    let yPosition = 750;
    let streamContent = 'BT /F1 11 Tf 40 ' + yPosition + ' Td\n';

    const textLines = sanitizedText.split('\n').slice(0, maxLinesPerPage * 3);
    for (const line of textLines) {
        const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').slice(0, 90); // Max chars per line

        streamContent += `(${escaped}) Tj\n`;
        streamContent += '0 -15 Td\n'; // Move down 15 points for next line
    }

    streamContent += 'ET';
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

interface PDFGenerationOptions {
    filename?: string;
    format?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margins?: {
        top?: string;
        right?: string;
        bottom?: string;
        left?: string;
    };
    displayHeaderFooter?: boolean;
    headerTemplate?: string;
    footerTemplate?: string;
    printBackground?: boolean;
    scale?: number;
}

interface ContractPDFOptions extends PDFGenerationOptions {
    contractHtml: string;
    baseUrl?: string;
}

interface LogsPDFOptions extends PDFGenerationOptions {
    html: string;
    baseUrl?: string;
}

export class PDFService {
    private static instance: PDFService;

    private constructor() {}

    static getInstance(): PDFService {
        if (!PDFService.instance) {
            PDFService.instance = new PDFService();
        }
        return PDFService.instance;
    }

    async generateContractPDF(options: ContractPDFOptions): Promise<Uint8Array> {
        const { contractHtml } = options;

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

    async generateLogsPDF(options: LogsPDFOptions): Promise<Uint8Array> {
        const { html } = options;

        try {
            console.log('[PDFService] Starting PDF generation from HTML...');
            return await htmlToPdfBuffer(html);
        } catch (e) {
            console.error('[PDFService] PDF generation failed, using fallback:', String(e));

            // Fallback: create minimal text-only PDF
            try {
                const noTags = html
                    .replace(/<script[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ');
                const collapsed = noTags.replace(/\s+/g, ' ').trim();
                const text = collapsed.slice(0, 4000) || 'Document';
                console.log('[PDFService] Creating fallback PDF with text excerpt...');
                return createMinimalPdf(text);
            } catch (fallbackErr) {
                console.error('[PDFService] Fallback also failed:', String(fallbackErr));
                return createMinimalPdf('Error generating PDF. Check logs.');
            }
        }
    }

    async generateFromContract(contractData: any): Promise<Uint8Array> {
        // This is a placeholder - you should implement the actual contract HTML generation
        const contractHtml = `
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        .contract { padding: 20px; }
                    </style>
                </head>
                <body>
                    <div class="contract">
                        <h1>Contract</h1>
                        <p>Contract details would go here...</p>
                    </div>
                </body>
            </html>
        `;

        return this.generateContractPDF({ contractHtml });
    }

    async cleanup(): Promise<void> {
        // Cleanup handled by each call since we create/close browser for each PDF
        console.log('[PDFService] Cleanup completed');
    }
}
