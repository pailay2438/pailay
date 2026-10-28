/* ปรับการใช้งาน (เน้นมือถือ) — โหลดเป็นไฟล์สุดท้าย ไม่แก้ script.js / functionlist.js
 *
 * ช่องวันที่ (flatpickr) แสดงเป็นภาษาไทย วว/ดด/ปปปป (พ.ศ.)
 * - ค่าจริงในช่องเดิม (#timestart ฯลฯ) ยังเป็น Y-m-d (ค.ศ.) เหมือนเดิม → script.js / หลังบ้านไม่ต้องแก้
 *   flatpickr altInput สร้างช่องแสดงผลใหม่ แล้วซ่อนช่องเดิม
 * - script.js ตั้งค่าช่องเดิมตรงๆ ด้วย .val() (ตอนเปิดแก้ไขใบจอง / วันซ้ำ / ล้างฟอร์ม) → ดักการตั้งค่าแล้วอัปเดตช่องแสดงผลตาม
 * - สร้าง flatpickr ใหม่ทับของเดิม ซึ่งแก้หัวปฏิทินว่างไปด้วย (removeinvalid() ใน functionlist.js ล้างช่องเดือน/ปีตอนโหลด)
 */
(function () {
    var DATE_FIELDS = '#timestart, #timeend, #booking_timestart, #booking_timeend';
    var BE = 543;
    var valueProp = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    // altFormat 'd/m/Y' → แสดงปี พ.ศ.; รูปแบบอื่น (dateFormat 'Y-m-d') ใช้ของ flatpickr ตามปกติ
    function formatDate(date, format, locale) {
        if (format === 'd/m/Y') return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + '/' + (date.getFullYear() + BE);
        return flatpickr.formatDate(date, format, locale);
    }

    // หัวปฏิทินแสดงปี พ.ศ.: flatpickr เขียนปี ค.ศ. ลงช่องปีหลายจุด → ดักที่ตัวช่องเลย
    function buddhistYearInput(el) {
        Object.defineProperty(el, 'value', {
            configurable: true,
            get: function () { return valueProp.get.call(this); },
            set: function (v) {
                var y = parseInt(v, 10);
                valueProp.set.call(this, y && y < 2400 ? y + BE : v);
            }
        });
        el.value = el.value;
        el.readOnly = true; // พิมพ์ปีเองจะถูกตีความเป็น ค.ศ. → ให้เลื่อนเดือนด้วยลูกศรแทน
    }

    // script.js ตั้ง/ล้างค่าช่องเดิมด้วย .val() → อัปเดตช่องแสดงผลตาม
    function syncOnSet(input, fp) {
        Object.defineProperty(input, 'value', {
            configurable: true,
            get: function () { return valueProp.get.call(this); },
            set: function (v) {
                valueProp.set.call(this, v);
                // flatpickr เขียนค่าเองตอนเลือกวัน (ตรงกับ selectedDates อยู่แล้ว) → ข้าม
                var cur = fp.selectedDates.length ? fp.formatDate(fp.selectedDates[0], 'Y-m-d') : '';
                if (fp._syncing || cur === (v || '')) return;
                fp._syncing = true;
                try {
                    if (v) fp.setDate(v, false);
                    else fp.clear(false);
                } finally {
                    fp._syncing = false;
                }
            }
        });
    }

    // clearForm() ล้างเฉพาะ input type=text → โดนช่องแสดงผล แต่ข้ามช่องจริง (hidden) → ล้างช่องจริงตามด้วย
    // ไม่งั้นใบจองถัดไปจะติดวันที่ของใบก่อน ทั้งที่ช่องแสดงว่าง
    function clearWithAlt(fp) {
        Object.defineProperty(fp.altInput, 'value', {
            configurable: true,
            get: function () { return valueProp.get.call(this); },
            set: function (v) {
                valueProp.set.call(this, v);
                if (v || fp._syncing || !fp.selectedDates.length) return;
                fp._syncing = true;
                try {
                    fp.clear(false);
                    valueProp.set.call(fp.input, '');
                } finally {
                    fp._syncing = false;
                }
            }
        });
    }

    function setup(input) {
        if (input._flatpickr) input._flatpickr.destroy();
        var fp = flatpickr(input, {
            dateFormat: 'Y-m-d',
            altInput: true,
            altFormat: 'd/m/Y',
            formatDate: formatDate,
            locale: Object.assign({}, flatpickr.l10ns.th, { firstDayOfWeek: 0 }),
            defaultDate: input.value || null,
            disableMobile: true
        });
        if (fp.currentYearElement) buddhistYearInput(fp.currentYearElement);
        syncOnSet(input, fp);
        clearWithAlt(fp);

        // checkvalue() ใส่กรอบแดงที่ช่องเดิม (ซึ่งถูกซ่อน) → ให้ช่องแสดงผลแดงตาม
        new MutationObserver(function () {
            fp.altInput.classList.toggle('is-invalid', input.classList.contains('is-invalid'));
        }).observe(input, { attributes: true, attributeFilter: ['class'] });
    }

    $(document).ready(function () {
        // ready ของไฟล์นี้ทำงานหลัง ready ของ script.js และ functionlist.js (ลงทะเบียนทีหลัง)
        if (!window.flatpickr || !flatpickr.l10ns.th) return;
        document.querySelectorAll(DATE_FIELDS).forEach(function (input) {
            try { setup(input); } catch (e) { console.error('thai date', e); }
        });
    });
})();
