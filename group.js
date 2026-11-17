/* ใบจองหลายหลัง 2–4 หลัง (16 พ.ย. 2569) — ฟอร์มแยก ไม่แก้ script.js
 *
 * ปุ่ม "จองหลายหลัง" ในหน้ารายการบ้าน → หน้า .groupform
 *   ลูกค้า (ครั้งเดียว) · บ้าน 2–4 การ์ด (วัน/ราคาแต่ละคืน/ผู้พัก/ห้อง/ที่นอนเสริม/สัตว์/ค่าประกัน/หมายเหตุใต้ชื่อบ้าน)
 *   ราคาแพ็กเกจ (แบ่งตามสัดส่วนราคาปกติ) · บริการ ต่อหลัง/รวม · อาหารเช้า · หมายเหตุกลุ่ม (ตัวแดง)
 *   ตารางนายหน้า + ค่าคอม (แบ่งตามสัดส่วนราคา) · ใบในนามบริษัท
 *   มัดจำก้อนเดียว สลิปเดียว (แบ่งลงแต่ละหลังตามสัดส่วนราคา แก้ได้) — รอบแรกไม่แบ่งงวด
 * → opt=savegroup (หลังบ้าน group.gs: ใบจองบ้านละ 1 UID + PDF รวมใบเดียว + การ์ด Lark 1 ใบ)
 */
(function () {
    'use strict';
    var MAXH = 4, MINH = 2;
    var opts = null; // getcommissionoptions
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function addDays(ymd, n) { var p = ymd.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function nightsBetween(a, b) { if (!a || !b) return 0; var x = a.split('-'), y = b.split('-'); return Math.round((new Date(+y[0], +y[1] - 1, +y[2]) - new Date(+x[0], +x[1] - 1, +x[2])) / 864e5); }
    function houses() { return (typeof room !== 'undefined' && Array.isArray(room)) ? room : []; }
    function banks() { return (typeof bank !== 'undefined' && Array.isArray(bank)) ? bank.map(function (b) { return b[0]; }) : []; }
    function isWalkin(ch) { return /walk\s*-?\s*in/i.test(String(ch || '')); }
    function api(opt, data) {
        return fetch(scriptUrl, { method: 'POST', body: new URLSearchParams(Object.assign({ opt: opt }, data || {})), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(function (r) { return r.json(); });
    }
    function fileData(input) {
        return new Promise(function (res, rej) { var f = input && input.files && input.files[0]; if (!f) return res(''); var r = new FileReader(); r.onload = function (e) { res(e.target.result); }; r.onerror = rej; r.readAsDataURL(f); });
    }
    // วันที่ถูกจองแล้ว (dayroom: [บ้าน, เริ่ม, สิ้นสุด]) — ช่วงคืนที่พัก [in, out)
    function ymdOf(x) { var d = new Date(x); return isNaN(d) ? '' : d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function overlap(houseFull, din, dout) {
        var dr = (typeof dayroom !== 'undefined' && Array.isArray(dayroom)) ? dayroom : [];
        if (EDIT) { // แก้ไขใบรวม: ไม่นับช่วงวันเดิมของบ้านในกลุ่มนี้เอง
            var own = Object.keys(EDIT.byK).map(function (k) { return EDIT.byK[k].orig; });
            dr = dr.filter(function (r) { return !own.some(function (o) { return o.house === r[0] && o.din === ymdOf(r[1]) && o.dout === ymdOf(r[2]); }); });
        }
        var a = new Date(din + 'T00:00:00'), b = new Date(dout + 'T00:00:00');
        return dr.some(function (r) {
            if (r[0] !== houseFull) return false;
            var s = new Date(r[1]), e = new Date(r[2]);
            s = new Date(s.getFullYear(), s.getMonth(), s.getDate()); e = new Date(e.getFullYear(), e.getMonth(), e.getDate());
            return a < e && b > s;
        });
    }

    /* ---------- หน้าฟอร์ม ---------- */
    function fl(cls, label, type, extra) { return '<div class="form-floating mb-1"><input class="form-control ' + cls + '" type="' + (type || 'text') + '" placeholder="' + label + '" ' + (extra || '') + '><label>' + label + '</label></div>'; }
    var PAGE =
        '<main class="groupform mt-5" style="display:none"><div class="container"><div class="row">' +
        '<button class="btn btn-outline-danger w-100 mb-2 g-back">กลับหน้ารายการบ้าน</button>' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm"><legend class="float-none w-auto px-3 g-title">ใบจองหลายหลัง (2–4 หลัง)</legend><div class="g-editnote alert alert-warning py-2 small" style="display:none"></div>' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row"><legend class="float-none w-auto px-3">ข้อมูลผู้เข้าพัก</legend>' +
        '<div class="col-12 col-md-6">' + fl('g-name', 'ชื่อผู้จอง *') + '</div>' +
        '<div class="col-6 col-md-3">' + fl('g-tel', 'เบอร์ติดต่อ *', 'text', 'inputmode="tel" maxlength="16"') + '</div>' +
        '<div class="col-6 col-md-3">' + fl('g-tel2', 'เบอร์ติดต่อ 2', 'text', 'inputmode="tel" maxlength="16"') + '</div>' +
        '<div class="col-6 col-md-4">' + fl('g-fb', 'Facebook') + '</div>' +
        '<div class="col-6 col-md-4">' + fl('g-line', 'Line') + '</div>' +
        '<div class="col-12 col-md-4"><div class="form-floating mb-1"><select class="form-select g-channel"><option value="">— เลือกช่องทางการจอง —</option></select><label>ช่องทางการจอง *</label></div></div>' +
        '<div class="col-12 mt-1"><div class="form-check form-switch"><input class="form-check-input g-comp-on" type="checkbox"><label class="form-check-label">ลูกค้าเป็นบริษัท — ออกใบจองในนามบริษัท</label></div></div>' +
        '<div class="g-comp row g-1 mt-1" style="display:none">' +
        '<div class="col-12 col-md-8">' + fl('g-comp-name', 'ชื่อบริษัท *') + '</div><div class="col-12 col-md-4">' + fl('g-comp-branch', 'สาขา', 'text', 'value="สำนักงานใหญ่"') + '</div>' +
        '<div class="col-12">' + fl('g-comp-addr', 'ที่อยู่บริษัท *') + '</div><div class="col-12 col-md-6">' + fl('g-comp-tax', 'เลขผู้เสียภาษี 13 หลัก *', 'text', 'inputmode="numeric" maxlength="17"') + '</div></div>' +
        '</fieldset>' +
        '<div class="g-houses"></div>' +
        '<button type="button" class="btn btn-outline-primary w-100 mb-3 g-add">+ เพิ่มบ้าน (สูงสุด 4 หลัง)</button>' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row"><legend class="float-none w-auto px-3">ราคาและบริการของกลุ่ม</legend>' +
        '<div class="col-12 mb-1"><div class="form-check form-switch"><input class="form-check-input g-pkg-on" type="checkbox"><label class="form-check-label">ราคาแพ็กเกจ (ใบจองแสดงราคารวมอย่างเดียว · ระบบแบ่งลงแต่ละหลังตามสัดส่วนราคาปกติ)</label></div></div>' +
        '<div class="col-12 col-md-6 g-pkg" style="display:none">' + fl('g-pkg-total', 'ราคาแพ็กเกจรวม *', 'text', 'inputmode="decimal"') + '</div>' +
        '<div class="col-12 mt-1 fw-semibold">บริการ / ของแถม</div>' +
        '<div class="col-12 mb-1"><div class="btn-group w-100" role="group"><input type="radio" class="btn-check" name="g-per" id="g-per-1" value="1" checked><label class="btn btn-outline-primary" for="g-per-1">ต่อหลัง (ทุกหลังได้เท่ากัน)</label>' +
        '<input type="radio" class="btn-check" name="g-per" id="g-per-0" value="0"><label class="btn btn-outline-primary" for="g-per-0">รวมทั้งกลุ่ม</label></div></div>' +
        '<div class="col-4">' + fl('g-ice', 'น้ำแข็ง (กระสอบ)', 'text', 'inputmode="numeric"') + '</div>' +
        '<div class="col-4">' + fl('g-water', 'น้ำดื่ม (แพ็ค)', 'text', 'inputmode="numeric"') + '</div>' +
        '<div class="col-4">' + fl('g-coal', 'ถ่านปิ้งย่าง (ถุง)', 'text', 'inputmode="numeric"') + '</div>' +
        '<div class="col-12">' + fl('g-other', 'บริการอื่น (คั่นด้วย ,)') + '<div class="small text-muted mb-1">เช่น บริการล้างจานฟรี 1 ครั้ง (09:30 น.)</div></div>' +
        '<div class="col-12 col-md-8">' + fl('g-breakfast', 'แถมอาหารเช้า (ถ้ามี)') + '</div>' +
        '<div class="col-12 col-md-4">' + fl('g-mat', 'ที่นอนปิกนิก บาท/ท่าน', 'text', 'inputmode="numeric" value="500"') + '</div>' +
        '<div class="col-12 fw-semibold mt-1">VAT 7% (ฐาน = ค่าที่พัก ไม่รวมค่าประกัน)</div>' +
        '<div class="col-12 mb-1"><div class="btn-group w-100 flex-wrap"><input type="radio" class="btn-check" name="g-vat" id="g-vat-n" value="none" checked><label class="btn btn-sm btn-outline-primary" for="g-vat-n">ไม่มี VAT</label>' +
        '<input type="radio" class="btn-check" name="g-vat" id="g-vat-e" value="excl"><label class="btn btn-sm btn-outline-primary" for="g-vat-e">ราคายังไม่รวม VAT (+7%)</label>' +
        '<input type="radio" class="btn-check" name="g-vat" id="g-vat-i" value="incl"><label class="btn btn-sm btn-outline-primary" for="g-vat-i">ราคารวม VAT แล้ว</label></div></div>' +
        '<div class="col-12"><div class="form-floating mb-1"><textarea class="form-control g-note" placeholder="หมายเหตุ" style="height:80px"></textarea><label>หมายเหตุพิเศษ (ตัวแดง)</label></div></div>' +
        '</fieldset>' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row"><legend class="float-none w-auto px-3">ตารางนายหน้า + ค่าคอม</legend>' +
        '<div class="col-12">' + fl('g-cal', 'ข้อความลงตาราง *') + '</div>' +
        '<div class="col-12 g-mode" style="display:none"><div class="fw-semibold mb-1">Walk in — ปิดการขายโดย</div><div class="btn-group w-100 mb-1"><input type="radio" class="btn-check" name="g-mode" id="g-mode-a" value="admin"><label class="btn btn-outline-primary" for="g-mode-a">แอดมิน</label><input type="radio" class="btn-check" name="g-mode" id="g-mode-g" value="agent"><label class="btn btn-outline-primary" for="g-mode-g">เอเจ้น</label></div></div>' +
        '<div class="col-12 g-admin"><div class="fw-semibold mb-1">พนักงานปิดการขาย (สูงสุด 3 คน)</div><div class="g-staff d-flex flex-wrap gap-2 mb-1"></div>' +
        '<div class="row g-1"><div class="col-6"><div class="form-floating mb-1"><select class="form-select g-issuer"><option value="">เลือก</option></select><label>ผู้ออกใบจอง *</label></div></div>' +
        '<div class="col-6">' + fl('g-h', 'ค่าคอมแอดมินรวม *', 'text', 'inputmode="decimal"') + '</div></div></div>' +
        '<div class="col-12 g-agent" style="display:none">' + fl('g-g', 'ค่าคอมเอเจ้นรวม * (ไม่มีใส่ 0)', 'text', 'inputmode="decimal"') + '</div>' +
        '<div class="col-12 small text-muted">ค่าคอมรวมจะแบ่งลงแต่ละหลังตามสัดส่วนราคา</div>' +
        '</fieldset>' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row g-paidfs" style="display:none"><legend class="float-none w-auto px-3">ยอดที่ชำระแล้ว (ไม่เปลี่ยน)</legend><div class="col-12 g-paid"></div><div class="col-12 mt-2"><div class="g-sum2 p-2 rounded" style="background:rgba(13,110,253,.06)"></div></div></fieldset>' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row g-payfs"><legend class="float-none w-auto px-3">ชำระมัดจำ (ก้อนเดียว)</legend>' +
        '<div class="col-12 mb-1"><div class="btn-group w-100"><input type="radio" class="btn-check" name="g-pay" id="g-pay-1" value="เงินสด"><label class="btn btn-outline-primary" for="g-pay-1">เงินสด</label>' +
        '<input type="radio" class="btn-check" name="g-pay" id="g-pay-2" value="โอนจ่าย" checked><label class="btn btn-outline-primary" for="g-pay-2">โอนจ่าย</label>' +
        '<input type="radio" class="btn-check" name="g-pay" id="g-pay-3" value="card"><label class="btn btn-outline-primary" for="g-pay-3">บัตรเครดิต</label></div></div>' +
        '<div class="col-12 g-cardnote small mb-1" style="display:none"></div>' +
        '<div class="col-6">' + fl('g-paydate', 'วันที่รับเงิน *', 'date') + '</div>' +
        '<div class="col-6">' + fl('g-deposit', 'ยอดมัดจำรวม *', 'text', 'inputmode="decimal"') + '</div>' +
        '<div class="col-12 g-bankwrap"><div class="form-floating mb-1"><select class="form-select g-bank"><option value="">เลือกบัญชี</option></select><label>รับเงินผ่านบัญชี *</label></div>' +
        '<label class="form-label small mb-1">สลิปโอนเงิน *</label><input type="file" accept="image/*" class="form-control mb-1 g-slip">' +
        '<div class="g-ms"><div class="g-ms-first" style="display:none">' + fl('g-ms-amt1', 'ยอดสลิปที่ 1 (สลิปด้านบน) *', 'text', 'inputmode="decimal"') + '</div><div class="g-ms-rows"></div>' +
        '<button type="button" class="btn btn-sm btn-outline-primary w-100 g-ms-add">+ ลูกค้าโอนหลายสลิป (สูงสุด 3 สลิป)</button></div></div>' +
        '<div class="col-12 mt-1"><div class="fw-semibold">แบ่งมัดจำลงแต่ละหลัง <span class="small text-muted">(ตามสัดส่วนราคา แก้ได้)</span></div><div class="g-alloc"></div></div>' +
        '<div class="col-12 mt-2"><div class="g-sum p-2 rounded" style="background:rgba(13,110,253,.06)"></div></div>' +
        '</fieldset>' +
        '<button type="button" class="btn btn-primary w-100 mb-5 g-save">บันทึกใบจองหลายหลัง</button>' +
        '</fieldset></div></div></main>';

    function houseCard(k) {
        var hopts = houses().map(function (h, i) { return '<option value="' + i + '">' + esc(h[0]) + '</option>'; }).join('');
        return '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row g-house" data-k="' + k + '"><legend class="float-none w-auto px-3">บ้านหลังที่ <span class="g-no"></span></legend>' +
            '<div class="col-12 d-flex justify-content-end"><button type="button" class="btn btn-sm btn-outline-danger g-del">ลบหลังนี้</button></div>' +
            '<div class="col-12"><div class="form-floating mb-1"><select class="form-select h-house"><option value="">— เลือกบ้าน —</option>' + hopts + '</select><label>บ้าน *</label></div></div>' +
            '<div class="col-6 col-md-3">' + fl('h-in', 'วันเข้า *', 'date') + '</div><div class="col-6 col-md-3">' + fl('h-tin', 'เวลาเข้า', 'time', 'value="14:00"') + '</div>' +
            '<div class="col-6 col-md-3">' + fl('h-out', 'วันออก *', 'date') + '</div><div class="col-6 col-md-3">' + fl('h-tout', 'เวลาออก', 'time', 'value="11:00"') + '</div>' +
            '<div class="col-12 h-nights row g-1 mx-0"></div>' +
            '<div class="col-6 col-md-3">' + fl('h-guests', 'ผู้เข้าพัก (ท่าน) *', 'text', 'inputmode="numeric"') + '</div>' +
            '<div class="col-6 col-md-3">' + fl('h-cap', 'พักได้ (ท่าน) *', 'text', 'inputmode="numeric"') + '</div>' +
            '<div class="col-12 col-md-6">' + fl('h-rooms', 'ห้องนอน/ห้องน้ำ') + '</div>' +
            '<div class="col-6 col-md-3">' + fl('h-bedq', 'ที่นอนเสริม (ที่)', 'text', 'inputmode="numeric"') + '</div>' +
            '<div class="col-6 col-md-3">' + fl('h-bedb', 'ค่าที่นอนเสริม', 'text', 'inputmode="decimal"') + '</div>' +
            '<div class="col-4 col-md-2">' + fl('h-pett', 'สัตว์เลี้ยง') + '</div><div class="col-4 col-md-2">' + fl('h-petq', 'จำนวน', 'text', 'inputmode="numeric"') + '</div><div class="col-4 col-md-2">' + fl('h-petb', 'ค่าสัตว์', 'text', 'inputmode="decimal"') + '</div>' +
            '<div class="col-6 col-md-3">' + fl('h-ins', 'ค่าประกัน (บาท) *', 'text', 'inputmode="decimal"') + '</div>' +
            '<div class="col-12 col-md-9">' + fl('h-note', 'หมายเหตุใต้ชื่อบ้าน') + '</div>' +
            '<div class="col-12 small h-sum text-end fw-semibold"></div>' +
            '</fieldset>';
    }

    var $p;
    var EDIT = null; // แก้ไขใบรวม: { gid, byK: { cardKey: { uid, paid, row, orig } } }
    var GROUPS = {}; // UID → GroupID (opt=grouplist)
    function cards() { return $p.find('.g-house'); }
    function renumber() {
        cards().each(function (i) { $(this).find('.g-no').text(i + 1); });
        $p.find('.g-del').toggle(!EDIT && cards().length > MINH);
        $p.find('.g-add').toggle(!EDIT && cards().length < MAXH);
    }
    function drawNights($c) {
        var n = nightsBetween($c.find('.h-in').val(), $c.find('.h-out').val());
        var keep = $c.find('.h-night').map(function () { return this.value; }).get();
        var h = '';
        if (n > 0 && n <= 31) for (var i = 0; i < n; i++) h += '<div class="col-6 col-md-3">' + fl('h-night', 'ราคาคืนที่ ' + (i + 1) + ' *', 'text', 'inputmode="decimal"') + '</div>';
        $c.find('.h-nights').html(h);
        $c.find('.h-night').each(function (i) { if (keep[i] !== undefined) this.value = keep[i]; else if (keep.length) this.value = keep[keep.length - 1]; });
    }
    function addHouse(prefill) {
        var $c = $(houseCard(Date.now())).appendTo($p.find('.g-houses'));
        var first = cards().first();
        if (prefill !== false && cards().length > 1) { // ค่าเริ่มต้นวันเดียวกับหลังแรก
            $c.find('.h-in').val(first.find('.h-in').val()); $c.find('.h-out').val(first.find('.h-out').val());
            $c.find('.h-tin').val(first.find('.h-tin').val()); $c.find('.h-tout').val(first.find('.h-tout').val());
            drawNights($c);
        }
        renumber(); recalc();
    }

    /* ---------- คำนวณ ---------- */
    function houseData($c) {
        var hi = $c.find('.h-house').val(), H = hi === '' ? null : (hi === 'x' ? [$c.find('.h-house option:selected').text()] : houses()[+hi]);
        var nights = $c.find('.h-night').map(function () { return num(this.value); }).get();
        return {
            $c: $c, house: H, full: H ? H[0] : '', din: $c.find('.h-in').val(), dout: $c.find('.h-out').val(), tin: $c.find('.h-tin').val() || '14:00', tout: $c.find('.h-tout').val() || '11:00',
            nights: nights, room: nights.reduce(function (a, b) { return a + b; }, 0), guests: num($c.find('.h-guests').val()), cap: num($c.find('.h-cap').val()),
            rooms: String($c.find('.h-rooms').val() || '').trim(), bedq: num($c.find('.h-bedq').val()), bedb: num($c.find('.h-bedb').val()),
            pett: String($c.find('.h-pett').val() || '').trim(), petq: num($c.find('.h-petq').val()), petb: num($c.find('.h-petb').val()),
            ins: num($c.find('.h-ins').val()), note: String($c.find('.h-note').val() || '').trim()
        };
    }
    function split(total, weights) { // แบ่งตามสัดส่วน (จำนวนเต็ม หลังสุดท้ายรับเศษ)
        var sw = weights.reduce(function (a, b) { return a + b; }, 0), out = [], acc = 0;
        weights.forEach(function (w, i) { var v = i === weights.length - 1 ? Math.round((total - acc) * 100) / 100 : (sw ? Math.round(total * w / sw) : Math.round(total / weights.length)); out.push(v); acc += v; });
        return out;
    }
    function computed() {
        var hs = cards().map(function () { return houseData($(this)); }).get();
        var pkgOn = $p.find('.g-pkg-on').is(':checked'), pkgTotal = num($p.find('.g-pkg-total').val());
        hs.forEach(function (h) { h.base = h.room; h.price = h.room + h.bedb + h.petb; });
        if (pkgOn && pkgTotal > 0) { // แบ่งราคาแพ็กเกจตามสัดส่วนราคาปกติ → ปรับราคาแต่ละคืนตามสัดส่วน
            var alloc = split(pkgTotal, hs.map(function (h) { return h.price || 1; }));
            hs.forEach(function (h, i) {
                var roomPart = Math.max(0, alloc[i] - h.bedb - h.petb), f = h.room ? roomPart / h.room : 0;
                var ns = h.nights.map(function (v) { return Math.round(v * f); });
                if (ns.length) ns[ns.length - 1] += roomPart - ns.reduce(function (a, b) { return a + b; }, 0);
                h.nights = ns; h.room = roomPart; h.price = alloc[i];
            });
        }
        var vm = $p.find('input[name=g-vat]:checked').val() || 'none';
        hs.forEach(function (h) { h.vat = window.pailayVat ? window.pailayVat.calc(vm, h.price) : 0; h.vatMode = vm; h.totalall = h.price + (vm === 'excl' ? h.vat : 0) + h.ins; });
        var vatSum = hs.reduce(function (a, h) { return a + h.vat; }, 0);
        return { hs: hs, vatMode: vm, vat: vatSum, vatAdd: vm === 'excl' ? vatSum : 0, total: hs.reduce(function (a, h) { return a + h.price; }, 0), ins: hs.reduce(function (a, h) { return a + h.ins; }, 0) };
    }
    var allocDirty = false;
    function recalc() {
        var c = computed(), dep = num($p.find('.g-deposit').val());
        c.hs.forEach(function (h) { h.$c.find('.h-sum').text(h.house ? 'ค่าที่พัก ' + money(h.price) + ' · ค่าประกัน ' + money(h.ins) : ''); });
        var $a = $p.find('.g-alloc'), cur = $a.find('.g-al').map(function () { return this.value; }).get();
        var def = split(dep, c.hs.map(function (h) { return h.price || 1; }));
        var html = c.hs.map(function (h, i) { return '<div class="input-group input-group-sm mb-1"><span class="input-group-text" style="min-width:55%">' + (i + 1) + '. ' + esc(h.full || 'ยังไม่เลือกบ้าน') + '</span><input class="form-control g-al text-end" inputmode="decimal" value="' + (allocDirty && cur[i] !== undefined ? cur[i] : def[i]) + '"></div>'; }).join('');
        $a.html(html);
        var al = $a.find('.g-al').map(function () { return num(this.value); }).get(), sumAl = al.reduce(function (a, b) { return a + b; }, 0);
        var cardOn = $p.find('input[name=g-pay]:checked').val() === 'card';
        $p.find('.g-cardnote').toggle(cardOn).html(cardOn ? '💳 ค่าธรรมเนียมบัตร 3% = <b>' + money(window.pailayCard ? window.pailayCard.fee(dep) : 0) + '</b> บาท (ลูกค้าจ่ายเพิ่ม) · ยอดรูดรวม <b>' + money(dep + (window.pailayCard ? window.pailayCard.fee(dep) : 0)) + '</b> · ยอดเข้าบัญชีบริษัทกสิกร' : '');
        $p.find('.g-sum').html('ราคารวม <b>' + money(c.total) + '</b>' + (c.vat ? ' · ' + (c.vatMode === 'incl' ? '(รวม VAT 7% แล้ว ' : 'VAT 7% <b>') + money(c.vat) + (c.vatMode === 'incl' ? ')' : '</b>') : '') + ' · มัดจำ <b>' + money(dep) + '</b> · จ่ายวันเข้าพัก <b>' + money(c.total + c.vatAdd - dep) + '</b> · ค่าประกันรวม ' + c.hs.length + ' หลัง <b>' + money(c.ins) + '</b><br>' +
            'ราคาจ่ายวันเข้าพักรวมทั้งหมด <b class="fs-5">' + money(c.total + c.vatAdd - dep + c.ins) + '</b>' + (Math.abs(sumAl - dep) > 0.01 ? '<br><span class="text-danger">⚠️ ผลรวมที่แบ่ง ' + money(sumAl) + ' ไม่เท่ามัดจำ ' + money(dep) + '</span>' : ''));
        if (EDIT) {
            var paidSum = 0;
            $p.find('.g-paid').html(c.hs.map(function (h, i) { var e = EDIT.byK[h.$c.data('k')] || {}; paidSum += e.paid || 0; return '<div class="d-flex justify-content-between small"><span>' + (i + 1) + '. ' + esc(h.full) + '</span><b>' + money(e.paid || 0) + '</b></div>'; }).join(''));
            $p.find('.g-sum2').html('ราคารวม <b>' + money(c.total) + '</b>' + (c.vat ? ' · VAT 7% ' + money(c.vat) : '') + ' · ชำระแล้ว <b>' + money(paidSum) + '</b> · ค่าประกันรวม <b>' + money(c.ins) + '</b><br>ราคาจ่ายวันเข้าพักรวมทั้งหมด <b class="fs-5">' + money(c.total + c.vatAdd + c.ins - paidSum) + '</b>' + (c.total + c.vatAdd + c.ins - paidSum < 0 ? '<br><span class="text-danger">⚠️ ยอดใหม่น้อยกว่าที่ชำระแล้ว</span>' : ''));
        }
        return c;
    }

    /* ---------- ค่าคอม ---------- */
    function isOwn(ch) { return !!(opts && (opts.ownChannels || []).indexOf(ch) !== -1); }
    function agentMode() {
        var ch = $p.find('.g-channel').val();
        if (isWalkin(ch)) { var m = $p.find('input[name=g-mode]:checked').val(); return m ? m === 'agent' : null; }
        return opts && (opts.ownChannels || []).length ? !isOwn(ch) : /^\s*agen/i.test(ch);
    }
    function syncComm() {
        var ch = $p.find('.g-channel').val();
        $p.find('.g-mode').toggle(isWalkin(ch));
        var ag = agentMode();
        $p.find('.g-agent').toggle(ag === true);
        $p.find('.g-admin').toggle(ag === false);
    }
    function loadOpts() {
        if (opts) return Promise.resolve(opts);
        return api('getcommissionoptions').then(function (r) {
            opts = (r && r.status === 'success') ? r : { channels: [], staff: [], issuers: [], ownChannels: [] };
            var $ch = $p.find('.g-channel'); opts.channels.forEach(function (c) { $ch.append($('<option>').val(c).text(c)); });
            var $s = $p.find('.g-staff');
            opts.staff.filter(function (s) { return s.indexOf('+') === -1; }).concat(['-']).forEach(function (s, i) {
                $s.append('<input type="checkbox" class="btn-check g-st" id="g-st-' + i + '" value="' + esc(s) + '"><label class="btn btn-sm btn-outline-primary" for="g-st-' + i + '">' + (s === '-' ? 'ไม่มีพนักงาน' : esc(s)) + '</label>');
            });
            var $is = $p.find('.g-issuer'); opts.issuers.forEach(function (s) { $is.append($('<option>').val(s).text(s)); });
            return opts;
        }).catch(function () { opts = { channels: [], staff: [], issuers: [], ownChannels: [] }; return opts; });
    }

    /* ---------- หลายสลิป (โอนจ่าย) — มัดจำรวม = ผลรวมสลิป · หลังบ้านกระจายสลิปลงแต่ละหลัง (multislip.gs) ---------- */
    function msRows() { return $p.find('.g-ms-row'); }
    function msRow(k) {
        var opts = banks().map(function (b) { return '<option value="' + esc(b) + '">' + esc(b) + '</option>'; }).join('');
        return '<div class="g-ms-row border rounded p-2 mb-1"><div class="d-flex justify-content-between align-items-center mb-1"><b class="small g-ms-lab">สลิปที่ ' + k + '</b><button type="button" class="btn btn-sm btn-outline-danger py-0 g-ms-del">ลบ</button></div>' +
            fl('g-ms-amt', 'ยอดสลิปที่ ' + k + ' *', 'text', 'inputmode="decimal"') +
            '<div class="form-floating mb-1"><select class="form-select g-ms-acc"><option value="">เลือกบัญชี</option>' + opts + '</select><label>รับเงินผ่านบัญชี *</label></div>' +
            '<input type="file" accept="image/*" class="form-control g-ms-file"></div>';
    }
    function msSync() {
        var n = msRows().length, on = $p.find('input[name=g-pay]:checked').val() === 'โอนจ่าย';
        $p.find('.g-ms').toggle(on);
        msRows().each(function (i) { $(this).find('.g-ms-lab').text('สลิปที่ ' + (i + 2)); });
        $p.find('.g-ms-first').toggle(n > 0);
        $p.find('.g-ms-add').toggle(n < 2).text(n ? '+ เพิ่มสลิปที่ ' + (n + 2) : '+ ลูกค้าโอนหลายสลิป (สูงสุด 3 สลิป)');
        var $d = $p.find('.g-deposit');
        if (n > 0 && on) {
            var sum = num($p.find('.g-ms-amt1').val());
            msRows().each(function () { sum += num($(this).find('.g-ms-amt').val()); });
            $d.prop('readonly', true);
            if (num($d.val()) !== sum) { $d.val(sum || ''); allocDirty = false; recalc(); }
        } else $d.prop('readonly', false);
    }
    function msActive() { return msRows().length > 0 && $p.find('input[name=g-pay]:checked').val() === 'โอนจ่าย'; }
    function msValidate() {
        if (!msActive()) return '';
        if (!(num($p.find('.g-ms-amt1').val()) > 0)) return 'กรุณาใส่ยอดสลิปที่ 1';
        var err = '';
        msRows().each(function (i) {
            if (err) return;
            var $r = $(this), k = i + 2;
            if (!(num($r.find('.g-ms-amt').val()) > 0)) err = 'กรุณาใส่ยอดสลิปที่ ' + k;
            else if (!$r.find('.g-ms-acc').val()) err = 'กรุณาเลือกบัญชีของสลิปที่ ' + k;
            else if (!($r.find('.g-ms-file')[0].files || []).length) err = 'กรุณาแนบรูปสลิปที่ ' + k;
        });
        return err;
    }

    /* ---------- บันทึก ---------- */
    function validate(c) {
        if (!String($p.find('.g-name').val()).trim()) return 'กรุณาใส่ชื่อผู้จอง';
        if (String($p.find('.g-tel').val()).replace(/\D/g, '').length < 9) return 'กรุณาใส่เบอร์ติดต่อ';
        if (!$p.find('.g-channel').val()) return 'กรุณาเลือกช่องทางการจอง';
        if (c.hs.length < MINH) return 'ต้องมีอย่างน้อย 2 หลัง';
        var seen = {};
        for (var i = 0; i < c.hs.length; i++) {
            var h = c.hs[i], lab = 'บ้านหลังที่ ' + (i + 1) + ': ';
            if (!h.house) return lab + 'กรุณาเลือกบ้าน';
            if (!h.din || !h.dout || nightsBetween(h.din, h.dout) < 1) return lab + 'กรุณาเลือกวันเข้า-ออก';
            var key = h.full + h.din; if (seen[key]) return lab + 'เลือกบ้านซ้ำวันเดียวกัน'; seen[key] = 1;
            if (overlap(h.full, h.din, h.dout)) return lab + h.full + ' มีจองแล้วในช่วงวันที่เลือก';
            if (!h.nights.length || h.nights.some(function (v) { return !(v > 0); })) return lab + 'กรุณาใส่ราคาทุกคืน';
            if (!(h.guests > 0)) return lab + 'กรุณาใส่จำนวนผู้เข้าพัก';
            if (!(h.cap > 0)) return lab + 'กรุณาใส่จำนวนที่พักได้';
            if (String(h.$c.find('.h-ins').val()).trim() === '') return lab + 'กรุณาใส่ค่าประกัน (ไม่มีใส่ 0)';
        }
        if ($p.find('.g-pkg-on').is(':checked') && !(num($p.find('.g-pkg-total').val()) > 0)) return 'กรุณาใส่ราคาแพ็กเกจรวม';
        if ($p.find('.g-comp-on').is(':checked')) {
            if (!String($p.find('.g-comp-name').val()).trim()) return 'กรุณาใส่ชื่อบริษัท';
            if (!String($p.find('.g-comp-addr').val()).trim()) return 'กรุณาใส่ที่อยู่บริษัท';
            if (String($p.find('.g-comp-tax').val()).replace(/\D/g, '').length !== 13) return 'เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก';
        }
        if (!String($p.find('.g-cal').val()).trim()) return 'กรุณากรอกข้อความลงตารางนายหน้า';
        var ag = agentMode();
        if (ag === null) return 'Walk in: กรุณาเลือกปิดการขายโดย แอดมิน หรือ เอเจ้น';
        if (ag) { if (String($p.find('.g-g').val()).trim() === '') return 'กรุณากรอกค่าคอมเอเจ้น (ไม่มีใส่ 0)'; }
        else {
            var st = $p.find('.g-st:checked').map(function () { return this.value; }).get();
            if (!st.length) return 'กรุณาติ๊กพนักงานปิดการขาย (หรือ "ไม่มีพนักงาน")';
            if (st.indexOf('-') === -1 && st.length > 3) return 'พนักงานปิดการขายสูงสุด 3 คน';
            if (!$p.find('.g-issuer').val()) return 'กรุณาเลือกผู้ออกใบจอง';
            if (st.indexOf('-') === -1 && String($p.find('.g-h').val()).trim() === '') return 'กรุณากรอกค่าคอมแอดมิน (H)';
        }
        if (EDIT) return '';
        var dep = num($p.find('.g-deposit').val()), pay = $p.find('input[name=g-pay]:checked').val();
        if (!(dep > 0)) return 'กรุณาใส่ยอดมัดจำ';
        if (!$p.find('.g-paydate').val()) return 'กรุณาเลือกวันที่รับเงิน';
        if (pay === 'โอนจ่าย') {
            if (!$p.find('.g-bank').val()) return 'กรุณาเลือกบัญชีรับเงิน';
            if (!($p.find('.g-slip')[0].files || []).length) return 'กรุณาแนบสลิปโอนเงิน';
        }
        if (pay === 'card' && !($p.find('.g-slip')[0].files || []).length) return 'กรุณาแนบสลิปเครื่องรูดบัตร';
        var msErr = msValidate(); if (msErr) return msErr;
        var al = $p.find('.g-al').map(function () { return num(this.value); }).get();
        if (Math.abs(al.reduce(function (a, b) { return a + b; }, 0) - dep) > 0.01) return 'ผลรวมมัดจำที่แบ่งลงแต่ละหลังต้องเท่ากับยอดมัดจำรวม';
        if (dep > c.total + c.vatAdd + c.ins) return 'มัดจำมากกว่ายอดรวมทั้งหมด';
        return '';
    }

    function buildPayload(c, slip) {
        var name = String($p.find('.g-name').val()).trim();
        var tel = [$p.find('.g-tel').val(), $p.find('.g-tel2').val()].map(function (t) { return String(t || '').replace(/\D/g, '').slice(0, 10); }).filter(String).join(', ');
        var ch = $p.find('.g-channel').val(), ag = agentMode();
        var pay = $p.find('input[name=g-pay]:checked').val(), per = $p.find('input[name=g-per]:checked').val() === '1';
        var al = $p.find('.g-al').map(function () { return num(this.value); }).get();
        var weights = c.hs.map(function (h) { return h.price || 1; });
        var gSplit = ag ? split(num($p.find('.g-g').val()), weights) : [];
        var hSplit = !ag ? split(num($p.find('.g-h').val()), weights) : [];
        var staff = $p.find('.g-st:checked').map(function () { return this.value; }).get();
        staff = staff.indexOf('-') !== -1 ? '-' : staff.join(' + ');
        var free = [['น้ำแข็ง', num($p.find('.g-ice').val()), 'กระสอบ', 1], ['น้ำดื่ม', num($p.find('.g-water').val()), 'แพ็ค', 2], ['ถ่านปิ้งย่าง', num($p.find('.g-coal').val()), 'ถุง', 3]];
        var other = String($p.find('.g-other').val() || '').split(',').map(function (s) { return s.trim(); }).filter(String);
        var freeTxt = free.filter(function (f) { return f[1] > 0; }).map(function (f) { return f[0] + ' ' + f[1] + ' ' + f[2]; }).concat(other);
        var comp = $p.find('.g-comp-on').is(':checked') ? { comp_enabled: '1', comp_name: String($p.find('.g-comp-name').val()).trim(), comp_addr: String($p.find('.g-comp-addr').val()).trim(), comp_tax: String($p.find('.g-comp-tax').val()).replace(/\D/g, ''), comp_branch: String($p.find('.g-comp-branch').val()).trim() || 'สำนักงานใหญ่' } : { comp_enabled: '0' };
        var houses = c.hs.map(function (h, i) {
            var f = {
                houseedit: '', textedit: h.full, name: name, tel: tel, facebook: String($p.find('.g-fb').val() || '').trim() || '-', line: String($p.find('.g-line').val() || '').trim() || '-',
                bookinguser: ch, bookingnote: 'ใบจองหลายหลัง ' + c.hs.length + ' หลัง', timestart: h.din, timeend: h.dout, starttime: h.tin, endtime: h.tout, timevalue: String(h.nights.length),
                quser: String(h.guests), qroom: (h.rooms.match(/\d+/) || [''])[0], qbed: h.bedq ? String(h.bedq) : '', tfood: '', qfood: '', tanimal: h.pett, qanimal: h.petq ? String(h.petq) : '',
                totalroom: String(h.room), totalfood: '0', totalbed: String(h.bedb), totalanimal: String(h.petb), totalhouse: String(h.ins), totalall: String(h.totalall),
                paydate: $p.find('.g-paydate').val(), paytotal: String(al[i]), overdue: String(Math.round((h.totalall - al[i]) * 100) / 100), paylist: pay === 'โอนจ่าย' ? $p.find('.g-bank').val() : (pay === 'card' ? window.pailayCard.ACC : ''), vat_mode: h.vatMode, vat_base: String(h.price), vat_amount: String(h.vat),
                note: '', pdfedti1: String(h.cap), pdfedti2: String(num($p.find('.g-mat').val()) || 500), deposit2: 'ไม่แบ่งมัดจำ',
                comm_enabled: '1', comm_staff: ag ? '' : staff, comm_g: ag ? String(gSplit[i]) : '', comm_h: ag ? '' : String(hSplit[i] || 0), comm_issuer: ag ? '' : ($p.find('.g-issuer').val() || ''),
                cal_enabled: '1', cal_text: String($p.find('.g-cal').val()).trim(), g_rownote: h.note, g_rooms: h.rooms
            };
            var E = EDIT && EDIT.byK[h.$c.data('k')];
            if (E) { // แก้ไขใบรวม: ยอดที่ชำระแล้วคงเดิม · ค่าชำระอีก = ยอดใหม่ − ที่ชำระแล้ว
                f.houseedit = E.uid; f.house_from = E.orig.house; f.bookingnote = E.row[7] || f.bookingnote; f.note = E.row[27] || '';
                f.paytotal = String(E.paid); f.overdue = String(Math.round((h.totalall - E.paid) * 100) / 100); f.paydate = ''; f.paylist = '';
            } else if (pay === 'เงินสด') f.pay_1 = 'เงินสด'; else f.pay_2 = pay === 'card' ? window.pailayCard.MARK : 'โอนจ่าย';
            if (isWalkin(ch)) f.comm_mode = ag ? 'agent' : 'admin';
            h.nights.forEach(function (v, k) { f['night_' + (k + 1)] = String(v); });
            if (per || i === 0) free.forEach(function (x) { if (x[1] > 0) { f['free_' + x[3]] = x[0]; f['free_price_' + x[3]] = String(x[1]); } }); // ของแถมลงใบจองแต่ละหลัง (แม่บ้านเห็น) · รวมทั้งกลุ่ม = ลงหลังแรก
            return Object.assign(f, comp);
        });
        return {
            gid: EDIT ? EDIT.gid : undefined, houses: houses, slip: slip,
            extras: { packageTotal: $p.find('.g-pkg-on').is(':checked') ? num($p.find('.g-pkg-total').val()) : 0, servicesPer: per, free: freeTxt, breakfast: String($p.find('.g-breakfast').val() || '').trim(), groupNote: String($p.find('.g-note').val() || '').trim() }
        };
    }

    function save() {
        var c = recalc(), err = validate(c);
        if (err) return Swal.fire({ icon: 'warning', title: err, confirmButtonText: 'ตกลง' });
        if (EDIT) return saveEdit(c);
        var dep = num($p.find('.g-deposit').val());
        Swal.fire({
            icon: 'question', title: 'บันทึกใบจองหลายหลัง ' + c.hs.length + ' หลัง?',
            html: c.hs.map(function (h, i) { return (i + 1) + '. ' + esc(h.full) + ' · ' + esc(h.din) + ' → ' + esc(h.dout); }).join('<br>') + '<br><br>ราคารวม ' + money(c.total) + ' · มัดจำ ' + money(dep) + '<br>ราคาจ่ายวันเข้าพักรวม ' + money(c.total - dep + c.ins),
            showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'กลับไปแก้', reverseButtons: true
        }).then(function (r) {
            if (!r.isConfirmed) return;
            var msFiles = msActive() ? msRows().map(function () { return $(this).find('.g-ms-file')[0]; }).get() : [];
            return Promise.all([fileData($p.find('.g-slip')[0])].concat(msFiles.map(fileData))).then(function (all) {
                var slip = all[0];
                var payload = buildPayload(c, $p.find('input[name=g-pay]:checked').val() !== 'เงินสด' ? slip : '');
                if (msFiles.length) payload.ms = { amt1: num($p.find('.g-ms-amt1').val()), extra: msRows().map(function (i) { return { amount: num($(this).find('.g-ms-amt').val()), acc: $(this).find('.g-ms-acc').val(), slip: all[i + 1] || '' }; }).get() };
                showhidepage('header');
                return api('savegroup', { payload: JSON.stringify(payload) }).then(function (res) {
                    Swal.fire({ icon: res.status === 'success' ? 'success' : 'error', title: res.status === 'success' ? 'บันทึกเรียบร้อย' : 'บันทึกไม่สำเร็จ', text: res.message, confirmButtonText: 'ตกลง' }).then(function () {
                        if (res.status === 'success') { reset(); showhidepage('.listpoolvilla,nav'); if (typeof getdata === 'function') getdata(); }
                        else showhidepage('.groupform,nav');
                    });
                });
            }).catch(function (e) { console.error(e); showhidepage('.groupform,nav'); Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' }); });
        });
    }

    function saveEdit(c) {
        Swal.fire({
            icon: 'question', title: 'บันทึกการแก้ไขใบรวม ' + c.hs.length + ' หลัง?',
            html: c.hs.map(function (h, i) { return (i + 1) + '. ' + esc(h.full) + ' · ' + esc(h.din) + ' → ' + esc(h.dout) + ' · ' + money(h.price); }).join('<br>') + '<br><br>ระบบจะออก PDF รวมใหม่ และเรียกคืนการ์ดใบจองรวมเดิมในกลุ่ม Lark',
            showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'กลับไปแก้', reverseButtons: true
        }).then(function (r) {
            if (!r.isConfirmed) return;
            var payload = buildPayload(c, '');
            showhidepage('header');
            return api('savegroupedit', { payload: JSON.stringify(payload) }).then(function (res) {
                Swal.fire({ icon: res.status === 'success' ? 'success' : 'error', title: res.status === 'success' ? 'บันทึกเรียบร้อย' : 'บันทึกไม่สำเร็จ', text: res.message, confirmButtonText: 'ตกลง' }).then(function () {
                    if (res.status === 'success') { reset(); showhidepage('.listpoolvilla,nav'); if (typeof getdata === 'function') getdata(); }
                    else showhidepage('.groupform,nav');
                });
            }).catch(function (e) { console.error(e); showhidepage('.groupform,nav'); Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' }); });
        });
    }

    function setEditUi(on) {
        $p.find('.g-title').text(on ? 'แก้ไขใบจองหลายหลัง (ใบรวม)' : 'ใบจองหลายหลัง (2–4 หลัง)');
        $p.find('.g-editnote').toggle(!!on).html(on ? 'แก้ไขข้อมูลทุกหลังในใบรวมได้ที่นี่ (เปลี่ยนบ้าน/วัน/ราคา/ผู้พัก/บริการ/ค่าคอม) · ยอดที่ชำระแล้วไม่เปลี่ยน · <b>ลดหลัง</b> = กดยกเลิกใบจองของหลังนั้น (ระบบออก PDF รวมใหม่ให้)' : '');
        $p.find('.g-payfs').toggle(!on); $p.find('.g-paidfs').toggle(!!on);
        $p.find('.g-save').text(on ? 'บันทึกการแก้ไขใบรวม' : 'บันทึกใบจองหลายหลัง');
    }

    function reset() {
        EDIT = null; setEditUi(false);
        $p.find('input[type=text], input[type=date], textarea').val('');
        $p.find('.g-mat').val('500'); $p.find('.g-comp-branch').val('สำนักงานใหญ่');
        $p.find('input[type=checkbox]').prop('checked', false); $p.find('.g-comp, .g-pkg').hide();
        $p.find('.g-slip').val(''); $p.find('#g-pay-2, #g-per-1, #g-vat-n').prop('checked', true); $p.find('.g-bank').closest('.form-floating').show(); $p.find('.g-bankwrap').show();
        $p.find('.g-houses').empty(); allocDirty = false;
        $p.find('.g-ms-rows').empty(); $p.find('.g-deposit').prop('readonly', false); $p.find('.g-ms-first').hide();
        addHouse(false); addHouse();
        $p.find('.g-paydate').val(today());
    }
    function open() {
        if (!houses().length) return Swal.fire({ icon: 'info', title: 'กำลังโหลดรายการบ้าน ลองใหม่อีกครั้ง', confirmButtonText: 'ตกลง' });
        reset(); // ออกจากหน้าแล้ว removeinvalid ของ script.js ล้างทุกช่อง → เริ่มใหม่ทุกครั้ง
        var $b = $p.find('.g-bank'); if ($b.children().length <= 1) banks().forEach(function (b) { $b.append($('<option>').val(b).text(b)); });
        loadOpts().then(syncComm);
        showhidepage('.groupform,nav');
        window.scrollTo(0, 0);
    }
    /* ---------- แก้ไขใบรวม ---------- */
    function loadGroups() { return api('grouplist').then(function (r) { if (r && r.status === 'success') GROUPS = r.map || {}; }).catch(function () { }); }
    function hm(x) { var m = String(x || '').match(/(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}))?/); return m ? { d: m[1], t: m[2] || '' } : { d: '', t: '' }; }
    function fillEdit(d) {
        reset(); EDIT = { gid: d.gid, byK: {} }; setEditUi(true);
        var ex = d.extras || {}, b0 = d.houses[0].row;
        $p.find('.g-houses').empty();
        d.houses.forEach(function (H) {
            var b = H.row, a = hm(b[8]), o = hm(b[9]);
            var $c = $(houseCard('u' + H.uid)).appendTo($p.find('.g-houses'));
            var hi = houses().map(function (x) { return x[0]; }).indexOf(b[1]);
            if (hi === -1) { $c.find('.h-house').append($('<option>').val('x').text(b[1])); }
            $c.find('.h-house').val(hi === -1 ? 'x' : String(hi));
            $c.find('.h-in').val(a.d); $c.find('.h-tin').val(a.t || '14:00'); $c.find('.h-out').val(o.d); $c.find('.h-tout').val(o.t || '11:00');
            drawNights($c);
            var ns = String(b[11] || '').split('|'); $c.find('.h-night').each(function (i) { if (ns[i] !== undefined) this.value = ns[i]; });
            $c.find('.h-guests').val(b[12]); $c.find('.h-cap').val(b[28]); $c.find('.h-rooms').val((ex.rooms && ex.rooms[H.uid]) || (num(b[13]) ? b[13] + ' ห้องนอน' : ''));
            $c.find('.h-bedq').val(num(b[14]) || ''); $c.find('.h-bedb').val(num(b[21]) || ''); $c.find('.h-pett').val(b[17] && b[17] !== '-' ? b[17] : ''); $c.find('.h-petq').val(num(b[18]) || ''); $c.find('.h-petb').val(num(b[22]) || '');
            $c.find('.h-ins').val(num(b[24])); $c.find('.h-note').val((ex.rowNotes && ex.rowNotes[H.uid]) || '');
            EDIT.byK[$c.data('k')] = { uid: H.uid, paid: H.paid, row: b, comm: H.comm || {}, orig: { house: b[1], din: a.d, dout: o.d } };
        });
        // บ้านที่ไม่อยู่ในรายการ (ชื่อเก่า) → houseData อ่านจาก EDIT
        var tel = String(b0[3] || '').replace(/^'/, '').split(',').map(function (t) { return t.replace(/\D/g, ''); });
        $p.find('.g-name').val(b0[2]); $p.find('.g-tel').val(tel[0] || ''); $p.find('.g-tel2').val(tel[1] || '');
        $p.find('.g-fb').val(b0[4] === '-' ? '' : b0[4]); $p.find('.g-line').val(b0[5] === '-' ? '' : b0[5]);
        var $ch = $p.find('.g-channel'); if (b0[6] && !$ch.find('option').filter(function () { return this.value === b0[6]; }).length) $ch.append($('<option>').val(b0[6]).text(b0[6]));
        $ch.val(b0[6]);
        if (d.company) { $p.find('.g-comp-on').prop('checked', true); $p.find('.g-comp').show(); $p.find('.g-comp-name').val(d.company.name); $p.find('.g-comp-addr').val(d.company.addr); $p.find('.g-comp-tax').val(d.company.tax); $p.find('.g-comp-branch').val(d.company.branch); }
        if (num(ex.packageTotal) > 0) { $p.find('.g-pkg-on').prop('checked', true); $p.find('.g-pkg').show(); $p.find('.g-pkg-total').val(ex.packageTotal); }
        $p.find(ex.servicesPer === false ? '#g-per-0' : '#g-per-1').prop('checked', true);
        var X = String(b0[23] || ''), q = function (re) { var m = X.match(re); return m ? m[1] : ''; };
        $p.find('.g-ice').val(q(/น้ำแข็ง\s*(\d+)/)); $p.find('.g-water').val(q(/น้ำดื่ม\s*(\d+)/)); $p.find('.g-coal').val(q(/ถ่าน\S*\s*(\d+)/));
        $p.find('.g-other').val((ex.free || []).filter(function (f) { return !/^(น้ำแข็ง|น้ำดื่ม|ถ่าน)/.test(f); }).join(', '));
        $p.find('.g-breakfast').val(ex.breakfast || ''); $p.find('.g-note').val(ex.groupNote || ''); $p.find('.g-mat').val(num(b0[29]) || 500);
        $p.find(d.vat && d.vat.mode === 'excl' ? '#g-vat-e' : d.vat && d.vat.mode === 'incl' ? '#g-vat-i' : '#g-vat-n').prop('checked', true);
        $p.find('.g-cal').val(d.cal || ('จอง K.' + String(b0[2]).replace(/^คุณ\s*/, ''))).data('touched', 1);
        // ค่าคอม: รวมทุกหลัง · พนักงาน/ผู้ออกใบ จากหลังแรก
        var cs = d.houses.map(function (H) { return H.comm || {}; }), c0 = cs[0];
        var gSum = cs.reduce(function (a, x) { return a + num(x.g); }, 0), hSum = cs.reduce(function (a, x) { return a + num(x.h); }, 0);
        var isAgentRow = cs.some(function (x) { return String(x.g == null ? '' : x.g).trim() !== ''; });
        if (isWalkin(b0[6])) $p.find(isAgentRow ? '#g-mode-g' : '#g-mode-a').prop('checked', true);
        $p.find('.g-g').val(isAgentRow ? gSum : ''); $p.find('.g-h').val(!isAgentRow && c0.found ? hSum : '');
        var st = String(c0.staff || '').split('+').map(function (s) { return s.trim(); }).filter(String);
        if (c0.found && !isAgentRow && !st.length) st = ['-'];
        $p.find('.g-st').each(function () { this.checked = st.indexOf(this.value) !== -1; });
        if (c0.issuer) { var $is = $p.find('.g-issuer'); if (!$is.find('option').filter(function () { return this.value === c0.issuer; }).length) $is.append($('<option>').val(c0.issuer).text(c0.issuer)); $is.val(c0.issuer); }
        renumber(); syncComm(); recalc();
    }
    function openEdit(gid) {
        Swal.fire({ title: 'กำลังเปิดใบจองรวม…', allowOutsideClick: false, didOpen: function () { Swal.showLoading(); } });
        Promise.all([loadOpts(), api('getgroup', { gid: gid })]).then(function (r) {
            var d = r[1];
            if (!d || d.status !== 'success') return Swal.fire({ icon: 'error', title: (d && d.message) || 'เปิดใบจองรวมไม่สำเร็จ', confirmButtonText: 'ตกลง' });
            var $b = $p.find('.g-bank'); if ($b.children().length <= 1) banks().forEach(function (x) { $b.append($('<option>').val(x).text(x)); });
            fillEdit(d);
            Swal.close();
            showhidepage('.groupform,nav');
            window.scrollTo(0, 0);
        }).catch(function (e) { console.error(e); Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' }); });
    }

    window.pailayGroup = { open: open, openEdit: openEdit, groups: function () { return GROUPS; }, reloadGroups: loadGroups, computed: function () { return computed(); }, buildPayload: function () { return buildPayload(recalc(), ''); }, validate: function () { return validate(recalc()); } };

    $(document).ready(function () {
        $p = $(PAGE).appendTo('body');
        $('<style>.groupform .form-floating>label{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.groupform .form-check-label{white-space:normal}</style>').appendTo('head');
        var $list = $('.listpoolvilla .cardContainer');
        // การ์ด "จองหลายหลัง" ในรายการบ้าน = รองสุดท้าย (ก่อนการ์ดบ้านพักนอกเครือของ menu.js) · crehouse() วาดใหม่ทุกครั้ง → ดูด้วย MutationObserver
        var GROUP_CARD = '<div class="col-12 col-md-4 group-card-col"><div class="card mb-1 shadow position-relative"><div class="card-body text-center g-open outside-card" role="button">' +
            '<div class="outside-card-icon rounded mb-0"><i class="bi bi-houses"></i></div><h5 class="card-title fw-bold">จองหลายหลัง (2–4 หลัง)</h5><div class="small text-muted">ใบจองรวมใบเดียว</div></div></div></div>';
        var placeGroupCard = function () {
            var c = $list[0];
            if (!c || !c.querySelector('.card-row')) return;
            var out = c.querySelector('.outside-card-col'), mine = c.querySelector('.group-card-col');
            if (mine && ((out && mine.nextElementSibling === out) || (!out && mine === c.lastElementChild))) return;
            if (mine) mine.remove();
            if (out) out.insertAdjacentHTML('beforebegin', GROUP_CARD); else c.insertAdjacentHTML('beforeend', GROUP_CARD);
        };
        if ($list.length) { placeGroupCard(); new MutationObserver(function () { setTimeout(placeGroupCard, 0); }).observe($list[0], { childList: true }); }
        $(document).on('click', '.g-open', function (e) { e.preventDefault(); e.stopPropagation(); open(); window.scrollTo(0, 0); });
        // ปุ่มแก้ไขของใบที่อยู่ในใบรวม → เปิดฟอร์มหลายหลัง (capture: ก่อน handler ของ script.js)
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.editinfo, .editinfo2');
            if (!btn || typeof roomlist === 'undefined') return;
            var row = roomlist[Number(btn.getAttribute('data-row'))], gid = row && GROUPS[String(row[0]).trim()];
            if (!gid) return;
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            openEdit(gid);
        }, true);
        loadGroups();
        if (typeof window.getdata === 'function') { var og = window.getdata; window.getdata = function () { var r = og.apply(this, arguments); loadGroups(); return r; }; }
        $p.on('click', '.g-back', function () { showhidepage('.listpoolvilla,nav'); });
        $p.on('click', '.g-add', function () { if (cards().length < MAXH) addHouse(); });
        $p.on('click', '.g-del', function () { $(this).closest('.g-house').remove(); renumber(); recalc(); });
        $p.on('change', '.h-in, .h-out', function () {
            var $c = $(this).closest('.g-house');
            if ($(this).hasClass('h-in') && $c.find('.h-in').val() && !$c.find('.h-out').val()) $c.find('.h-out').val(addDays($c.find('.h-in').val(), 1));
            var h = houseData($c);
            if (h.full && h.din && h.dout && overlap(h.full, h.din, h.dout)) Swal.fire({ icon: 'error', title: h.full + ' มีจองแล้วในช่วงวันที่เลือก', confirmButtonText: 'ตกลง' });
            drawNights($c); recalc();
        });
        $p.on('change', '.h-house', function () {
            var h = houseData($(this).closest('.g-house'));
            if (h.full && h.din && h.dout && overlap(h.full, h.din, h.dout)) Swal.fire({ icon: 'error', title: h.full + ' มีจองแล้วในช่วงวันที่เลือก', confirmButtonText: 'ตกลง' });
            recalc();
        });
        $p.on('click', '.g-ms-add', function () { if (msRows().length < 2) { $p.find('.g-ms-rows').append(msRow(msRows().length + 2)); if (!$p.find('.g-ms-amt1').val()) $p.find('.g-ms-amt1').val($p.find('.g-deposit').val()); msSync(); } });
        $p.on('click', '.g-ms-del', function () { $(this).closest('.g-ms-row').remove(); msSync(); });
        $p.on('input', '.g-ms-amt1, .g-ms-amt', msSync);
        $p.on('change', 'input[name=g-pay]', msSync);
        $p.on('input change', '.h-night, .h-bedb, .h-petb, .h-ins, .g-deposit, .g-pkg-total, .g-pkg-on', function () { if (!$(this).hasClass('g-al')) allocDirty = false; recalc(); });
        $p.on('input', '.g-al', function () { allocDirty = true; recalc(); });
        $p.on('change', '.g-pkg-on', function () { $p.find('.g-pkg').toggle(this.checked); });
        $p.on('change', '.g-comp-on', function () { $p.find('.g-comp').toggle(this.checked); });
        $p.on('change', '.g-channel, input[name=g-mode]', syncComm);
        $p.on('change', 'input[name=g-pay]', function () { $p.find('.g-bankwrap').toggle(this.value !== 'เงินสด'); $p.find('.g-bank').closest('.form-floating').toggle(this.value === 'โอนจ่าย'); recalc(); });
        $p.on('change', 'input[name=g-vat]', recalc);
        $p.on('input', '.g-name', function () { var $cal = $p.find('.g-cal'); if (!$cal.data('touched')) $cal.val('จอง K.' + String(this.value).replace(/^คุณ\s*/, '').trim()); });
        $p.on('input', '.g-cal', function () { $(this).data('touched', 1); });
        $p.on('input', '.g-tel, .g-tel2', function () { var d = this.value.replace(/\D/g, '').slice(0, 10); if (d !== this.value) this.value = d; });
        $p.on('click', '.g-save', save);
    });
})();
