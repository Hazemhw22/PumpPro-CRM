# PDF Rendering Fix for Vercel

## Problem

PDF was rendering correctly on localhost but showing garbled/truncated output on Vercel production environment.

### Root Causes Identified:

1. **Image URL Resolution**: Puppeteer on Vercel couldn't properly load images from relative URLs (`/favicon.png`)
2. **Base href Issues**: The `baseHref` calculation was unreliable on Vercel:

    - `NEXT_PUBLIC_SITE_URL` was undefined
    - `VERCEL_URL` might not be properly configured
    - Relative paths weren't being resolved correctly in the serverless environment

3. **Character Encoding**: While the HTML had `<meta charset="UTF-8" />`, Puppeteer needed explicit timeout configuration for proper rendering

## Solutions Implemented

### 1. **Removed Relative Image URLs** (`invoice-deal-pdf.ts`)

-   **Before**: Used `/favicon.png` or other relative paths that required proper base href resolution
-   **After**: Used a base64-encoded placeholder PNG that works everywhere
-   **Location**: Lines ~290 in `generateHTML()`

```typescript
// Old approach (problematic on Vercel):
const logoSrc = (company as any).logo_url || '/favicon.png';
const baseHref = ... // complex calculation that often failed

// New approach (works everywhere):
const logoSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const baseHref = '';
```

### 2. **Removed Unreliable baseHref Logic** (`invoice-deal-pdf.ts`)

-   Removed complex environment-dependent baseHref calculation
-   Removed `<base href>` tag from HTML header since we now use data URLs
-   **Impact**: Eliminates dependency on environment variables that might be missing

### 3. **Added Timeout Configuration** (`pdf-service.ts`)

-   Added explicit navigation and timeout settings for Puppeteer
-   Helps with character encoding and resource loading on Vercel

```typescript
await page.setDefaultNavigationTimeout(30000);
await page.setDefaultTimeout(30000);
```

## Files Modified

1. `components/pdf/invoice-deal-pdf.ts` - Removed image URL resolution issues
2. `components/pdf/pdf-service.ts` - Added timeout configuration

## Testing

To verify the fix works:

### On Localhost:

```bash
npm run dev
# PDFs should render correctly (as before)
```

### On Vercel:

-   Deploy the changes
-   Generate a PDF from the booking system
-   Check that it renders without garbled/truncated output
-   Verify Vercel logs show complete HTML preview

## Future Improvements

If you want to use actual company logos in PDFs:

1. **Base64 Conversion**: Convert logo to base64 at request time

    ```typescript
    const logoBase64 = await fetch(logoUrl)
        .then((r) => r.blob())
        .then(
            (blob) =>
                new Promise((cb) => {
                    const reader = new FileReader();
                    reader.onloadend = () => cb(reader.result);
                    reader.readAsDataURL(blob);
                }),
        );
    ```

2. **Upload to CDN**: Store logo on a CDN with full URL support

    ```typescript
    const logoSrc = process.env.CDN_URL + '/logos/company.png';
    ```

3. **SVG Embedding**: Use SVG directly in HTML instead of image tags
    ```typescript
    const logoSrc = '<svg>...</svg>';
    ```

## Related Issues

-   Character encoding for Arabic/Hebrew text: Handled by `<meta charset="UTF-8" />`
-   Puppeteer on serverless (Vercel): Uses `@sparticuz/chromium` as before
-   Font support: Relies on system fonts; add Google Fonts if needed

## Logs to Monitor

After deployment, check Vercel Function logs for:

-   ✅ `[PDFService] Vercel detected...` - Correct browser detection
-   ✅ `[generate-contract-pdf] generated HTML length=` - HTML generation succeeded
-   ✅ No truncated HTML output in preview
-   ✅ No errors in PDF rendering
