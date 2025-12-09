import { i } from 'framer-motion/dist/types.d-BJcRxCew';

export type InvoiceDealPdfData = {
    invoice?: {
        id?: string;
        invoice_number?: string;
        total_amount?: number;
        paid_amount?: number;
        remaining_amount?: number;
        status?: string;
        created_at?: string;
    } | null;
    booking?: {
        booking_number?: string;
        service_type?: string;
        service_address?: string;
        scheduled_date?: string | null;
        scheduled_time?: string | null;
        notes?: string | null;
        contractor_id?: string | null;
        driver_id?: string | null;
        price?: number | null;
    } | null;
    contractor?: {
        name?: string | null;
        phone?: string | null;
    } | null;
    driver?: {
        name?: string | null;
        driver_number?: string | null;
    } | null;
    customer?: {
        name?: string | null;
        phone?: string | null;
        address?: string | null;
        business_name?: string | null;
    } | null;
    service?: {
        name?: string | null;
        price_private?: number | null;
        price_business?: number | null;
    } | null;
    services?: Array<{
        name?: string | null;
        description?: string | null;
        quantity?: number;
        unit_price?: number;
        total?: number;
    }> | null;
    companyInfo?: {
        name?: string | null;
        address?: string | null;
        phone?: string | null;
        tax_id?: string | null;
        logo_url?: string | null;
    } | null;
    doc_type?: 'invoice' | 'receipt';
    lang?: 'en' | 'he' | 'ar';
    payment_method?: 'cash' | 'credit_card' | 'bank_transfer' | 'check' | null;
    payment_type?: 'cash' | 'visa' | 'bank_transfer' | 'check' | null;
    no_price?: boolean;
};

export class InvoiceDealPDFGenerator {
    static formatCurrency(value: number) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'ILS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    }

    static formatDate(dateString?: string | null) {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
        } catch {
            return '-';
        }
    }

    static formatTime(dateString?: string | null) {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '-';
        }
    }

    static inferSellerType(booking: InvoiceDealPdfData['booking']): 'driver' | 'contractor' | null {
        if (booking?.driver_id) return 'driver';
        if (booking?.contractor_id) return 'contractor';
        return null;
    }

    static t(lang: 'en' | 'he' | 'ar' | '') {
        const en = {
            title: 'Service Document',
            contract_date: 'Document Date',
            seller: 'Seller',
            driver: 'Driver',
            contractor: 'Contractor',
            provider_signature: 'Provider Signature',
            customer: 'Customer',
            company: 'PumpPro',
            tax_number: 'Tax Number',
            phone: 'Phone',
            address: 'Address',
            service_info: 'Service Information',
            service_type: 'Service Type',
            booking_number: 'Booking Number',
            service_date: 'Service Date',
            service_time: 'Service Time',
            service_address: 'Service Address',
            notes: 'Notes',
            purchase_details: 'Payment Details',
            purchase_amount: 'Amount',
            terms_title: 'Terms and Conditions',
            term_1: 'The service is provided as agreed and scheduled.',
            term_2: 'Any changes must be communicated in advance.',
            term_3: 'Invoices are due upon receipt unless otherwise stated.',
            term_4: 'Disputes must be raised within 7 days.',
            term_5: 'This document is binding once issued.',
            buyer_signature: "Customer's Signature",
            price: 'Price',
            payment_method: 'Payment Method',
        };
        const ar = {
            title: 'مستند الخدمة',
            contract_date: 'تاريخ المستند',
            seller: 'البائع',
            driver: 'السائق',
            contractor: 'المقاول',
            provider_signature: 'توقيع مقدم الخدمة',
            customer: 'العميل',
            company: 'شركة',
            tax_number: 'الرقم الضريبي',
            phone: 'الهاتف',
            address: 'العنوان',
            service_info: 'معلومات الخدمة',
            service_type: 'نوع الخدمة',
            booking_number: 'رقم الحجز',
            service_date: 'تاريخ الخدمة',
            service_time: 'وقت الخدمة',
            service_address: 'عنوان الخدمة',
            notes: 'ملاحظات',
            purchase_details: 'تفاصيل الدفع',
            purchase_amount: 'المبلغ',
            terms_title: 'الشروط والأحكام',
            term_1: 'تم تقديم الخدمة حسب الاتفاق والجدول المحدد.',
            term_2: 'يجب إبلاغ أي تغييرات مسبقًا.',
            term_3: 'تستحق الفواتير عند الاستلام ما لم يُذكر خلاف ذلك.',
            term_4: 'يجب رفع أي نزاع خلال 7 أيام.',
            term_5: 'هذا المستند ملزم بمجرد إصداره.',
            buyer_signature: 'توقيع العميل',
            price: 'السعر',
            payment_method: 'طريقة الدفع',
        };
        const he = {
            title: 'מסמך שירות',
            contract_date: 'תאריך מסמך',
            seller: 'מוכר',
            driver: 'נהג',
            contractor: 'קבלן',
            provider_signature: 'חתימת נותן שירות',
            customer: 'לקוח',
            company: 'חברה',
            tax_number: 'מספר עוסק',
            phone: 'טלפון',
            address: 'כתובת',
            service_info: 'מידע שירות',
            service_type: 'סוג שירות',
            booking_number: 'מספר הזמנה',
            service_date: 'תאריך שירות',
            service_time: 'שעת שירות',
            service_address: 'כתובת שירות',
            notes: 'הערות',
            purchase_details: 'פרטי תשלום',
            purchase_amount: 'סכום',
            terms_title: 'תנאים והגבלות',
            term_1: 'השירות מסופק כפי שסוכם ומתוזמן.',
            term_2: 'יש לתקשר שינויים מראש.',
            term_3: 'חשבוניות לתשלום עם קבלה אלא אם צוין אחרת.',
            term_4: 'יש להעלות מחלוקות תוך 7 ימים.',
            term_5: 'מסמך זה מחייב עם הנפקתו.',
            buyer_signature: 'חתימת לקוח',
            price: 'מחיר',
            payment_method: 'אמצעי תשלום',
        };
        return lang === 'ar' ? ar : lang === 'he' ? he : en;
    }

    static calculatePrice(data: InvoiceDealPdfData): number {
        const inv = data.invoice;
        if (typeof inv?.total_amount === 'number' && !isNaN(inv.total_amount)) return Number(inv.total_amount);
        const bk = data.booking as any;
        if (bk?.price) return Number(bk.price);
        const svc = (data as any).service;
        if (svc?.price_private || svc?.price_business) {
            return Number(svc.price_private || svc.price_business || 0);
        }
        const amountFallback = (data as any)?.amount;
        if (amountFallback) return Number(amountFallback);
        return 0;
    }

    static formatPaymentMethod(data: InvoiceDealPdfData): string {
        // Prefer explicit payment_method if provided; otherwise map payment_type
        const method = data.payment_method || (data.payment_type === 'visa' ? 'credit_card' : (data.payment_type as any)) || null;
        if (!method) return '-';
        return String(method).replace('_', ' ').toUpperCase();
    }

    static async generateHTML(data: InvoiceDealPdfData): Promise<string> {
        const lang = data.lang || 'en';
        const t = this.t(lang);
        const company = data.companyInfo || {};
        const bk = data.booking || {};
        const inv = data.invoice || null;
        const sellerType = this.inferSellerType(bk);
        const sellerName = (data.contractor as any)?.name || '-';
        const providerTitle = sellerType === 'driver' ? t.driver : sellerType === 'contractor' ? t.contractor : t.seller;

        console.log(
            '[generateHTML] no_price=',
            (data as any).no_price,
            'data.services len=',
            Array.isArray(data.services) ? data.services.length : 'N/A',
            'data.booking_services len=',
            Array.isArray((data as any).booking_services) ? (data as any).booking_services.length : 'N/A',
        );
        let finalSellerName = '-';
        let finalSellerPhone = '-';
        let finalProviderTitle = t.seller;

        console.log('DEBUG PDF: sellerType=', sellerType, 'driver data=', data.driver, 'contractor data=', data.contractor);

        if (sellerType === 'contractor' && data.contractor) {
            finalSellerName = data.contractor.name || '-';
            finalSellerPhone = (data.contractor as any).phone || (data.contractor as any).phone_number || (data.contractor as any).number || '-';
            finalProviderTitle = t.contractor;
        } else if (sellerType === 'driver' && data.driver) {
            // Driver name is already formatted as "firstName lastName" from API
            const driverName = (data.driver as any).name || (data.driver as any).driver_name;
            finalSellerName = driverName && driverName.trim() ? driverName : '-';
            finalSellerPhone = (data.driver as any).driver_number || (data.driver as any).phone || '-';
            finalProviderTitle = t.driver;
        }

        const customerCompany = (data.customer as any)?.business_name || (data.customer as any)?.name || (data as any).customer_name || '-';
        const customerPhone = (data.customer as any)?.phone || '-';
        const customerAddress = (data.customer as any)?.address || '-';

        const includeAmount = data.doc_type === 'receipt';
        const noPrice = (data as any).no_price === true;
        const amount = inv ? this.formatCurrency(inv.total_amount as any) : this.formatCurrency(0);
        const price = this.formatCurrency(this.calculatePrice(data));
        const paymentMethod = this.formatPaymentMethod(data);

        const serviceTypeName = (data.service as any)?.name || (bk as any).service_type || '-';
        const todayStr = this.formatDate(inv?.created_at);
        // Default PDF logo — put your logo file at `public/assets/images/pdf-logo.png`
        const logoSrc = (company as any).logo_url || '/favicon.png';

        // Compute base href so that relative asset paths (like '/favicon.png')
        // resolve correctly when rendering server-side (e.g. in Vercel serverless).
        // - In browser env we leave it empty (browser resolves relative paths normally).
        // - On server, prefer `NEXT_PUBLIC_SITE_URL`, then `VERCEL_URL`, then localhost.
        let baseHref = '';
        try {
            if (typeof window === 'undefined') {
                if (process.env.NEXT_PUBLIC_SITE_URL) {
                    baseHref = String(process.env.NEXT_PUBLIC_SITE_URL).replace(/\/$/, '') + '/';
                } else if (process.env.VERCEL_URL) {
                    baseHref = `https://${String(process.env.VERCEL_URL).replace(/\/$/, '')}/`;
                } else {
                    baseHref = 'http://localhost:3000/';
                }
            }
        } catch (e) {
            baseHref = '';
        }
        // Aggregate services from multiple possible sources so that ALL services appear in the PDF.
        let servicesList: Array<any> = [];
        console.log(
            '[servicesList init] data.services=',
            Array.isArray(data.services) ? data.services.length : typeof data.services,
            'data.booking_services=',
            Array.isArray((data as any).booking_services) ? (data as any).booking_services.length : typeof (data as any).booking_services,
            'data.booking.services=',
            Array.isArray((data.booking as any)?.services) ? (data.booking as any).services.length : typeof (data.booking as any)?.services,
        );

        // Helper to normalize a service item and ensure timestamps carried through
        const normalizeService = (s: any, fallbackUnitPrice?: number) => ({
            name: s.name || s.service_name || (s.service && s.service.name) || '-',
            description: s.description || null,
            quantity: typeof s.quantity === 'number' ? s.quantity : Number(s.qty || s.count || 1),
            unit_price: typeof s.unit_price === 'number' ? s.unit_price : Number(s.price || fallbackUnitPrice || 0),
            total: typeof s.total === 'number' ? s.total : typeof s.unit_price === 'number' && typeof s.quantity === 'number' ? s.unit_price * s.quantity : undefined,
            created_at: s.created_at || null,
            scheduled_date: s.scheduled_date || null,
            scheduled_time: s.scheduled_time || null,
            service_id: s.service_id || null,
            id: s.id || null,
        });

        // Collect all services from all sources
        const allServiceSources: any[] = [];

        // Add data.services first (if any)
        if (Array.isArray(data.services) && data.services.length > 0) {
            const fallbackPrice = this.calculatePrice(data);
            allServiceSources.push(...data.services.map((s: any) => normalizeService(s, fallbackPrice)));
        }

        // Then add booking_services (if any) — these often carry per-service created_at
        if (Array.isArray((data as any).booking_services) && (data as any).booking_services.length > 0) {
            allServiceSources.push(...(data as any).booking_services.map((s: any) => normalizeService(s, this.calculatePrice(data))));
        }

        // Then append booking-level services if present
        if (Array.isArray((data.booking as any)?.services) && (data.booking as any).services.length > 0) {
            allServiceSources.push(...(data.booking as any).services.map((s: any) => normalizeService(s, this.calculatePrice(data))));
        }

        // Deduplicate services by id or name to avoid showing the same service multiple times
        const seenIds = new Set<string>();
        const seenNames = new Set<string>();
        servicesList = allServiceSources.filter((svc: any) => {
            const uniqueId = svc.id || svc.service_id || svc.name;
            if (!uniqueId) return true;

            // If has ID, use it for deduplication
            if (svc.id || svc.service_id) {
                const id = String(svc.id || svc.service_id);
                if (seenIds.has(id)) return false;
                seenIds.add(id);
                return true;
            }

            // Otherwise deduplicate by name
            const name = String(svc.name);
            if (seenNames.has(name)) return false;
            seenNames.add(name);
            return true;
        });

        // If still empty, fall back to a single service row based on booking/service_type
        if (servicesList.length === 0) {
            if (serviceTypeName !== '-') {
                servicesList = [
                    { name: serviceTypeName, description: null, quantity: 1, unit_price: this.calculatePrice(data), total: this.calculatePrice(data), created_at: null, service_id: null, id: null },
                ];
            } else {
                servicesList = [];
            }
        }

        // Calculate total price as sum of all services
        const totalPrice = servicesList.reduce((sum: number, svc: any) => sum + (svc.total || 0), 0);

        console.log('[InvoiceDealPDFGenerator] servicesList length=', servicesList.length, 'services=', servicesList.map((s: any) => s.name).join(', '));

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.title}</title>
        ${baseHref ? `<base href="${baseHref}">` : ''}
  <style>
    @page { size: A4; margin: 8mm; }
    body { font-family: Arial, sans-serif; font-size: 11px; }
    h1 { font-size: 18px; }
    .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
    .kv { display: grid; grid-template-columns: 1fr 2fr; gap: 6px 12px; }
    .muted { color: #4b5563; }
    .purchase-amount { font-weight: 700; text-align: center; border: 2px solid #34d399; border-radius: 8px; padding: 8px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
    .sign .label { font-weight: 600; margin-bottom: 4px; }
    .sign .line { border-bottom: 2px solid #d1d5db; height: 28px; }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;background:#1D4ED8;color:#ffffff;border-radius:8px;padding:12px;">
    <div style="display:flex;gap:12px;align-items:center;">
      <img src="${logoSrc}" alt="Logo" style="width:48px;height:48px;object-fit:contain;border:1px solid #e5e7eb;border-radius:8px;padding:4px;background:#ffffff;" />
      <div>
        <h1 style="margin:0 0 4px 0;">PumpPro</h1>
        ${company?.address ? `<div>${company.address}</div>` : ''}
        ${company?.phone ? `<div>${company.phone}</div>` : ''}
        ${company?.tax_id ? `<div>${t.tax_number}: ${company.tax_id}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;">${t.title}</div>
      <div>${t.contract_date}</div>
      <div style="font-weight:700;">${todayStr}</div>
      ${bk.booking_number ? `<div style="margin-top:6px;color:#f3f4f6;">${t.booking_number}</div><div style="font-weight:700;color:#ffffff;">${bk.booking_number}</div>` : ''}
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div class="panel" style="background:#DCFCE7;">
      <div style="font-weight:700;margin-bottom:6px;">${t.customer}</div>
      <div><span class="muted">${t.company}:</span> ${customerCompany}</div>
      <div><span class="muted">${t.phone}:</span> ${customerPhone}</div>
      <div><span class="muted">${t.address}:</span> ${customerAddress}</div>
    </div>
  </div>

  ${
      !noPrice
          ? `
  <div style="margin-bottom:6px;text-align:center;">
    <h3 style="margin:0;font-size:14px;font-weight:700;color:#1D4ED8;">Invoice Deal</h3>
  </div>
  <div class="panel" style="margin-bottom:12px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;direction:rtl;">
      <thead>
        <tr style="background:#f3f4f6;font-weight:700;">
          <td style="border:1px solid #d1d5db;padding:8px;text-align:right;">تفاصيل الخدمة</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">التاريخ</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">الوقت</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">الكمية</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:left;">الإجمالي</td>
        </tr>
      </thead>
      <tbody>
        ${servicesList
            .map(
                (svc: any) => `
        <tr>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:right;font-weight:700;">${svc.name || '-'}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${this.formatDate(svc.created_at || svc.scheduled_date || bk.scheduled_date)}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${this.formatTime(svc.created_at || svc.scheduled_date || bk.scheduled_date) || svc.scheduled_time || bk.scheduled_time || '-'}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${svc.quantity || 1}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:left;">${svc.total ? this.formatCurrency(svc.total) : '-'}</td>
        </tr>
        `,
            )
            .join('')}
        <tr style="font-weight:700;background:#f3f4f6;">
          <td style="border:1px solid #d1d5db;padding:8px;text-align:right;">الإجمالي قبل الضريبة</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:left;">${this.formatCurrency(totalPrice)}</td>
        </tr>
        <tr style="font-weight:700;">
          <td style="border:1px solid #d1d5db;padding:8px;text-align:right;">الضريبة (18%)</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:left;">${this.formatCurrency(totalPrice * 0.18)}</td>
        </tr>
        <tr style="font-weight:700;background:#DBEAFE;">
          <td style="border:1px solid #d1d5db;padding:8px;text-align:right;">الإجمالي شامل الضريبة</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;"></td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:left;">${this.formatCurrency(totalPrice * 1.18)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  `
          : `
  <div style="margin-bottom:6px;text-align:center;">
    <h3 style="margin:0;font-size:14px;font-weight:700;color:#1D4ED8;">Confirmation Documents</h3>
  </div>
  <div class="panel" style="margin-bottom:12px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;direction:rtl;">
      <thead>
        <tr style="background:#f3f4f6;font-weight:700;">
          <td style="border:1px solid #d1d5db;padding:8px;text-align:right;">تفاصيل الخدمة</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">التاريخ</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">الوقت</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">الكمية</td>
        </tr>
      </thead>
      <tbody>
        ${servicesList
            .map(
                (svc: any) => `
        <tr>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:right;font-weight:700;">${svc.name || '-'}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${this.formatDate(svc.created_at || svc.scheduled_date || bk.scheduled_date)}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${this.formatTime(svc.created_at || svc.scheduled_date || bk.scheduled_date) || svc.scheduled_time || bk.scheduled_time || '-'}</td>
          <td style="border:1px solid #d1d5db;padding:8px;text-align:center;">${svc.quantity || 1}</td>
        </tr>
        `,
            )
            .join('')}
      </tbody>
    </table>
  </div>
  `
  }

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
    <div class="panel" style="background:#DBEAFE;">
      <div style="font-weight:700;margin-bottom:6px;">${finalProviderTitle}</div>
      <div><span class="muted">Name:</span> ${finalSellerName}</div>
      <div><span class="muted">${t.phone}:</span> ${finalSellerPhone}</div>
    </div>
  </div>

  ${
      bk.notes
          ? `
  <div class="panel" style="margin-bottom:12px;background:#FEF3C7;">
    <div style="font-weight:700;margin-bottom:6px;">📝 ${t.notes}</div>
    <div>${bk.notes}</div>
  </div>
  `
          : ''
  }

  <div class="panel" style="margin-bottom:12px;">
    <div style="font-weight:700;margin-bottom:6px;">⚠️ ${t.terms_title}</div>
    <ul style="margin:0;padding-left:18px;">
      <li>${t.term_1}</li>
      <li>${t.term_2}</li>
      <li>${t.term_3}</li>
      <li>${t.term_4}</li>
      <li>${t.term_5}</li>
    </ul>
  </div>

  <div class="signatures">
    <div class="sign">
      <div class="label">${t.provider_signature}</div>
      <div class="line"></div>
    </div>
    <div class="sign">
      <div class="label">${t.buyer_signature}</div>
      <div class="line"></div>
    </div>
  </div>
</body>
</html>`;
    }

    static async generatePDF(data: any, filename: string, docType?: 'invoice' | 'receipt') {
        try {
            console.log(
                '[InvoiceDealPDFGenerator.generatePDF] data.booking_services length=',
                Array.isArray(data.booking_services) ? data.booking_services.length : 'not-array',
                'data.services length=',
                Array.isArray(data.services) ? data.services.length : 'not-array',
            );

            const company = data.companyInfo || data.company || {};
            const pdfData: any = {
                invoice: data.invoice || {
                    id: data?.invoice_id || '',
                    invoice_number: data?.invoice_number || '',
                    total_amount: Number(data?.total_amount || data?.amount || 0),
                    paid_amount: Number(data?.paid_amount || data?.amount || 0),
                    remaining_amount: Number(data?.remaining_amount || 0),
                    status: String(data?.status || 'pending'),
                    created_at: String(data?.created_at || data?.date || new Date().toISOString()),
                },
                booking: data.booking || {},
                contractor: data.contractor || null,
                customer: data.customer || null,
                service: data.service || null,
                booking_services: Array.isArray(data.booking_services) ? data.booking_services : data.booking_services ? [data.booking_services] : [],
                services: Array.isArray(data.services) ? data.services : data.services ? [data.services] : [],
                doc_type: docType || data.doc_type || 'invoice',
                companyInfo: {
                    name: company?.name || null,
                    address: company?.address || null,
                    phone: company?.phone || null,
                    tax_id: company?.tax_id || null,
                    logo_url: company?.logo_url || null,
                },
                lang: data?.lang || 'en',
                payment_method: data?.payment_method || null,
                payment_type: data?.payment_type || null,
                no_price: data?.no_price || false,
            };

            console.log(
                '[InvoiceDealPDFGenerator.generatePDF] pdfData.booking_services length=',
                Array.isArray(pdfData.booking_services) ? pdfData.booking_services.length : 'N/A',
                'pdfData.services length=',
                Array.isArray(pdfData.services) ? pdfData.services.length : 'N/A',
            );

            const res = await fetch('/api/generate-contract-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pdfData, docType: pdfData.doc_type, filename }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || 'Failed to generate PDF');
            }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `document-${Date.now()}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error('generatePDF error', e);
            throw e;
        }
    }
}
