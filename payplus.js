/* บัตรเครดิต (รอยอดเข้า) + VAT 7% (16 พ.ย. 2569) — ไม่แก้ script.js
 *
 * ฟอร์มลงบันทึกการจอง:
 *   - ปุ่ม "บัตรเครดิต" ข้างเงินสด/โอนจ่าย (#pay_card name=paytype) → ใช้ช่องแบบโอนจ่ายของ script.js (typepay pay_2) บัญชี = บัญชีบริษัทกสิกร
 *     แสดงค่าธรรมเนียม 3% (ลูกค้าจ่ายเพิ่ม) · ห่อ savepool: pay_2 = "บัตรเครดิต (รอยอดเข้า)" · หลังบ้าน card.gs ลงค่าธรรมเนียม + รายการรอยอด
 *   - กล่อง VAT 7% ในสรุปค่าที่พัก: ไม่มี / ราคายังไม่รวม VAT (+7%) / ราคารวม VAT แล้ว · ฐาน = ราคารวม − ค่าประกัน
 *     ห่อ savepool: excl → totalall/overdue + VAT · ส่ง vat_mode/vat_base/vat_amount (หลังบ้าน vat.gs) · เปิดแก้ไขดึงค่าเดิม (opt=getvat)
 * เมนู "รอยอดบัตรเครดิต" (.cardwait): รายการรอยอด (opt=cardlist) → "ยอดเข้าแล้ว" (opt=cardsettle)
 */
(function () {
    'use strict';
    var MARK = 'บัตรเครดิต (รอยอดเข้า)', ACC = 'บจก.ไปเล วิลล่า 2173856191', RATE = 0.03, VAT = 0.07;
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
    function r2(n) { return Math.round(n * 100) / 100; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
    function api(opt, data) { return fetch(scriptUrl, { method: 'POST', body: new URLSearchParams(Object.assign({ opt: opt }, data || {})), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(function (r) { return r.json(); }); }
    window.pailayCard = { MARK: MARK, ACC: ACC, fee: function (a) { return r2(num(a) * RATE); } };
    window.pailayVat = { calc: function (mode, base) { base = num(base); return mode === 'excl' ? r2(base * VAT) : mode === 'incl' ? r2(base * 7 / 107) : 0; } };

    /* ---------- บัตรเครดิต: ฟอร์มลงบันทึกการจอง ---------- */
    var CARD_BTN = '<div class="col-12 mb-1 card-pay-col"><input type="radio" class="btn-check" name="paytype" id="pay_card" autocomplete="off" placeholder="ช่องทางชำระเงิน" value="' + MARK + '">' +
        '<label class="btn btn-outline-primary w-100" for="pay_card"><i class="bi bi-credit-card me-1"></i>บัตรเครดิต (รอยอดเข้า · ค่าธรรมเนียม 3%)</label></div>';
    function cardOn() { return $('#pay_card').is(':checked'); }
    function cardNote() {
        var $t = $('#formpoolvilla .typepay');
        $t.find('.card-note').remove();
        if (!cardOn()) return;
        var a = num($('#paytotal').val()), f = r2(a * RATE);
        $t.append('<div class="col-12 mb-1 card-note"><div class="small p-2 rounded" style="background:rgba(13,110,253,.07)">💳 ค่าธรรมเนียมบัตร 3% = <b>' + money(f) + '</b> บาท (ลูกค้าจ่ายเพิ่ม) · ยอดรูดรวม <b>' + money(a + f) + '</b> บาท · ยอดเข้าบัญชีบริษัทกสิกร — บันทึกยอดเข้าที่เมนู "รอยอดบัตรเครดิต"</div></div>');
    }
    function onCardClick() {
        if (typeof window.typepay === 'function') window.typepay('pay_2');
        $('#pay_card').prop('checked', true);
        setTimeout(function () {
            var $pl = $('#paylist');
            if ($pl.length) {
                if (!$pl.find('option').filter(function () { return this.value === ACC; }).length) $pl.append($('<option>').val(ACC).text(ACC));
                $pl.val(ACC);
            }
            $('label[for=slip]').text('อัพโหลดสลิปเครื่องรูดบัตร');
            cardNote();
        }, 0);
    }

    /* ---------- VAT ---------- */
    var VAT_BOX = '<div class="col-12 mb-2 vat-box"><div class="fw-semibold mb-1">VAT 7%</div>' +
        '<div class="btn-group w-100 mb-1 flex-wrap" role="group">' +
        '<input type="radio" class="btn-check vat-r" name="vat-mode" id="vat-none" value="none" checked><label class="btn btn-sm btn-outline-primary" for="vat-none">ไม่มี VAT</label>' +
        '<input type="radio" class="btn-check vat-r" name="vat-mode" id="vat-excl" value="excl"><label class="btn btn-sm btn-outline-primary" for="vat-excl">ราคายังไม่รวม VAT (+7%)</label>' +
        '<input type="radio" class="btn-check vat-r" name="vat-mode" id="vat-incl" value="incl"><label class="btn btn-sm btn-outline-primary" for="vat-incl">ราคารวม VAT แล้ว</label></div>' +
        '<div class="small vat-sum"></div></div>';
    function vatMode() { return $('#formpoolvilla input[name=vat-mode]:checked').val() || 'none'; }
    function vatBase() { return r2(num($('#totalall').val()) - num($('#totalhouse').val())); }
    function vatSum() {
        var m = vatMode(), base = vatBase(), v = window.pailayVat.calc(m, base), $s = $('#formpoolvilla .vat-sum');
        if (m === 'none') return $s.text('');
        $s.html(m === 'excl'
            ? 'ฐาน (ไม่รวมค่าประกัน) ' + money(base) + ' · VAT 7% <b>' + money(v) + '</b> → ลูกค้าจ่ายรวม <b>' + money(num($('#totalall').val()) + v) + '</b> (รวมค่าประกัน) · ยอดค้างเพิ่มขึ้น ' + money(v)
            : 'ราคา ' + money(base) + ' รวม VAT 7% แล้ว (VAT ' + money(v) + ') · ยอดไม่เปลี่ยน');
    }
    function setVat(mode) { $('#formpoolvilla #vat-' + (mode || 'none')).prop('checked', true); vatSum(); }

    function wrap() {
        var orig = window.savepool;
        if (typeof orig === 'function') window.savepool = function (itemData) {
            if (itemData) {
                var card = !!itemData.pay_card;
                delete itemData.pay_card;
                if (card && !itemData.houseedit) { delete itemData.pay_1; itemData.pay_2 = MARK; itemData.paylist = ACC; }
                var m = vatMode(), base = r2(num(itemData.totalall) - num(itemData.totalhouse)), v = window.pailayVat.calc(m, base);
                itemData.vat_mode = m; itemData.vat_base = String(base); itemData.vat_amount = String(v);
                if (m === 'excl') { itemData.totalall = String(r2(num(itemData.totalall) + v)); itemData.overdue = String(r2(num(itemData.overdue) + v)); }
            }
            return orig.apply(this, arguments);
        };
        var cv = window.checkvalue;
        if (typeof cv === 'function') window.checkvalue = function (f, ex) { return cv.call(this, f, (ex || []).concat(['pay_card', 'vat-none', 'vat-excl', 'vat-incl'])); };
    }

    /* ---------- เมนูรอยอดบัตรเครดิต ---------- */
    var PAGE = '<main class="cardwait mt-5" style="display:none"><div class="container"><div class="row">' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm"><legend class="float-none w-auto px-3">รอยอดบัตรเครดิต</legend>' +
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row"><legend class="float-none w-auto px-3">รายการที่ยังไม่เข้าบัญชี</legend>' +
        '<div class="col-12 small text-muted mb-2">ยอดเข้าบัญชี ' + ACC + ' · กด "ยอดเข้าแล้ว" เมื่อเงินเข้า ระบบลงส่วนต่างเป็นค่าธรรมเนียมบัตร (รายจ่าย)</div>' +
        '<div class="col-12 cw-list">กำลังโหลด…</div></fieldset></fieldset></div></div></main>';
    function loadList() {
        var $l = $('.cardwait .cw-list').html('กำลังโหลด…');
        api('cardlist').then(function (res) {
            var d = (res && res.data) || [];
            if (!d.length) return $l.html('<div class="text-muted">ไม่มีรายการรอยอด ✓</div>');
            $l.html(d.map(function (x) {
                return '<div class="card mb-2 shadow-sm"><div class="card-body"><div class="fw-semibold">' + esc(x.house) + '</div><div>' + esc(x.customer) + ' · ' + esc(x.label) + '</div>' +
                    '<div class="small text-muted">รูดวันที่ ' + esc(x.date) + ' · ยอด ' + esc(x.amount) + ' + ค่าธรรมเนียม ' + esc(x.fee) + '</div>' +
                    '<div class="d-flex justify-content-between align-items-center mt-1"><b>ยอดรูดรวม ' + esc(x.total) + ' บาท</b>' +
                    '<button class="btn btn-sm btn-success cw-settle" data-id="' + esc(x.id) + '" data-total="' + esc(x.total) + '">ยอดเข้าแล้ว</button></div></div></div>';
            }).join(''));
        }).catch(function () { $l.html('<div class="text-danger">โหลดไม่สำเร็จ</div>'); });
    }
    function settle(id, total) {
        Swal.fire({
            title: 'ยอดบัตรเครดิตเข้าแล้ว',
            html: '<div class="small text-start mb-2">ยอดรูดรวม ' + esc(total) + ' บาท</div><input type="date" class="form-control mb-2 cw-date"><input type="text" inputmode="decimal" class="form-control cw-actual" placeholder="ยอดที่เข้าบัญชีจริง (บาท)">',
            didOpen: function () { Swal.getHtmlContainer().querySelector('.cw-date').value = today(); },
            showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', reverseButtons: true,
            preConfirm: function () {
                var c = Swal.getHtmlContainer(), a = num(c.querySelector('.cw-actual').value), d = c.querySelector('.cw-date').value;
                if (!d) return Swal.showValidationMessage('กรุณาเลือกวันที่ยอดเข้า');
                if (!(a > 0)) return Swal.showValidationMessage('กรุณาใส่ยอดที่เข้าจริง');
                if (a > num(total) + 0.001) return Swal.showValidationMessage('ยอดเข้ามากกว่ายอดรูด');
                return { id: id, date: d, actual: String(a), user: localStorage.getItem('name') || '' };
            }
        }).then(function (r) {
            if (!r.isConfirmed) return;
            api('cardsettle', r.value).then(function (res) { Swal.fire({ icon: res.status === 'success' ? 'success' : 'error', title: res.message, confirmButtonText: 'ตกลง' }); loadList(); });
        });
    }

    $(document).ready(function () {
        // ปุ่มบัตรเครดิต (ใต้ปุ่มเงินสด/โอนจ่าย · ก่อนปุ่ม OTA/วอล์กอิน)
        var $pay2 = $('#formpoolvilla #pay_2').closest('.col-6');
        if ($pay2.length) $pay2.after(CARD_BTN);
        $(document).on('click', '#pay_card', onCardClick);
        $(document).on('click', '#pay_1, #pay_2, #pay_ota, #pay_walkin', function () { setTimeout(function () { $('#formpoolvilla .card-note').remove(); $('label[for=slip]').text('อัพโหลดสลิปโอนเงิน'); }, 0); });
        $(document).on('input change', '#formpoolvilla #paytotal', cardNote);
        $(document).on('input change', '#bookinguser', function () { var ota = window.pailayOta && window.pailayOta.isOtaChannel($('#bookinguser').val()); $('#formpoolvilla .card-pay-col').toggle(!ota); });
        // VAT
        var $sum = $('#formpoolvilla .addpaytotal').closest('fieldset');
        if ($sum.length) $sum.append(VAT_BOX);
        $(document).on('change', '#formpoolvilla .vat-r', vatSum);
        $(document).on('input change', '#formpoolvilla input', function () { if (vatMode() !== 'none') setTimeout(vatSum, 50); });
        var he = document.getElementById('houseedit');
        if (he) new MutationObserver(function () {
            var uid = String(he.textContent || '').trim();
            setVat('none');
            if (uid) api('getvat', { uid: uid }).then(function (res) { if (res && res.data && String($('#houseedit').text()).trim() === uid) setVat(res.data.mode); }).catch(function () { });
        }).observe(he, { childList: true, characterData: true, subtree: true });
        $(document).on('click', '.card-row', function () { setTimeout(function () { setVat('none'); }, 0); });
        // เมนูรอยอดบัตรเครดิต
        $('body').append(PAGE);
        var $after = $('.navbar-nav a[data-target=".checkout"]').closest('li');
        var li = '<li class="nav-item"><a class="nav-link active navigate-button cw-nav" href="#" data-bs-toggle="collapse" data-bs-target=".navbar-collapse.show" data-target=".cardwait">รอยอดบัตรเครดิต</a></li>';
        if ($after.length) $after.after(li); else $('.navbar-nav').append(li);
        $(document).on('click', '.cw-nav', function () { setTimeout(loadList, 50); });
        $(document).on('click', '.cw-settle', function () { settle($(this).data('id'), $(this).data('total')); });
        wrap();
    });
})();
