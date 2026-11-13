/* ปรับช่องในฟอร์มลงบันทึกการจอง (13 พ.ย. 2569) — ไม่แก้ script.js
 *
 * 1) ช่องทางการจอง (#bookinguser บ้านในเครือ / #booking_channel นอกเครือ) → ดรอปดาวน์ให้เลือก
 *    - ช่องเดิมยังอยู่ (ซ่อน, id เดิม) ให้ getFormData/checkvalue/commission.js/ota.js/paste.js ใช้ได้เหมือนเดิม
 *    - รายการ = datalist #comm_channel_list (commission.js โหลดจากชีทค่าคอม แท็บตั้งค่า คอลัมน์ B)
 *    - เลือกแล้ว → ใส่ค่าลงช่องเดิม + trigger input/change · ช่องเดิมถูกตั้งค่า (เปิดแก้ไข/วางข้อความ) → ดรอปดาวน์ตาม
 *      ค่าที่ไม่อยู่ในรายการ (ใบเก่า) → เพิ่มเป็นตัวเลือกชั่วคราว
 * 2) เบอร์ติดต่อ (#tel, #booking_tel, .phone2) → พิมพ์/วางแบบมีขีดหรือเว้นวรรคได้ ระบบเก็บเฉพาะตัวเลข 10 หลัก
 *    (เดิม maxlength=10 นับขีดด้วย เลขท้ายจึงหาย)
 */
(function () {
    'use strict';
    var CH = ['#bookinguser', '#booking_channel'];
    var valueProp = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    function channelList() {
        return $('#comm_channel_list option').map(function () { return String(this.value || '').trim(); }).get().filter(String);
    }

    function setupChannel(sel) {
        var input = document.querySelector(sel);
        if (!input || input._chSelect) return;
        var select = document.createElement('select');
        select.className = 'form-select ch-select';
        select.setAttribute('aria-label', 'ช่องทางการจอง');
        input.parentNode.insertBefore(select, input.nextSibling);
        input.style.display = 'none';
        input._chSelect = select;
        var label = input.parentNode.querySelector('label[for="' + input.id + '"]');
        if (label) label.textContent = 'ช่องทางการจอง (เลือกจากรายการ)';

        function draw() {
            var cur = valueProp.get.call(input).trim();
            var list = channelList();
            select.innerHTML = '';
            var ph = document.createElement('option');
            ph.value = ''; ph.textContent = list.length ? '— เลือกช่องทางการจอง —' : 'กำลังโหลดรายการ…';
            select.appendChild(ph);
            list.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; select.appendChild(o); });
            if (cur && list.indexOf(cur) === -1) { var o = document.createElement('option'); o.value = cur; o.textContent = cur + ' (ไม่อยู่ในรายการ)'; select.appendChild(o); }
            select.value = cur;
        }
        input._chDraw = draw;

        // ช่องเดิมถูกตั้งค่าด้วย .val() → ดรอปดาวน์ตาม
        Object.defineProperty(input, 'value', {
            configurable: true,
            get: function () { return valueProp.get.call(this); },
            set: function (v) { valueProp.set.call(this, v == null ? '' : v); draw(); }
        });
        select.addEventListener('change', function () {
            valueProp.set.call(input, select.value);
            $(input).trigger('input').trigger('change');
        });
        // กรอบสีจากปุ่มวางข้อความ (paste.js ใส่ class ที่ช่องเดิม) → แสดงที่ดรอปดาวน์
        new MutationObserver(function () {
            ['paste-filled', 'paste-need', 'is-invalid'].forEach(function (c) { select.classList.toggle(c, input.classList.contains(c)); });
        }).observe(input, { attributes: true, attributeFilter: ['class'] });
        draw();
    }

    function digits10(el) {
        var v = valueProp.get.call(el), d = v.replace(/\D/g, '').slice(0, 10);
        if (v !== d) valueProp.set.call(el, d);
    }

    $(document).ready(function () {
        CH.forEach(setupChannel);
        var redraw = function () { CH.forEach(function (s) { var el = document.querySelector(s); if (el && el._chDraw) el._chDraw(); }); };
        var watchList = function () {
            var dl = document.getElementById('comm_channel_list');
            if (!dl) return false;
            new MutationObserver(redraw).observe(dl, { childList: true });
            redraw();
            return true;
        };
        if (!watchList()) { var t = setInterval(function () { if (watchList()) clearInterval(t); }, 500); }

        // เบอร์ติดต่อ: รับขีด/เว้นวรรคได้ เก็บตัวเลข 10 หลัก
        var PHONE = '#tel, #booking_tel, .phone2';
        $(PHONE).attr('maxlength', 16);
        setTimeout(function () { $(PHONE).attr('maxlength', 16); }, 1000);
        $(document).on('input', PHONE, function () { digits10(this); });
    });
})();
