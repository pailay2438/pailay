/* เบอร์ติดต่อที่ 2 (ไม่บังคับ) ในฟอร์มลงบันทึกการจอง ทั้งบ้านในเครือ (#tel) และนอกเครือ (#booking_tel)
 *
 * ห้ามเพิ่มคอลัมน์ในชีท → ส่งรวมในช่องเบอร์เดิมเป็น "0811111111, 0822222222"
 * ใบจอง PDF อ่านช่องเบอร์ช่องเดียวอยู่แล้ว จึงแสดงครบทั้ง 2 เบอร์
 * - ช่องใหม่ไม่มี id → getFormData/checkvalue ไม่เก็บและไม่บังคับ; ห่อ window.savepool/savehouseoutside ต่อจาก commission.js
 * - เปิดแก้ไขใบจอง script.js ใส่ "a, b" ลง #tel ด้วย .val() → ดักการตั้งค่าแล้วแยกกลับเป็น 2 ช่อง
 */
(function () {
    var SEP = ', ';
    var valueProp = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    var FIELDS = [
        { id: 'tel', key: 'tel', save: 'savepool' },
        { id: 'booking_tel', key: 'booking_tel', save: 'savehouseoutside' }
    ];

    function addField(f) {
        var tel = document.getElementById(f.id);
        if (!tel) return null;
        var col = tel.closest('[class*="col-"]');
        var html =
            '<div class="' + col.className + ' phone2-col">' +
            '  <div class="form-floating">' +
            '    <input class="form-control phone2" type="text" inputmode="tel" maxlength="10"' +
            '      placeholder="เบอร์ติดต่อ 2 (ถ้ามี)" aria-label="เบอร์ติดต่อ 2" data-for="' + f.id + '">' +
            '    <label>เบอร์ติดต่อ 2 (ถ้ามี)</label>' +
            '  </div>' +
            '</div>';
        col.insertAdjacentHTML('afterend', html);
        var phone2 = col.nextElementSibling.querySelector('.phone2');

        // ค่าที่มี 2 เบอร์ ("a, b") ที่ script.js ใส่มาตอนเปิดแก้ไข → แยกลงสองช่อง
        Object.defineProperty(tel, 'value', {
            configurable: true,
            get: function () { return valueProp.get.call(this); },
            set: function (v) {
                var s = String(v == null ? '' : v);
                var i = s.indexOf(',');
                if (i === -1) {
                    valueProp.set.call(this, s);
                    return;
                }
                valueProp.set.call(this, s.slice(0, i).trim());
                valueProp.set.call(phone2, s.slice(i + 1).trim());
            }
        });
        return phone2;
    }

    function wrapSave(f, phone2) {
        var orig = window[f.save];
        if (typeof orig !== 'function') return;
        window[f.save] = function (itemData) {
            var second = String(phone2.value || '').trim();
            if (second && itemData && itemData[f.key] !== undefined) {
                itemData[f.key] = String(itemData[f.key] || '').trim() + SEP + second;
            }
            return orig.apply(this, arguments);
        };
    }

    $(document).ready(function () {
        FIELDS.forEach(function (f) {
            var phone2 = addField(f);
            if (phone2) wrapSave(f, phone2);
        });
    });
})();
