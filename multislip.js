/* มัดจำงวดเดียว โอนหลายสลิป สูงสุด 3 (17 พ.ย. 2569) — คู่กับหลังบ้าน multislip.gs (v48)
 *
 * 1) ฟอร์มลงใบจองใหม่ (โอนจ่าย + ไม่แบ่งมัดจำ): ปุ่ม "+ ลูกค้าโอนหลายสลิป" ใต้ช่องสลิป
 *    → ช่อง "ยอดสลิปที่ 1" + สลิปที่ 2–3 (ยอด · บัญชี · รูป) · #paytotal = ผลรวม (ล็อกไว้) ให้ script.js คำนวณค้างชำระต่อ
 *    → ห่อ savepool ส่ง ms_count / ms_amt_1..3 / ms_acc_2..3 / ms_slip_2..3 · ช่องใหม่ไม่มี id (getFormData ไม่เก็บ)
 * 2) หน้าแก้ไขใบที่มีมัดจำหลายสลิป: แทนกล่อง "แก้ยอดมัดจำ" (bookingplus.js) ด้วยรายการทีละสลิป (ยอด + สลิปใหม่)
 *    → ส่ง dep_edit=1 · dep_multi (JSON) · dep_new/dep_old = ยอดรวม · ค่าชำระอีกปรับตามส่วนต่าง
 * ไม่รองรับ: แบ่งงวด (ระบบนับงวดจากจำนวนแถว) · บัตรเครดิต · เงินสด
 */
(function () {
    'use strict';
    var MAX = 3;
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function arr(name) { try { var v = window.eval(name); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
    function readFile(input) { return new Promise(function (res, rej) { var f = input && input.files && input.files[0]; if (!f) return res(''); var r = new FileReader(); r.onload = function (e) { res(e.target.result); }; r.onerror = rej; r.readAsDataURL(f); }); }
    function $f() { return $('#formpoolvilla'); }
    function isEdit() { return !!String($f().find('#houseedit').text() || '').trim(); }
    function eligible() {
        var f = $f();
        return !isEdit() && f.find('#pay_2').is(':checked') && !f.find('#pay_card').is(':checked') && f.find('#deposit2').is(':checked') && f.find('#slip').length > 0;
    }

    /* ---------- 1) ฟอร์มใบใหม่ ---------- */
    function extraRow(k) {
        var opts = arr('bank').map(function (b) { return '<option value="' + String(b[0]).replace(/"/g, '&quot;') + '">' + b[0] + '</option>'; }).join('');
        return '<div class="ms-row border rounded p-2 mb-1" data-k="' + k + '"><div class="d-flex justify-content-between align-items-center mb-1"><b class="small ms-lab">สลิปที่ ' + k + '</b><button type="button" class="btn btn-sm btn-outline-danger py-0 ms-del">ลบ</button></div>' +
            '<div class="form-floating mb-1"><input class="form-control ms-amt" type="text" inputmode="decimal" placeholder="ยอด"><label>ยอดสลิปที่ ' + k + ' *</label></div>' +
            '<div class="form-floating mb-1"><select class="form-select ms-acc"><option value="">เลือกบัญชี</option>' + opts + '</select><label>รับเงินผ่านบัญชี *</label></div>' +
            '<input type="file" accept="image/*" class="form-control ms-file"></div>';
    }
    var BOX = '<div class="col-12 mb-1 ms-box"><div class="ms-first" style="display:none"><div class="form-floating mb-1"><input class="form-control ms-amt1" type="text" inputmode="decimal" placeholder="ยอดสลิปที่ 1"><label>ยอดสลิปที่ 1 (สลิปด้านบน) *</label></div></div>' +
        '<div class="ms-rows"></div><button type="button" class="btn btn-sm btn-outline-primary w-100 ms-add">+ ลูกค้าโอนหลายสลิป (สูงสุด 3 สลิป)</button>' +
        '<div class="small text-muted mt-1 ms-hint" style="display:none">ยอดมัดจำรวม = ผลรวมทุกสลิป · ระบบลงรายรับแยกทีละสลิปและตรวจสลิปทีละใบ</div></div>';
    function rows() { return $f().find('.ms-row'); }
    function sync() {
        var f = $f(), n = rows().length, $pt = f.find('#paytotal');
        rows().each(function (i) { $(this).attr('data-k', i + 2).find('.ms-lab').text('สลิปที่ ' + (i + 2)); });
        f.find('.ms-first, .ms-hint').toggle(n > 0);
        f.find('.ms-add').toggle(n < MAX - 1).text(n ? '+ เพิ่มสลิปที่ ' + (n + 2) : '+ ลูกค้าโอนหลายสลิป (สูงสุด 3 สลิป)');
        if (n > 0) {
            var sum = num(f.find('.ms-amt1').val());
            rows().each(function () { sum += num($(this).find('.ms-amt').val()); });
            $pt.prop('readonly', true);
            if (num($pt.val()) !== sum) $pt.val(sum || '').trigger('input').trigger('change');
        } else $pt.prop('readonly', false);
    }
    function inject() {
        var f = $f(), ok = eligible(), $box = f.find('.ms-box');
        if (!ok) { if ($box.length) { $box.remove(); f.find('#paytotal').prop('readonly', false); } return; }
        if ($box.length) return;
        f.find('#slip').closest('[class*="col-"]').after(BOX);
    }
    function wrapSave() {
        var orig = window.savepool;
        if (typeof orig !== 'function' || orig.__ms) return;
        var w = function (itemData) {
            var self = this, args = [].slice.call(arguments);
            var n = rows().length;
            if (!itemData || itemData.houseedit || !n || !eligible()) return orig.apply(self, args);
            var files = rows().map(function () { return $(this).find('.ms-file')[0]; }).get();
            return Promise.all(files.map(readFile)).then(function (datas) {
                itemData.ms_count = String(n + 1);
                itemData.ms_amt_1 = String(num($f().find('.ms-amt1').val()));
                rows().each(function (i) {
                    var k = i + 2;
                    itemData['ms_amt_' + k] = String(num($(this).find('.ms-amt').val()));
                    itemData['ms_acc_' + k] = $(this).find('.ms-acc').val() || '';
                    itemData['ms_slip_' + k] = datas[i] || '';
                });
                return orig.apply(self, args);
            });
        };
        w.__ms = true;
        window.savepool = w;
    }
    function validateNew() {
        if (!rows().length || !eligible()) return '';
        if (!(num($f().find('.ms-amt1').val()) > 0)) return 'กรุณาใส่ยอดสลิปที่ 1';
        var err = '';
        rows().each(function (i) {
            if (err) return;
            var $r = $(this), k = i + 2;
            if (!(num($r.find('.ms-amt').val()) > 0)) err = 'กรุณาใส่ยอดสลิปที่ ' + k;
            else if (!$r.find('.ms-acc').val()) err = 'กรุณาเลือกบัญชีของสลิปที่ ' + k;
            else if (!($r.find('.ms-file')[0].files || []).length) err = 'กรุณาแนบรูปสลิปที่ ' + k;
        });
        return err;
    }

    /* ---------- 2) แก้ยอดมัดจำหลายสลิป (หน้าแก้ไข) ---------- */
    var multi = null; // { uid, rows:[income rows] }
    function onEditOpen(uid) {
        var f = $f();
        f.find('.ms-dep').remove(); multi = null;
        if (!uid) return;
        var b = arr('roomlist').filter(function (r) { return r[0] === uid; })[0];
        var inc = arr('income').filter(function (r) { return r[1] === uid && String(r[8]) === 'ไม่แบ่งมัดจำ'; });
        if (!b || String(b[31]) !== 'ไม่แบ่ง' || inc.length < 2 || inc.some(function (r) { return /OTA|วอล์กอิน/.test(String(r[2])); })) return;
        multi = { uid: uid, rows: inc };
        var html = '<div class="col-12 mb-2 ms-dep"><div class="p-2 rounded" style="background:rgba(13,110,253,.06)"><div class="fw-semibold mb-1">แก้ยอดมัดจำ (' + inc.length + ' สลิป) <span class="small text-muted">ยอดเดิมรวม ' + money(inc.reduce(function (a, r) { return a + num(r[4]); }, 0)) + ' บาท</span></div>' +
            inc.map(function (r, i) {
                return '<div class="border rounded p-2 mb-1 ms-dep-row" data-id="' + String(r[0]).replace(/"/g, '') + '" data-old="' + num(r[4]) + '"><div class="small mb-1">สลิปที่ ' + (i + 1) + ' · ' + String(r[5] || r[2] || '') + (/^https:\/\/lh3/.test(String(r[6])) ? ' · <a href="' + r[6] + '" target="_blank">ดูสลิป</a>' : '') + '</div>' +
                    '<div class="form-floating mb-1"><input class="form-control ms-dep-amt" type="text" inputmode="decimal" value="' + num(r[4]) + '" placeholder="ยอด"><label>ยอดสลิปที่ ' + (i + 1) + '</label></div>' +
                    '<label class="form-label small mb-1">สลิปใหม่ (ถ้ามี)</label><input type="file" accept="image/*" class="form-control ms-dep-file"></div>';
            }).join('') + '<div class="small text-muted">ลูกค้าโอนเพิ่ม → ใช้ปุ่ม "เพิ่มรายรับ" บนการ์ด Check In แทน</div></div></div>';
        var $bp = f.find('.bp-dep');
        if ($bp.length) { $bp.hide().after(html); } else f.find('.addpaytotal').after(html);
    }
    function wrapEditSave() {
        var orig = window.savepool;
        if (typeof orig !== 'function' || orig.__msEdit) return;
        var w = function (itemData) {
            var self = this, args = [].slice.call(arguments);
            if (!itemData || !multi || itemData.houseedit !== multi.uid) return orig.apply(self, args);
            var $rows = $f().find('.ms-dep-row');
            var files = $rows.map(function () { return $(this).find('.ms-dep-file')[0]; }).get();
            return Promise.all(files.map(readFile)).then(function (datas) {
                var items = [], oldSum = 0, newSum = 0, changed = false;
                $rows.each(function (i) {
                    var o = num($(this).data('old')), nw = num($(this).find('.ms-dep-amt').val());
                    oldSum += o; newSum += nw;
                    if (Math.abs(o - nw) > 0.004 || datas[i]) changed = true;
                    items.push({ id: String($(this).data('id')), old: o, 'new': nw, slip: datas[i] || '' });
                });
                if (changed) {
                    delete itemData.dep_new; delete itemData.dep_old; delete itemData.dep_slip;
                    itemData.dep_edit = '1'; itemData.dep_multi = JSON.stringify(items);
                    itemData.dep_new = String(newSum); itemData.dep_old = String(oldSum);
                    itemData.dep_user = localStorage.getItem('name') || '';
                    itemData.overdue = String(Math.round((num(itemData.overdue) - (newSum - oldSum)) * 100) / 100);
                }
                return orig.apply(self, args);
            });
        };
        w.__msEdit = true;
        window.savepool = w;
    }

    $(document).ready(function () {
        var f = $f();
        if (!f.length) return;
        // ห่อหลังสคริปต์อื่น (bookingplus ห่อไว้แล้ว: ใบหลายสลิปไม่เปิดกล่องเดิม → ตัวนี้จัดการเอง)
        setTimeout(function () { wrapSave(); wrapEditSave(); }, 0);
        var target = f.find('.typepay')[0];
        if (target) new MutationObserver(function () { setTimeout(inject, 0); }).observe(target, { childList: true });
        $(document).on('click change', '#pay_1, #pay_2, #pay_card, #deposit1, #deposit2', function () { setTimeout(inject, 30); });
        f.on('click', '.ms-add', function () { if (rows().length < MAX - 1) { f.find('.ms-rows').append(extraRow(rows().length + 2)); if (!f.find('.ms-amt1').val()) f.find('.ms-amt1').val(f.find('#paytotal').val()); sync(); } });
        f.on('click', '.ms-del', function () { $(this).closest('.ms-row').remove(); sync(); });
        f.on('input', '.ms-amt1, .ms-amt', sync);
        // ตรวจก่อนบันทึก (capture: ก่อน handler ของ script.js)
        document.addEventListener('click', function (e) {
            if (!e.target.closest || !e.target.closest('#formpoolvilla .savepool')) return;
            var err = validateNew();
            if (err) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); Swal.fire({ icon: 'warning', title: err, confirmButtonText: 'ตกลง' }); }
        }, true);
        // เปิดแก้ไข: ดู #houseedit
        var he = f.find('#houseedit')[0];
        if (he) new MutationObserver(function () { setTimeout(function () { onEditOpen(String($(he).text() || '').trim()); }, 50); }).observe(he, { childList: true, characterData: true, subtree: true });
    });
    window.pailayMultiSlip = { inject: inject, sync: sync, validate: validateNew, editState: function () { return multi; } };
})();
