import chromium from '@sparticuz/chromium';

export class PDFService {
    private static instance: PDFService | null = null;

    static getInstance(): PDFService {
        if (!PDFService.instance) {
            PDFService.instance = new PDFService();
        }
        return PDFService.instance;
    }

    // Primary: render HTML to PDF using Puppeteer; Fallback: minimal text-only PDF
    async generateContractPDF({ contractHtml }: { contractHtml: string }): Promise<Uint8Array> {
        // Try using Puppeteer for full-fidelity rendering
        try {
            const puppeteerMod = await import('puppeteer');
            const puppeteer: any = (puppeteerMod as any).default || puppeteerMod;

            let browser: any;

            // On Vercel use @sparticuz/chromium for a compatible headless Chrome binary
            if (process.env.VERCEL) {
                const executablePath = await chromium.executablePath();
                console.log('[PDFService] Vercel detected. Chromium executablePath=', executablePath);
                browser = await puppeteer.launch({
                    args: (chromium as any).args,
                    defaultViewport: (chromium as any).defaultViewport,
                    executablePath: executablePath || undefined,
                    headless: (chromium as any).headless,
                });
            } else {
                // Local / non-serverless environments can use the default Puppeteer Chrome
                console.log('[PDFService] Local environment. Launching Puppeteer default Chrome.');
                browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                });
            }

            const page = await browser.newPage();
            await page.emulateMediaType('screen');

            // Attach handlers to surface renderer console messages and network failures
            try {
                page.on('console', (msg: any) => {
                    try {
                        const args = msg.args();
                        Promise.all(args.map((a: any) => a.jsonValue?.() || a.toString()))
                            .then((vals) => {
                                console.log('[PDFPage Console]', msg.type(), ...vals);
                            })
                            .catch(() => console.log('[PDFPage Console]', msg.type(), msg.text()));
                    } catch (e) {
                        console.log('[PDFPage Console] (failed to read args)', msg.text());
                    }
                });

                page.on('requestfailed', (req: any) => {
                    console.log('[PDFPage Request Failed]', req.url(), req.failure && req.failure().errorText);
                });

                page.on('response', (res: any) => {
                    try {
                        const status = res.status();
                        const url = res.url();
                        if (status >= 400) console.log('[PDFPage Response Error]', status, url);
                    } catch (e) {
                        // ignore
                    }
                });
            } catch (e) {
                console.log('[PDFService] Failed to attach page listeners', String(e));
            }

            // Set content and wait for network idle, then a short extra wait to allow images to decode
            await page.setContent(contractHtml, { waitUntil: 'networkidle0' });
            // Extra safety wait for resources like images/fonts to finish loading/decoding
            try {
                await page.waitForTimeout(500);
            } catch {}

            const pdfBuffer: Buffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '20mm', right: '16mm', bottom: '20mm', left: '16mm' },
            });
            await browser.close();
            return new Uint8Array(pdfBuffer);
        } catch (e) {
            // Fallback minimal PDF generation (text only) to ensure the route works
            const text = this.extractText(contractHtml) || 'Document';
            const sanitizedText = this.escapePdfString(text);

            const encoder = new TextEncoder();
            const header = '%PDF-1.4\n';

            // Content stream (text drawing)
            const streamContent = `BT /F1 14 Tf 72 800 Td (${sanitizedText}) Tj ET`;
            const streamBytes = encoder.encode(streamContent);

            // Objects with placeholders; we will compute offsets dynamically
            const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
            const obj2 = '2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n';
            const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
            const obj4Prefix = `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`;
            const obj4Suffix = '\nendstream\nendobj\n';
            const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

            // Build full PDF and compute xref offsets
            const parts: Uint8Array[] = [];
            parts.push(encoder.encode(header));

            const offsets: number[] = []; // object start byte offsets
            let cursor = header.length;

            const addObj = (s: string | Uint8Array) => {
                const bytes = typeof s === 'string' ? encoder.encode(s) : s;
                parts.push(bytes);
                cursor += bytes.length;
            };

            // obj1
            offsets.push(cursor);
            addObj(obj1);
            // obj2
            offsets.push(cursor);
            addObj(obj2);
            // obj3
            offsets.push(cursor);
            addObj(obj3);
            // obj4 (prefix + stream + suffix)
            offsets.push(cursor);
            addObj(obj4Prefix);
            addObj(streamBytes);
            addObj(obj4Suffix);
            // obj5
            offsets.push(cursor);
            addObj(obj5);

            const xrefStart = cursor;

            // xref table for 6 entries (0..5)
            const xrefHeader = `xref\n0 6\n`;
            const freeEntry = '0000000000 65535 f \n';
            const pad = (n: number) => String(n).padStart(10, '0');
            const xrefEntries = offsets.map((o) => `${pad(o)} 00000 n \n`).join('');
            const xref = xrefHeader + freeEntry + xrefEntries;

            const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF`;

            addObj(xref);
            addObj(trailer);

            // Concatenate all parts
            const totalLength = parts.reduce((sum, u) => sum + u.length, 0);
            const out = new Uint8Array(totalLength);
            let pos = 0;
            for (const u of parts) {
                out.set(u, pos);
                pos += u.length;
            }
            return out;
        }
    }

    private extractText(html: string): string {
        try {
            // Strip tags and collapse whitespace
            const noTags = html
                .replace(/<script[\s\S]*?<\/script>/gi, '')
                .replace(/<style[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ');
            const collapsed = noTags.replace(/\s+/g, ' ').trim();
            return collapsed.slice(0, 4000); // limit length
        } catch {
            return 'Document';
        }
    }

    private escapePdfString(s: string): string {
        return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    }
}
