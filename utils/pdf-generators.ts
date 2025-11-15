import jsPDF from 'jspdf';

export type Language = 'en' | 'he' | 'ar';

export type BillData = {
  id?: string;
  bill_type?: 'tax_invoice' | 'receipt_only' | 'tax_invoice_receipt' | 'general';
  customer_name?: string;
  customer_phone?: string;
  created_at?: string;
  bill_amount?: number;
  bill_description?: string;
  total?: number;
  tax_amount?: number;
  total_with_tax?: number;
  commission?: number | null;
  car_details?: string;
  payment_type?: 'cash' | 'visa' | 'bank_transfer' | 'check' | null;
  cash_amount?: number | null;
  visa_amount?: number | null;
  bank_amount?: number | null;
  check_amount?: number | null;
};

export type PDFOptions = {
  filename?: string;
  language?: Language;
};

function t(key: string, lang: Language): string {
  const en: Record<string, string> = {
    title_tax: 'Tax Invoice',
    title_receipt: 'Receipt',
    title_tax_receipt: 'Tax Invoice/Receipt',
    title_general: 'Invoice',
    customer: 'Customer',
    phone: 'Phone',
    date: 'Date',
    amount: 'Amount',
    tax: 'Tax',
    total: 'Total',
    description: 'Description',
  };
  const ar: Record<string, string> = {
    title_tax: 'فاتورة ضريبية',
    title_receipt: 'إيصال',
    title_tax_receipt: 'فاتورة/إيصال ضريبي',
    title_general: 'فاتورة',
    customer: 'العميل',
    phone: 'الهاتف',
    date: 'التاريخ',
    amount: 'المبلغ',
    tax: 'الضريبة',
    total: 'الإجمالي',
    description: 'الوصف',
  };
  const he: Record<string, string> = {
    title_tax: 'חשבונית מס',
    title_receipt: 'קבלה',
    title_tax_receipt: 'חשבונית מס/קבלה',
    title_general: 'חשבונית',
    customer: 'לקוח',
    phone: 'טלפון',
    date: 'תאריך',
    amount: 'סכום',
    tax: 'מס',
    total: 'סה"כ',
    description: 'תיאור',
  };
  const dict = lang === 'ar' ? ar : lang === 'he' ? he : en;
  return dict[key] ?? key;
}

function formatCurrency(n?: number) {
  return `₪${(n ?? 0).toFixed(2)}`;
}

function basePdf(data: BillData, options: PDFOptions, title: string) {
  const doc = new jsPDF();
  const lang: Language = options.language || 'he';
  const left = 14;
  let y = 18;

  doc.setFontSize(18);
  doc.text(title, left, y);
  y += 10;

  doc.setFontSize(12);
  doc.text(`${t('customer', lang)}: ${data.customer_name || '-'}`, left, y); y += 7;
  if (data.customer_phone) { doc.text(`${t('phone', lang)}: ${data.customer_phone}`, left, y); y += 7; }
  doc.text(`${t('date', lang)}: ${new Date(data.created_at || Date.now()).toLocaleDateString('en-GB')}`, left, y); y += 10;

  if (data.bill_description) {
    doc.text(`${t('description', lang)}: ${data.bill_description}`, left, y);
    y += 10;
  }

  if (typeof data.total === 'number') {
    doc.text(`${t('amount', lang)}: ${formatCurrency(data.total)}`, left, y); y += 7;
  }
  if (typeof data.tax_amount === 'number') {
    doc.text(`${t('tax', lang)}: ${formatCurrency(data.tax_amount)}`, left, y); y += 7;
  }
  if (typeof data.total_with_tax === 'number') {
    doc.setFont('helvetica', 'bold');
    doc.text(`${t('total', lang)}: ${formatCurrency(data.total_with_tax)}`, left, y); y += 7;
    doc.setFont('helvetica', 'normal');
  }

  return doc;
}

export async function generateTaxInvoicePDF(data: BillData, options: PDFOptions = {}): Promise<void> {
  const lang: Language = options.language || 'he';
  const doc = basePdf(data, options, t('title_tax', lang));
  doc.save(options.filename || 'tax-invoice.pdf');
}

export async function generateReceiptOnlyPDF(data: BillData, options: PDFOptions = {}): Promise<void> {
  const lang: Language = options.language || 'he';
  const doc = basePdf(data, options, t('title_receipt', lang));
  doc.save(options.filename || 'receipt.pdf');
}

export async function generateTaxInvoiceReceiptPDF(data: BillData, options: PDFOptions = {}): Promise<void> {
  const lang: Language = options.language || 'he';
  const doc = basePdf(data, options, t('title_tax_receipt', lang));
  doc.save(options.filename || 'tax-invoice-receipt.pdf');
}

export async function generateGeneralBillPDF(data: BillData, options: PDFOptions = {}): Promise<void> {
  const lang: Language = options.language || 'he';
  const doc = basePdf(data, options, t('title_general', lang));
  doc.save(options.filename || 'invoice.pdf');
}

export async function generateBillPDF(data: BillData, options: PDFOptions = {}): Promise<void> {
  const type = (data.bill_type || 'tax_invoice') as BillData['bill_type'];
  switch (type) {
    case 'receipt_only':
      return generateReceiptOnlyPDF(data, options);
    case 'tax_invoice_receipt':
      return generateTaxInvoiceReceiptPDF(data, options);
    case 'general':
      return generateGeneralBillPDF(data, options);
    case 'tax_invoice':
    default:
      return generateTaxInvoicePDF(data, options);
  }
}
