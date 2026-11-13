/* ปุ่ม "วางข้อความปิดการขาย" (13 พ.ย. 2569) — แอดมินวางข้อความสรุปจากกลุ่ม Lark "ใบจอง" แล้วเติมฟอร์มบ้านในเครือให้
 *
 * - ไม่แก้ script.js: เติมค่าแล้ว trigger input/change ให้ handler เดิมคำนวณ (จำนวนคืน → ช่องราคาต่อคืน → รวม/ค้างชำระ)
 * - ใช้กับ "ใบจองใหม่" เท่านั้น (#houseedit ว่าง) · ไม่กดบันทึกให้ — แอดมินตรวจแล้วกดเอง
 * - ช่องที่เติม = กรอบฟ้า (.paste-filled, หายเมื่อแก้) · ช่องที่ยังต้องกรอก = กรอบส้ม (.paste-need)
 * - อ่านไม่ออก = เว้นว่างและบอกในสรุป (ไม่เดา)
 * - ข้อความที่รองรับ: บ้าน / Check in-out dd/mm/yyyy (พ.ศ./ค.ศ.) + เวลา / พัก N คืน / จำนวน N ท่าน / N ห้องนอน / ราคาที่พัก /
 *   มัดจำ / ส่วนที่เหลือ / ค่าประกันบ้านพัก / รวมจ่ายวันพัก / แถม (น้ำแข็ง น้ำดื่ม ถ่าน อาหารเช้า ที่นอนเสริม) /
 *   ลูกค้า: … / เบอร์: … (หลายเบอร์ได้) / ช่องทาง: …
 */
(function () {
    'use strict';

    var HOUSES = [
        { key: 'sunrise', re: /sun\s*-?\s*rise|surise|ซันไรส์/i },
        { key: 'sunsea', re: /sun\s*-?\s*sea|ซันซี/i },
        { key: 'seatime', re: /sea\s*-?\s*time|ซีไทม์/i },
        { key: 'viewlay', re: /view\s*-?\s*lay|วิวเล/i },
        { key: 'bubble', re: /bubble|บับเบิ้ล|บับเบิล/i },
        { key: 'pailay', re: /pai\s*-?\s*lay|ไปเล/i }
    ];
    var GIFTS = [
        { n: 1, label: 'น้ำแข็ง', re: /น้ำแข็ง\s*(\d+)/ },
        { n: 2, label: 'น้ำดื่ม', re: /น้ำดื่ม\s*(\d+)/ },
        { n: 3, label: 'ถ่าน', re: /ถ่าน[^\d\n]*(\d+)/ },
        { n: 4, label: 'อาหารเช้า', re: /อาหารเช้า[^\d\n]*(\d+)/ },
        { n: 5, label: 'ที่นอนเสริม', re: /ที่นอน[^\d\n]*(\d+)/ }
    ];
    var TH_MONTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    function num(s) { var n = parseFloat(String(s || '').replace(/[^\d.]/g, '')); return isNaN(n) ? null : n; }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function year(y) { y = Number(y); if (y < 100) y += 2500; if (y > 2400) y -= 543; return y; }
    function iso(d, m, y) { return year(y) + '-' + pad(Number(m)) + '-' + pad(Number(d)); }
    function addDays(isoStr, n) { var t = new Date(isoStr + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
    function thDate(isoStr) { var p = isoStr.split('-'); return Number(p[2]) + '/' + Number(p[1]) + '/' + (Number(p[0]) + 543); }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    async function waitFor(fn, ms) { var t = Date.now(); while (Date.now() - t < (ms || 3000)) { if (fn()) return true; await sleep(80); } return false; }

    /** อ่านข้อความ → ออบเจ็กต์ (ช่องที่อ่านไม่ออก = ไม่มี key) */
    function parse(raw) {
        var t = String(raw || '').replace(/\r/g, '').replace(/[ ​]/g, ' ');
        var flat = t.replace(/[ \t]+/g, ' ');
        var o = {}, m;
        var houseLine = (flat.split('\n').filter(function (l) { return /บ้าน/.test(l); })[0] || flat.split('\n')[0] || '');
        for (var i = 0; i < HOUSES.length; i++) if (HOUSES[i].re.test(houseLine)) { o.house = HOUSES[i].key; break; }
        o.houseText = houseLine.replace(/[^\wก-๙ .&-]/g, '').trim();

        var din = flat.match(/check\s*-?\s*in\s*:?\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})([^\n]*)/i);
        var dout = flat.match(/check\s*-?\s*out\s*:?\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})([^\n]*)/i);
        var tm = function (rest) { var x = String(rest || '').match(/(\d{1,2})\s*[.:]\s*(\d{2})/); return x ? pad(Number(x[1])) + ':' + x[2] : ''; };
        if (din) { o.start = iso(din[1], din[2], din[3]); o.startTime = tm(din[4]); }
        if (dout) { o.end = iso(dout[1], dout[2], dout[3]); o.endTime = tm(dout[4]); }
        if (!o.start && (m = flat.match(/พักวันที่\s*(\d{1,2})\s*(\S+)\s*(\d{4})/))) {
            var mi = TH_MONTH.indexOf(m[2]);
            if (mi >= 0) o.start = iso(m[1], mi + 1, m[3]);
        }
        if ((m = flat.match(/พัก\s*(\d+)\s*คืน/))) o.nights = Number(m[1]);
        if (o.start && !o.end && o.nights) o.end = addDays(o.start, o.nights);

        if ((m = flat.match(/จำนวน\s*(\d+)\s*ท่าน/) || flat.match(/(\d+)\s*ท่าน/))) o.guests = Number(m[1]);
        if ((m = flat.match(/(\d+)\s*ห้องนอน/))) o.rooms = Number(m[1]);
        if ((m = flat.match(/ราคาที่พัก[^\d\n]*([\d,]+(?:\.\d+)?)/))) o.price = num(m[1]);
        if ((m = flat.match(/มัดจำ[^\d\n]*([\d,]+(?:\.\d+)?)/))) o.deposit = num(m[1]);
        o.split = /งวดที่\s*2|แบ่งมัดจำ|แบ่งจ่าย/.test(flat);
        if ((m = flat.match(/ส่วนที่เหลือ[^\d\n]*([\d,]+(?:\.\d+)?)/))) o.remain = num(m[1]);
        if ((m = flat.match(/ค่าประกัน(?:บ้านพัก|บ้าน)?[^\d\n]*([\d,]+(?:\.\d+)?)/))) o.insurance = num(m[1]);
        if ((m = flat.match(/รวมจ่าย[^=\n]*=\s*([\d,]+(?:\.\d+)?)/))) o.payDay = num(m[1]);

        var gi = flat.search(/แถม/);
        if (gi >= 0) {
            var gtext = flat.slice(gi);
            o.gifts = [];
            GIFTS.forEach(function (g) { var x = gtext.match(g.re); if (x) o.gifts.push({ n: g.n, label: g.label, qty: Number(x[1]) }); });
        }

        if ((m = flat.match(/ลูกค้า\s*[:：]\s*([^\n]+)/))) o.name = m[1].replace(/^(คุณ|k\.|K\.)\s*/i, '').trim();
        if ((m = flat.match(/(?:เบอร์|โทร)[^\d\n]*([\d\- ,/]{9,})/))) {
            var phones = (m[1].match(/0\d[\d\- ]{7,11}\d/g) || []).map(function (p) { return p.replace(/\D/g, ''); }).filter(function (p) { return p.length >= 9 && p.length <= 10; });
            if (phones.length) o.phones = phones.slice(0, 2);
        }
        if ((m = flat.match(/ช่องทาง(?:การจอง)?\s*[:：]\s*([^\n]+)/))) o.channel = m[1].trim();
        return o;
    }

    function mark($el, cls) {
        $el.addClass(cls || 'paste-filled');
        $el.one('input change', function () { if (!this._pasteSetting) $(this).removeClass('paste-filled paste-need'); });
    }
    function setVal(sel, v) {
        var $el = $(sel);
        if (!$el.length) return false;
        $el.each(function () { this._pasteSetting = true; });
        $el.val(v).trigger('input').trigger('change');
        $el.each(function () { this._pasteSetting = false; });
        // ช่องวันที่ (mobile.js) แสดงผลในช่อง altInput → ทำเครื่องหมายที่ช่องที่มองเห็น
        var fp = $el[0]._flatpickr;
        mark(fp && fp.altInput ? $(fp.altInput) : $el);
        return true;
    }
    function houseCard(key) {
        var h = HOUSES.filter(function (x) { return x.key === key; })[0];
        var found = null;
        $('.listpoolvilla .card-row').each(function () { if (!found && h && h.re.test($(this).text())) found = this; });
        return found;
    }

    async function fill(o) {
        var done = [], miss = [], warn = [];
        if (String($('#houseedit').text() || '').trim()) {
            return Swal.fire({ icon: 'info', title: 'ใช้ได้กับใบจองใหม่เท่านั้น', text: 'ตอนนี้กำลังแก้ไขใบจองเดิม — กลับหน้ารายการบ้านแล้วกดวางข้อความใหม่' });
        }
        // 1) บ้าน
        var inForm = $('.formpoolvilla').is(':visible');
        var curHouse = String($('legend.textedit').text().trim() || '');
        var h = HOUSES.filter(function (x) { return x.key === o.house; })[0];
        if (!h) {
            if (!inForm) return Swal.fire({ icon: 'warning', title: 'อ่านชื่อบ้านไม่ออก', text: 'เลือกบ้านก่อน แล้วกดวางข้อความในหน้าฟอร์มอีกครั้ง' });
            warn.push('อ่านชื่อบ้านในข้อความไม่ออก — ใช้บ้านที่เลือกอยู่ (' + curHouse + ')');
        } else if (!inForm || !h.re.test(curHouse)) {
            if (inForm && curHouse) {
                var ok = await Swal.fire({ icon: 'question', title: 'บ้านไม่ตรงกับที่เลือก', html: 'ข้อความเป็น <b>' + esc(o.houseText) + '</b><br>แต่ฟอร์มเป็น <b>' + esc(curHouse) + '</b><br>เปลี่ยนเป็นบ้านตามข้อความ?', showCancelButton: true, confirmButtonText: 'เปลี่ยนบ้าน', cancelButtonText: 'ยกเลิก' });
                if (!ok.isConfirmed) return;
            }
            var card = houseCard(o.house);
            if (!card) return Swal.fire({ icon: 'warning', title: 'ไม่พบการ์ดบ้าน', text: 'หาการ์ด ' + o.houseText + ' ในหน้ารายการบ้านไม่เจอ — เลือกบ้านเองแล้ววางข้อความในหน้าฟอร์ม' });
            $(card).trigger('click');
            await waitFor(function () { return $('.formpoolvilla').is(':visible'); });
            await sleep(150);
        }
        done.push('บ้าน: ' + $('legend.textedit').text().trim());

        // 2) ลูกค้า
        if (o.name) { setVal('#name', o.name); done.push('ชื่อผู้จอง: ' + o.name); } else { miss.push('ชื่อผู้จอง'); mark($('#name'), 'paste-need'); }
        if (o.phones) { setVal('#tel', o.phones.join(', ')); done.push('เบอร์: ' + o.phones.join(', ')); } else { miss.push('เบอร์ติดต่อ'); mark($('#tel'), 'paste-need'); }
        if (o.channel) { setVal('#bookinguser', o.channel); done.push('ช่องทาง: ' + o.channel); } else { miss.push('ช่องทางการจอง'); mark($('#bookinguser'), 'paste-need'); }

        // 3) วันที่ → script.js สร้างช่องราคาต่อคืนให้
        if (o.start && o.end) {
            setVal('#timestart', o.start);
            setVal('#timeend', o.end);
            if (o.startTime) setVal('#starttime', o.startTime);
            if (o.endTime) setVal('#endtime', o.endTime);
            await sleep(100);
            if (!$('#timestart').val() || !$('#timeend').val()) warn.push('วันที่ ' + o.start + ' – ' + o.end + ' ถูกจองไว้แล้ว — เลือกวันใหม่');
            else done.push('เข้า ' + thDate(o.start) + ' ' + (o.startTime || '') + ' · ออก ' + thDate(o.end) + ' ' + (o.endTime || '') + ' (' + $('#timevalue').val() + ' คืน)');
            if (o.nights && Number($('#timevalue').val()) !== o.nights) warn.push('ข้อความบอก ' + o.nights + ' คืน แต่วันที่คำนวณได้ ' + $('#timevalue').val() + ' คืน');
        } else miss.push('วันเข้า/ออก');

        // 4) ราคาต่อคืน = ราคาที่พักหารเท่ากัน (เศษไว้คืนสุดท้าย)
        var $nights = $('.nights .night-input');
        if (o.price && $nights.length) {
            var per = Math.floor(o.price / $nights.length), rest = o.price - per * $nights.length;
            $nights.each(function (i) { setVal(this, String(per + (i === $nights.length - 1 ? rest : 0))); });
            done.push('ราคาที่พัก ' + money(o.price) + ' บาท' + ($nights.length > 1 ? ' (แบ่งเท่ากัน ' + $nights.length + ' คืน — ตรวจถ้าราคาแต่ละคืนไม่เท่ากัน)' : ''));
        } else if (!o.price) miss.push('ราคาที่พัก');

        // 5) รายละเอียดเข้าพัก / ค่าประกัน
        if (o.guests) { setVal('#quser', String(o.guests)); done.push('ผู้เข้าพัก ' + o.guests + ' ท่าน'); } else miss.push('จำนวนผู้เข้าพัก');
        if (o.rooms) { setVal('#qroom', String(o.rooms)); done.push(o.rooms + ' ห้องนอน'); } else miss.push('จำนวนห้อง');
        if (o.insurance != null) { setVal('#totalhouse', String(o.insurance)); done.push('ค่าประกัน ' + money(o.insurance) + ' บาท'); } else miss.push('ค่าประกันบ้านพัก');

        // 6) ของแถม
        (o.gifts || []).forEach(function (g) {
            var $c = $('#free_' + g.n);
            if (!$c.length) return;
            if (!$c.is(':checked')) $c.trigger('click');
            setVal('#free_price_' + g.n, String(g.qty));
            done.push('แถม' + g.label + ' ' + g.qty);
        });

        // 7) มัดจำ → เลือกโอนจ่าย/ไม่แบ่ง ถ้ายังไม่เลือก แล้วใส่ยอด
        if (o.deposit) {
            if (!$('#pay_1').is(':checked') && !$('#pay_2').is(':checked')) $('#pay_2').trigger('click');
            await waitFor(function () { return $('#paytotal').length; });
            if (!$('#deposit1').is(':checked') && !$('#deposit2').is(':checked')) $(o.split ? '#deposit1' : '#deposit2').trigger('click');
            await sleep(80);
            setVal('#paytotal', String(o.deposit));
            done.push('มัดจำ ' + money(o.deposit) + ' บาท (' + ($('#pay_2').is(':checked') ? 'โอนจ่าย' : 'เงินสด') + ')');
            if (o.split) { warn.push('ข้อความเป็นแบบแบ่งมัดจำ — กรอกยอดงวดที่ 1/2 เอง'); mark($('#paytotal1, #paytotal2'), 'paste-need'); }
        } else miss.push('ยอดมัดจำ');
        if ($('#pay_2').is(':checked')) {
            mark($('#paylist'), 'paste-need'); mark($('#slip'), 'paste-need');
            miss.push('บัญชีรับเงิน + สลิปมัดจำ');
        }

        // 8) เทียบยอดกับข้อความ
        await sleep(150);
        var overdue = num($('#overdue').val());
        var expect = o.payDay != null ? o.payDay : (o.remain != null && o.insurance != null ? o.remain + o.insurance : null);
        if (expect != null && overdue != null) {
            if (Math.abs(overdue - expect) < 0.01) done.push('✅ ค้างชำระ ' + money(overdue) + ' ตรงกับยอดจ่ายวันพักในข้อความ');
            else warn.push('ค้างชำระในฟอร์ม ' + money(overdue) + ' ไม่ตรงกับข้อความ (' + money(expect) + ') — ตรวจราคา/มัดจำ/ค่าประกัน');
        }
        miss.push('พนักงานปิดการขาย / ค่าคอม (กล่องค่าคอม)');

        var html = '<div style="text-align:left;font-size:.92rem;line-height:1.55">' +
            '<b>เติมให้แล้ว</b> <span style="color:#1667c7">(กรอบฟ้า)</span><br>' + done.map(function (x) { return '• ' + esc(x); }).join('<br>') +
            (warn.length ? '<br><br><b style="color:#c0392b">ต้องตรวจ</b><br>' + warn.map(function (x) { return '⚠️ ' + esc(x); }).join('<br>') : '') +
            (miss.length ? '<br><br><b style="color:#b26a00">ยังต้องกรอกเอง</b> <span style="color:#b26a00">(กรอบส้ม)</span><br>' + miss.map(function (x) { return '• ' + esc(x); }).join('<br>') : '') +
            '<br><br><small>ตรวจทุกช่องอีกครั้งก่อนกดบันทึก</small></div>';
        Swal.fire({ icon: warn.length ? 'warning' : 'success', title: 'เติมข้อมูลจากข้อความแล้ว', html: html, confirmButtonText: 'ตรวจฟอร์ม' });
    }

    async function openPaste() {
        var r = await Swal.fire({
            title: 'วางข้อความปิดการขาย',
            html: '<div style="font-size:.85rem;color:#5a7189;text-align:left">คัดลอกข้อความสรุปจากกลุ่ม Lark "ใบจอง" มาวาง ระบบจะเติมบ้าน วันที่ ราคา มัดจำ ค่าประกัน ของแถม ' +
                'และ ลูกค้า: / เบอร์: / ช่องทาง: ให้ — <b>ยังไม่บันทึก</b> จนกว่าจะกดบันทึกเอง</div>',
            input: 'textarea',
            inputPlaceholder: 'วางข้อความที่นี่…',
            inputAttributes: { rows: 10, 'aria-label': 'ข้อความปิดการขาย' },
            showCancelButton: true,
            confirmButtonText: 'เติมข้อมูล',
            cancelButtonText: 'ยกเลิก',
            inputValidator: function (v) { return String(v || '').trim().length < 20 ? 'วางข้อความปิดการขายก่อน' : null; }
        });
        if (!r.isConfirmed) return;
        try { await fill(parse(r.value)); }
        catch (e) { console.error('paste fill', e); Swal.fire({ icon: 'error', title: 'เติมข้อมูลไม่สำเร็จ', text: String(e && e.message || e) }); }
    }

    var BAR = '<div class="paste-bar"><button type="button" class="btn btn-primary paste-open"><i class="bi bi-clipboard-check me-1"></i>วางข้อความปิดการขาย</button>' +
        '<span class="paste-hint">วางสรุปจาก Lark ระบบเติมฟอร์มให้</span></div>';

    $(document).ready(function () {
        // ใส่หลัง ready ของไฟล์อื่น (removeinvalid ล้างเฉพาะ input — แถบนี้มีแต่ปุ่ม)
        $('.listpoolvilla > .container > .row > fieldset > legend').first().after(BAR);
        $('#formpoolvilla > .container > .row > fieldset > legend').first().after(BAR);
        $(document).on('click', '.paste-open', openPaste);
    });

    window.pailayPaste = { parse: parse }; // ใช้ทดสอบในคอนโซล
})();
