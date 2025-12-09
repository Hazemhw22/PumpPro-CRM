#!/bin/bash

# PDF Printing Diagnostics Script
# هذا الملف يساعدك في تشخيص مشاكل الطباعة

echo "=== PumpPro PDF Printing Diagnostics ==="
echo ""

# 1. Check Node.js version
echo "1. Checking Node.js version..."
node --version
npm --version
echo ""

# 2. Check dependencies
echo "2. Checking PDF-related packages..."
npm list puppeteer 2>/dev/null | head -3
npm list @sparticuz/chromium 2>/dev/null | head -3
npm list jspdf 2>/dev/null | head -3
echo ""

# 3. Check environment variables
echo "3. Environment Variables Status:"
if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
  echo "   ⚠️  NEXT_PUBLIC_SITE_URL is not set"
else
  echo "   ✅ NEXT_PUBLIC_SITE_URL: $NEXT_PUBLIC_SITE_URL"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "   ⚠️  NEXT_PUBLIC_SUPABASE_URL is not set"
else
  echo "   ✅ NEXT_PUBLIC_SUPABASE_URL is set"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "   ⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
else
  echo "   ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
fi
echo ""

# 4. Check file permissions
echo "4. Checking file permissions..."
ls -la app/api/generate-contract-pdf/route.ts 2>/dev/null && echo "   ✅ route.ts exists" || echo "   ❌ route.ts not found"
ls -la components/pdf/pdf-service.ts 2>/dev/null && echo "   ✅ pdf-service.ts exists" || echo "   ❌ pdf-service.ts not found"
ls -la components/pdf/invoice-deal-pdf.ts 2>/dev/null && echo "   ✅ invoice-deal-pdf.ts exists" || echo "   ❌ invoice-deal-pdf.ts not found"
echo ""

# 5. Build check
echo "5. Checking build..."
npm run build 2>&1 | tail -5
echo ""

# 6. Check for TypeScript errors
echo "6. TypeScript compilation..."
npx tsc --noEmit 2>&1 | grep -E "(error|PDF)" | head -5 || echo "   ✅ No TypeScript errors in PDF files"
echo ""

echo "=== Diagnostics Complete ==="
echo ""
echo "Next steps:"
echo "1. If all checks passed, deploy to Vercel: git push origin main"
echo "2. Check Vercel logs: vercel logs"
echo "3. Test PDF printing: https://your-app.vercel.app/bookings/preview/[id]"
