/* ปรับใบจอง (16 พ.ย. 2569) — ไม่แก้ script.js
 *
 * 1) เปลี่ยนบ้าน (ตอนแก้ไขใบจอง): ดรอปดาวน์เลือกบ้านใหม่ → ตรวจวันว่าง (dayroom) → เปลี่ยน .textedit (savepools ใช้ textedit)
 *    หลังบ้านเดิมจัดการให้: ตารางนายหน้าคืนช่องเดิม+ลงช่องใหม่ (calendar.gs แบบแก้ไข) · ค่าคอมเปลี่ยนชื่อบ้าน · PDF โลโก้บ้านใหม่ · เรียกคืนการ์ดเดิม
 * 2) แก้ยอดมัดจำ (ตอนแก้ไขใบไม่แบ่งมัดจำ): ช่องยอดใหม่ + สลิปใหม่ (ไม่บังคับ) → ห่อ savepool ส่ง dep_edit=1 · dep_new · dep_old · dep_slip
 *    ค่าชำระอีก (overdue) ปรับตามส่วนต่าง · หลังบ้าน bookingplus.gs แก้แถวรายรับมัดจำเดิม + บันทึกหมายเหตุ + แจ้ง Lark
 * 3) เพิ่มรายรับก่อนวันเข้าพัก: ปุ่ม "เพิ่มรายรับ" บนการ์ดหน้า Check In (ใบที่ยังไม่เช็คอิน) → opt=savedeposit
 *    หมวด "ชำระค่าที่พักล่วงหน้า" → prepay=1 (หลังบ้านลดค่าชำระอีก + ออก PDF ใหม่) · หมวดอื่น = ลงรายรับอย่างเดียว
 */
(function () {
    'use strict';
    var PREPAY = 'ชำระค่าที่พักล่วงหน้า';
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function arr(name) { try { var v = window.eval(name); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
    function bookingRow(uid) { return arr('roomlist').filter(function (r) { return r[0] === uid; })[0] || null; }
    function incomeOf(uid) { return arr('income').filter(function (r) { return r[1] === uid; }); }
    function readFile(input) { return new Promise(function (res, rej) { var f = input && input.files && input.files[0]; if (!f) return res(''); var r = new FileReader(); r.onload = function (e) { res(e.target.result); }; r.onerror = rej; r.readAsDataURL(f); }); }
    function ymd(x) { var d = new Date(x); if (isNaN(d)) return ''; return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function overlap(houseFull, din, dout) {
        var a = new Date(din + 'T00:00:00'), b = new Date(dout + 'T00:00:00');
        return arr('dayroom').some(function (r) {
            if (r[0] !== houseFull) return false;
            var s = new Date(r[1]), e = new Date(r[2]);
            s = new Date(s.getFullYear(), s.getMonth(), s.getDate()); e = new Date(e.getFullYear(), e.getMonth(), e.getDate());
            return a < e && b > s;
        });
    }

    /* ---------- กล่องในหน้าแก้ไข ---------- */
    var HOUSE_BOX = '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row bp-house" style="display:none"><legend class="float-none w-auto px-3">เปลี่ยนบ้านพัก</legend>' +
        '<div class="col-12"><div class="form-floating mb-1"><select class="form-select bp-house-sel"></select><label>บ้านพัก (เลือกบ้านใหม่ถ้าลูกค้าเปลี่ยนหลัง)</label></div></div>' +
        '<div class="col-12 small bp-house-msg text-muted">ระบบตรวจว่าบ้านใหม่ว่างในวันเดิม · ตารางนายหน้า/ค่าคอม/PDF เปลี่ยนให้อัตโนมัติ · ตรวจค่าประกันและจำนวนคนของบ้านใหม่ก่อนบันทึก</div></fieldset>';
    var DEP_BOX = '<div class="col-12 mb-2 bp-dep" style="display:none"><div class="p-2 rounded" style="background:rgba(13,110,253,.06)">' +
        '<div class="fw-semibold mb-1">แก้ยอดมัดจำ <span class="small text-muted bp-dep-old"></span></div>' +
        '<div class="form-floating mb-1"><input class="form-control bp-dep-new" type="text" inputmode="decimal" placeholder="ยอดมัดจำ"><label>ยอดมัดจำ (แก้กรณีลงผิด)</label></div>' +
        '<label class="form-label small mb-1">สลิปใหม่ (ถ้ามี)</label><input type="file" accept="image/*" class="form-control bp-dep-slip">' +
        '<div class="small text-muted mt-1">ลูกค้าโอนเพิ่ม → ใช้ปุ่ม "เพิ่มรายรับ" บนการ์ด Check In แทน (บัญชีจะลงตามวันที่โอนจริง)</div></div></div>';

    var cur = { uid: '', house: '', depOld: null, editable: false };
    function setTextedit(name) { $('.textedit').text(name); }

    function onEditOpen(uid) {
        var $f = $('#formpoolvilla');
        $f.find('.bp-house, .bp-dep').hide();
        cur = { uid: uid, house: '', depOld: null, editable: false };
        if (!uid) return;
        var b = bookingRow(uid);
        if (!b) return;
        cur.house = b[1];
        // เปลี่ยนบ้าน
        var $sel = $f.find('.bp-house-sel').empty();
        arr('room').forEach(function (h) { $sel.append($('<option>').val(h[0]).text(h[0])); });
        if (!$sel.find('option').filter(function () { return this.value === b[1]; }).length) $sel.prepend($('<option>').val(b[1]).text(b[1]));
        $sel.val(b[1]);
        $f.find('.bp-house-msg').removeClass('text-danger text-success').addClass('text-muted').text('ระบบตรวจว่าบ้านใหม่ว่างในวันเดิม · ตารางนายหน้า/ค่าคอม/PDF เปลี่ยนให้อัตโนมัติ · ตรวจค่าประกันและจำนวนคนของบ้านใหม่ก่อนบันทึก');
        $f.find('.bp-house').show();
        // แก้ยอดมัดจำ: ใบไม่แบ่งมัดจำ ที่มีแถวรายรับมัดจำ (ไม่ใช่ OTA/วอล์กอิน)
        var inc = incomeOf(uid);
        var depRows = inc.filter(function (r) { return String(r[8]) === 'ไม่แบ่งมัดจำ'; });
        var special = inc.some(function (r) { return /OTA|วอล์กอิน/.test(String(r[2])); });
        if (String(b[31]) === 'ไม่แบ่ง' && depRows.length === 1 && !special) { // หลายสลิป → multislip.js
            cur.depOld = num(depRows[0][4]); cur.editable = true;
            $f.find('.bp-dep-old').text('(ยอดเดิม ' + money(cur.depOld) + ' บาท)');
            $f.find('.bp-dep-new').val(cur.depOld);
            $f.find('.bp-dep-slip').val('');
            $f.find('.bp-dep').show();
        }
    }

    function wrapSavepool() {
        var orig = window.savepool;
        if (typeof orig !== 'function') return;
        window.savepool = function (itemData) {
            var self = this, args = arguments;
            if (!itemData || !itemData.houseedit || itemData.houseedit !== cur.uid) return orig.apply(self, args);
            var $f = $('#formpoolvilla');
            var nh = $f.find('.bp-house-sel').val();
            if (nh && nh !== cur.house) { itemData.textedit = nh; itemData.house_from = cur.house; }
            if (!cur.editable) return orig.apply(self, args);
            var nd = num($f.find('.bp-dep-new').val());
            var slipInput = $f.find('.bp-dep-slip')[0];
            var hasSlip = slipInput && slipInput.files && slipInput.files.length;
            if (Math.abs(nd - cur.depOld) < 0.005 && !hasSlip) return orig.apply(self, args);
            return readFile(slipInput).then(function (slip) {
                itemData.dep_edit = '1'; itemData.dep_new = String(nd); itemData.dep_old = String(cur.depOld); itemData.dep_slip = slip || '';
                itemData.dep_user = localStorage.getItem('name') || '';
                itemData.overdue = String(Math.round((num(itemData.overdue) - (nd - cur.depOld)) * 100) / 100);
                return orig.apply(self, [itemData].concat([].slice.call(args, 1)));
            });
        };
    }

    /* ---------- เพิ่มรายรับก่อนวันเข้าพัก ---------- */
    function cats() {
        var list = arr('depositlist').map(function (r) { return r[0]; }).filter(function (c) { return c && c !== 'checkin' && !/^มัดจำ/.test(c); });
        return [PREPAY].concat(list.filter(function (c) { return c !== PREPAY; }));
    }
    function openPrepay(uid) {
        var b = bookingRow(uid) || [];
        var banks = arr('bank').map(function (x) { return x[0]; });
        Swal.fire({
            title: 'เพิ่มรายรับ (ก่อนวันเข้าพัก)',
            html: '<div class="text-start small mb-2"><b class="pp-h"></b><br>ค้างจ่ายวันเข้าพัก (รวมค่าประกัน) <b class="pp-due"></b> บาท</div>' +
                '<select class="form-select mb-2 pp-cat"></select>' +
                '<div class="small text-start text-muted mb-2 pp-hint"></div>' +
                '<div class="btn-group w-100 mb-2"><input type="radio" class="btn-check" name="pp-pay" id="pp-pay-1" value="เงินสด"><label class="btn btn-outline-primary" for="pp-pay-1">เงินสด</label>' +
                '<input type="radio" class="btn-check" name="pp-pay" id="pp-pay-2" value="โอนจ่าย" checked><label class="btn btn-outline-primary" for="pp-pay-2">โอนจ่าย</label>' +
                '<input type="radio" class="btn-check" name="pp-pay" id="pp-pay-3" value="card"><label class="btn btn-outline-primary" for="pp-pay-3">บัตรเครดิต</label></div>' +
                '<div class="small text-start mb-2 pp-cardnote" style="display:none"></div>' +
                '<select class="form-select mb-2 pp-bank"><option value="">เลือกบัญชีรับเงิน</option></select>' +
                '<input type="date" class="form-control mb-2 pp-date">' +
                '<input type="text" inputmode="decimal" class="form-control mb-2 pp-money" placeholder="ยอดเงิน (บาท)">' +
                '<label class="form-label small mb-1 d-block text-start pp-sliplab">สลิป *</label><input type="file" accept="image/*" class="form-control pp-slip">',
            didOpen: function () {
                var c = Swal.getHtmlContainer();
                c.querySelector('.pp-h').textContent = (b[1] || '') + ' · ' + (b[2] || '');
                c.querySelector('.pp-due').textContent = money(num(b[26]));
                var sel = c.querySelector('.pp-cat');
                cats().forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = x === PREPAY ? x + ' (ลดยอดค้าง)' : x; sel.appendChild(o); });
                var bs = c.querySelector('.pp-bank');
                banks.forEach(function (x) { var o = document.createElement('option'); o.value = x; o.textContent = x; bs.appendChild(o); });
                c.querySelector('.pp-date').value = today();
                var sync = function () {
                    var transfer = c.querySelector('#pp-pay-2').checked, card = c.querySelector('#pp-pay-3').checked;
                    bs.style.display = transfer ? '' : 'none';
                    c.querySelector('.pp-sliplab').textContent = transfer ? 'สลิป *' : card ? 'สลิปเครื่องรูดบัตร *' : 'รูปเงินสด (ถ้ามี)';
                    var cn = c.querySelector('.pp-cardnote'), m0 = num(c.querySelector('.pp-money').value), f0 = window.pailayCard ? window.pailayCard.fee(m0) : 0;
                    cn.style.display = card ? '' : 'none';
                    cn.innerHTML = card ? '💳 ค่าธรรมเนียม 3% = <b>' + money(f0) + '</b> บาท (ลูกค้าจ่ายเพิ่ม) · ยอดรูดรวม <b>' + money(m0 + f0) + '</b> · รอยอดเข้าบัญชีบริษัท' : '';
                    c.querySelector('.pp-hint').textContent = sel.value === PREPAY ? 'ยอดนี้จะหักออกจากยอดค้างจ่ายวันเข้าพัก · ออกใบจองใหม่ให้อัตโนมัติ' : 'ลงเป็นรายรับอย่างเดียว ไม่เปลี่ยนยอดค่าที่พัก';
                };
                c.addEventListener('change', sync); c.addEventListener('input', sync); sync();
            },
            showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', reverseButtons: true,
            preConfirm: function () {
                var c = Swal.getHtmlContainer();
                var cat = c.querySelector('.pp-cat').value, pay = c.querySelector('#pp-pay-2').checked ? 'โอนจ่าย' : c.querySelector('#pp-pay-3').checked ? 'card' : 'เงินสด';
                var m = num(c.querySelector('.pp-money').value), bk = c.querySelector('.pp-bank').value, d = c.querySelector('.pp-date').value;
                var slipIn = c.querySelector('.pp-slip');
                if (!(m > 0)) return Swal.showValidationMessage('กรุณาใส่ยอดเงิน');
                if (!d) return Swal.showValidationMessage('กรุณาเลือกวันที่');
                if (pay === 'โอนจ่าย' && !bk) return Swal.showValidationMessage('กรุณาเลือกบัญชีรับเงิน');
                if (pay !== 'เงินสด' && !(slipIn.files && slipIn.files.length)) return Swal.showValidationMessage(pay === 'card' ? 'กรุณาแนบสลิปเครื่องรูดบัตร' : 'กรุณาแนบสลิป');
                if (cat === PREPAY && m > num(b[26]) - num(b[24]) + 0.001) return Swal.showValidationMessage('ยอดเกินค่าที่พักที่ค้าง (' + money(num(b[26]) - num(b[24])) + ' บาท ไม่รวมค่าประกัน)');
                return readFile(slipIn).then(function (slip) {
                    var o = { idlists: uid, money: String(m), paydate: d, paylist: pay === 'โอนจ่าย' ? bk : (pay === 'card' ? window.pailayCard.ACC : ''), slip: slip, depositlist: cat, minusdeposit: '', addday: '', othermoney: '' };
                    if (pay === 'เงินสด') o.pay_111 = 'เงินสด'; else o.pay_222 = pay === 'card' ? window.pailayCard.MARK : 'โอนจ่าย';
                    if (cat === PREPAY) o.prepay = '1';
                    return o;
                });
            }
        }).then(function (r) {
            if (!r.isConfirmed) return;
            showhidepage('header');
            fetch(scriptUrl, { method: 'POST', body: new URLSearchParams(Object.assign({ opt: 'savedeposit' }, r.value)), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
                .then(function (x) { return x.json(); })
                .then(function (res) {
                    Swal.fire({ icon: res.status === 'success' ? 'success' : 'error', title: res.message, confirmButtonText: 'ตกลง' })
                        .then(function () { showhidepage('.checkin,nav'); if (res.status === 'success' && typeof getdata === 'function') getdata(); });
                })
                .catch(function (e) { console.error(e); showhidepage('.checkin,nav'); Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' }); });
        });
    }
    function addPrepayButtons() {
        $('#housetable .card').each(function () {
            var $c = $(this);
            if ($c.find('.bp-prepay').length) return;
            var $edit = $c.find('.editinfo').first();
            if (!$edit.length || !$edit.closest('.checkins').is(':visible')) return;
            var idx = $edit.data('row'), row = arr('roomlist')[idx];
            if (!row) return;
            $edit.closest('.row').append('<div class="col-12 mb-1"><button class="btn btn-outline-primary btn-sm w-100 bp-prepay" data-uid="' + String(row[0]).replace(/"/g, '') + '"><i class="bi bi-cash-coin"></i> เพิ่มรายรับ (ก่อนเข้าพัก)</button></div>');
        });
    }

    $(document).ready(function () {
        var $f = $('#formpoolvilla');
        $f.find('#houseedit').after(HOUSE_BOX);
        $f.find('.addpaytotal').after(DEP_BOX);
        $f.on('change', '.bp-house-sel', function () {
            var nh = this.value, $m = $f.find('.bp-house-msg');
            if (!nh || nh === cur.house) { setTextedit(cur.house); $m.removeClass('text-danger text-success').addClass('text-muted').text('ใช้บ้านเดิม'); return; }
            var din = ymd($('#timestart').val()), dout = ymd($('#timeend').val());
            if (din && dout && overlap(nh, din, dout)) {
                Swal.fire({ icon: 'error', title: nh + ' มีจองแล้วในช่วงวันที่ของใบนี้', confirmButtonText: 'ตกลง' });
                this.value = cur.house; setTextedit(cur.house); return;
            }
            setTextedit(nh);
            $m.removeClass('text-muted text-danger').addClass('text-success').text('✓ เปลี่ยนเป็น ' + nh + ' (บ้านว่าง) — กดบันทึกเพื่อยืนยัน · ตรวจค่าประกัน/จำนวนคนให้ตรงบ้านใหม่');
        });
        var he = document.getElementById('houseedit');
        if (he) new MutationObserver(function () { setTimeout(function () { onEditOpen(String(he.textContent || '').trim()); }, 0); }).observe(he, { childList: true, characterData: true, subtree: true });
        $(document).on('click', '.bp-prepay', function (e) { e.preventDefault(); e.stopPropagation(); openPrepay($(this).data('uid')); });
        var ht = document.getElementById('housetable');
        if (ht) new MutationObserver(function () { setTimeout(addPrepayButtons, 50); }).observe(ht, { childList: true });
        setInterval(addPrepayButtons, 2000);
        wrapSavepool();
    });
})();
