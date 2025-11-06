# إعداد قاعدة بيانات Supabase - PumpPro CRM

## ملخص التغييرات

تم إنشاء بنية قاعدة بيانات كاملة لنظام PumpPro CRM باستخدام Supabase مع الميزات التالية:

### 1. الجداول (Tables)
- **profiles** - معلومات المستخدمين
- **user_roles** - أدوار المستخدمين (admin / user فقط)
- **trucks** - إدارة أسطول الشاحنات
- **drivers** - معلومات السائقين
- **customers** - سجلات العملاء (خاص / تجاري)
- **services** - الخدمات المتاحة مع الأسعار
- **bookings** - حجوزات الخدمات
- **invoices** - إدارة الفواتير
- **payments** - سجلات الدفع

### 2. الأنواع المخصصة (ENUMs)
- `app_role`: admin, user
- `truck_status`: active, maintenance, inactive, retired
- `customer_type`: private, business
- `booking_status`: pending, confirmed, in_progress, completed, cancelled
- `invoice_status`: pending, paid, overdue, cancelled
- `payment_method`: cash, credit_card, bank_transfer, check
- `driver_status`: active, inactive, on_leave

### 3. الملفات المُنشأة

#### أ. ملفات قاعدة البيانات
- `supabase/schema.sql` - SQL schema كامل للجداول والعلاقات
- `supabase/README.md` - دليل الإعداد والاستخدام

#### ب. ملفات TypeScript
- `types/database.types.ts` - TypeScript types لجميع الجداول
- `lib/supabase/client.ts` - Supabase client للاستخدام في المتصفح
- `lib/supabase/server.ts` - Supabase admin client للاستخدام في الخادم
- `lib/supabase/queries-simple.ts` - ملف مساعد بسيط للاستعلامات

## خطوات الإعداد

### 1. إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com)
2. أنشئ مشروع جديد
3. انتظر حتى يصبح المشروع جاهزاً

### 2. تشغيل SQL Schema

1. افتح لوحة تحكم Supabase
2. اذهب إلى **SQL Editor**
3. انسخ محتوى ملف `supabase/schema.sql`
4. الصق وشغّل السكريبت
5. تأكد من إنشاء جميع الجداول بنجاح

### 3. إعداد متغيرات البيئة

أنشئ ملف `.env.local` في جذر المشروع:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

احصل على هذه القيم من:
- لوحة تحكم Supabase → Settings → API

### 4. تثبيت المكتبات المطلوبة

```bash
npm install @supabase/supabase-js
```

## الميزات الرئيسية

### Row Level Security (RLS)

جميع الجداول لديها RLS مفعّل مع السياسات التالية:

- **Profiles**: المستخدمون يمكنهم عرض/تعديل ملفهم الشخصي، المشرفون يمكنهم عرض الكل
- **User Roles**: المستخدمون يمكنهم عرض أدوارهم، المشرفون يمكنهم إدارة الكل
- **Trucks/Drivers/Customers**: المستخدمون المصادق عليهم يمكنهم العرض، المشرفون يمكنهم الإدارة
- **Services**: الجميع يمكنهم عرض الخدمات النشطة، المشرفون يمكنهم الإدارة
- **Bookings**: المستخدمون يمكنهم عرض حجوزاتهم، المشرفون يمكنهم إدارة الكل
- **Invoices/Payments**: المستخدمون المصادق عليهم يمكنهم العرض، المشرفون يمكنهم الإدارة

### التحديث التلقائي للطوابع الزمنية

جميع الجداول التي تحتوي على عمود `updated_at` لديها triggers تقوم بتحديث الطابع الزمني تلقائياً عند التعديل.

### توليد الأرقام التلقائي

دوال مساعدة للتوليد التلقائي:
- `generate_booking_number()` - يولد أرقام حجز فريدة (BK-YYYYMMDD-0001)
- `generate_invoice_number()` - يولد أرقام فواتير فريدة (INV-YYYYMMDD-0001)

### الفهارس (Indexes)

تم إنشاء فهارس للأداء على:
- Foreign keys
- حقول الحالة (Status)
- حقول التاريخ
- الحقول المستعلم عنها بكثرة

## أمثلة الاستخدام

### الحصول على جميع الشاحنات النشطة

```typescript
import { supabase } from '@/lib/supabase/queries-simple';

const { data: trucks, error } = await supabase
  .from('trucks')
  .select('*')
  .eq('status', 'active');
```

### إنشاء حجز جديد

```typescript
import { supabase } from '@/lib/supabase/queries-simple';

// توليد رقم الحجز
const { data: bookingNumber } = await supabase
  .rpc('generate_booking_number');

// إنشاء الحجز
const { data, error } = await supabase
  .from('bookings')
  .insert({
    booking_number: bookingNumber,
    customer_name: 'أحمد محمد',
    customer_phone: '0501234567',
    service_address: 'الرياض، السعودية',
    scheduled_date: '2024-12-01',
    scheduled_time: '10:00:00',
    service_type: 'تنظيف خزان الصرف الصحي',
    truck_id: 'truck-uuid',
    driver_id: 'driver-uuid'
  })
  .select()
  .single();
```

### الحصول على تفاصيل الحجز مع البيانات المرتبطة

```typescript
const { data, error } = await supabase
  .from('booking_details')
  .select('*')
  .eq('id', bookingId)
  .single();

// يعيد الحجز مع معلومات الشاحنة والسائق والمنشئ
```

### إنشاء فاتورة مع دفعة

```typescript
// توليد رقم الفاتورة
const { data: invoiceNumber } = await supabase
  .rpc('generate_invoice_number');

// إنشاء الفاتورة
const { data: invoice, error: invoiceError } = await supabase
  .from('invoices')
  .insert({
    invoice_number: invoiceNumber,
    booking_id: bookingId,
    customer_id: customerId,
    customer_name: 'أحمد محمد',
    service_description: 'تنظيف خزان الصرف الصحي',
    amount: 500.00,
    tax: 75.00,
    total: 575.00,
    issue_date: '2024-12-01',
    due_date: '2024-12-31'
  })
  .select()
  .single();

// تسجيل الدفعة
const { data: payment, error: paymentError } = await supabase
  .from('payments')
  .insert({
    invoice_id: invoice.id,
    customer_id: customerId,
    amount: 575.00,
    payment_date: '2024-12-01',
    payment_method: 'credit_card',
    transaction_id: 'TXN123456'
  });
```

### استعلامات مع TypeScript Types

```typescript
import type { Truck, Driver, Customer } from '@/types/database.types';
import { supabase } from '@/lib/supabase/queries-simple';

// استعلامات آمنة من حيث الأنواع
const { data: trucks } = await supabase
  .from('trucks')
  .select('*')
  .eq('status', 'active');

// trucks مُعرّف كـ Truck[]
```

## ملاحظات أمنية

1. **لا تعرض service role key** في جانب العميل أبداً
2. **استخدم سياسات RLS** - جميع الجداول لديها RLS مفعّل
3. **تحقق من أدوار المستخدمين** قبل العمليات الحساسة
4. **استخدم عمليات جانب الخادم** للمهام الإدارية
5. **نظّف مدخلات المستخدم** قبل عمليات قاعدة البيانات

## نظام الأدوار

تم تبسيط نظام الأدوار ليحتوي فقط على:
- **admin** - مشرف النظام (صلاحيات كاملة)
- **user** - مستخدم عادي (صلاحيات محدودة)

### إنشاء مستخدم مشرف

بعد تشغيل الـ schema، قم بتسجيل مستخدم جديد ثم قم بتحديث دوره في جدول `user_roles`:

```sql
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = 'user-uuid-here';
```

## الصيانة

### النسخ الاحتياطي

النسخ الاحتياطية التلقائية يتم التعامل معها بواسطة Supabase. يمكنك أيضاً:
1. اذهب إلى Database → Backups في لوحة تحكم Supabase
2. قم بتنزيل نسخ احتياطية يدوية حسب الحاجة

### المراقبة

راقب قاعدة بياناتك:
1. لوحة تحكم Supabase → Database → Query Performance
2. تحقق من الاستعلامات البطيئة وحسّن الفهارس
3. راقب استخدام التخزين

## الدعم

للمشاكل أو الأسئلة:
1. راجع توثيق Supabase: https://supabase.com/docs
2. راجع ملف schema.sql لهياكل الجداول
3. راجع database.types.ts لأنواع TypeScript

## البيانات التجريبية

الـ schema يتضمن بيانات خدمات تجريبية للاختبار. يمكنك إضافة المزيد من البيانات التجريبية بتشغيل عبارات INSERT إضافية في SQL Editor.

---

**تم إنشاء هذا الملف في:** 6 نوفمبر 2025
**الإصدار:** 1.0
**نظام الأدوار:** admin / user فقط
