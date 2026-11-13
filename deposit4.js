/* แบ่งมัดจำได้สูงสุด 4 งวด (14 พ.ย. 2569) — ไม่แก้ script.js
 *
 * ลงใบจอง (แบ่งมัดจำ): script.js สร้างช่อง #paytotal1/#paytotal2 ใน #deposit-extra → เราเติม "จำนวนงวด 2/3/4" + ช่องงวด 3/4 (ไม่มี id)
 *   ห่อ window.savepool ส่ง dep_count / paytotal3 / paytotal4 → หลังบ้านเก็บในแถวงวดที่ 1 ของ บันทึกรายรับ คอลัมน์ O/P
 * รายการค้างชำระ: เขียน populateTable ใหม่ (นับงวดที่จ่ายแล้วเทียบจำนวนงวดตามแผน) · การ์ดบอกงวดถัดไป + ยอดตามแผน
 *   กดเพิ่มการชำระ → หน้า "ชำระงวดที่ N" · ห่อ window.savepaydeposit ส่ง depositno = N (หลังบ้านลง "มัดจำงวดที่ N")
 * บันทึกรายรับ: [9]=J งวด1 · [10]=K งวด2 · [14]=O งวด3 · [15]=P งวด4 (แผน) · [7]=H "มัดจำงวดที่ n" · [8]=I "แบ่งมัดจำ"
 */
(function () {
    'use strict';
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    /* ---------- ฟอร์มลงใบจอง ---------- */
    var BOX = '<div class="col-12 mb-1 dep4-box">' +
        '<div class="d-flex align-items-center gap-2 flex-wrap mb-1"><span class="fw-semibold">จำนวนงวด</span>' +
        '<div class="btn-group" role="group">' +
        [2, 3, 4].map(function (n) { return '<button type="button" class="btn btn-outline-primary btn-sm dep4-n' + (n === 2 ? ' active' : '') + '" data-n="' + n + '">' + n + ' งวด</button>'; }).join('') +
        '</div></div>' +
        '<div class="dep4-extra"></div></div>';
    function count() { var b = $('#formpoolvilla .dep4-n.active'); return b.length ? Number(b.data('n')) : 2; }
    function drawExtra() {
        var n = count(), h = '';
        for (var k = 3; k <= n; k++) h += '<div class="form-floating mb-1"><input class="form-control dep4-amt" data-k="' + k + '" type="text" inputmode="decimal" placeholder="ยอดมัดจำงวดที่ ' + k + '"><label>ยอดมัดจำงวดที่ ' + k + '</label></div>';
        var keep = {}; $('#formpoolvilla .dep4-amt').each(function () { keep[$(this).data('k')] = $(this).val(); });
        $('#formpoolvilla .dep4-extra').html(h);
        $('#formpoolvilla .dep4-amt').each(function () { if (keep[$(this).data('k')]) $(this).val(keep[$(this).data('k')]); });
    }
    function inject() {
        var $extra = $('#formpoolvilla #deposit-extra');
        if (!$extra.length || !$('#formpoolvilla #paytotal2').length || $extra.find('.dep4-box').length) return;
        $extra.append(BOX);
        drawExtra();
    }
    function splitOn() { return $('#formpoolvilla #deposit1').is(':checked') && $('#formpoolvilla #paytotal2').length > 0; }

    /* ---------- รายการค้างชำระ (แทน populateTable ของ script.js) ---------- */
    function plan(r1) { // จำนวนงวด + ยอดตามแผน จากแถวงวดที่ 1
        var p = [num(r1[9]), num(r1[10]), num(r1[14]), num(r1[15])];
        var n = 2 + (p[2] > 0 ? 1 : 0) + (p[3] > 0 ? 1 : 0);
        return { n: n, amt: p };
    }
    function pendingRows(data) {
        var by = {};
        data.filter(function (r) { return r[8] === 'แบ่งมัดจำ'; }).forEach(function (r) { (by[r[1]] = by[r[1]] || []).push(r); });
        var out = [];
        Object.keys(by).forEach(function (uid) {
            var rows = by[uid], r1 = rows.filter(function (r) { return String(r[7]) === 'มัดจำงวดที่ 1'; })[0] || rows[0];
            var p = plan(r1), paid = rows.length;
            if (paid < p.n) out.push({ r1: r1, rows: rows, plan: p, next: paid + 1 });
        });
        return out;
    }
    function card(item, idx, room) {
        var r1 = item.r1, img = '';
        if (typeof r1[6] === 'string' && r1[6].indexOf('https://lh3.googleusercontent.com/d/') === 0)
            img = '<img src="' + esc(r1[6]) + '" alt="สลิป" class="img-thumbnail" style="max-width:25px;height:auto" onclick="openImagePopup(\'' + esc(r1[6]) + '\')">';
        var paidLines = item.rows.filter(function (r) { return r !== r1; }).map(function (r) {
            return '<p class="card-text">' + esc(r[7]) + ': ' + esc(checkAndFormatDate(r[3])) + ' · ' + money(num(r[4])) + ' บาท</p>';
        }).join('');
        var due = item.plan.amt[item.next - 1];
        return '<div class="card mb-1 shadow-sm clickable-card" data-row="' + idx + '"><div class="card-body"><div class="d-flex justify-content-between align-items-start">' +
            '<div class="card-content"><h5 class="card-title">บ้าน: ' + esc(room[1] || '') + '</h5>' +
            '<p class="card-text">ชื่อผู้จอง: ' + esc(room[2] || '') + '</p>' +
            '<p class="card-text">วันที่เข้าพัก: ' + esc(checkAndFormatDate(room[8])) + '</p><hr>' +
            '<p class="card-text">แบ่ง ' + item.plan.n + ' งวด · ชำระแล้ว ' + item.rows.length + ' งวด</p>' +
            '<p class="card-text">งวดที่ 1: ' + esc(checkAndFormatDate(r1[3])) + ' · ' + money(item.plan.amt[0]) + ' บาท</p>' + paidLines + '<hr>' +
            '<p class="card-text fw-semibold">งวดที่ ' + item.next + ' ค้างชำระอีก : ' + money(due) + ' บาท</p></div>' +
            '<div class="d-flex gap-2 align-items-center">' + (img ? '<div>' + img + '</div>' : '') +
            '<button class="btn btn-outline-primary btn-sm edits" data-row="' + idx + '"><i class="bi bi-pencil-square"></i> เพิ่มการชำระงวดที่ ' + item.next + '</button></div>' +
            '</div></div></div>';
    }
    function openPay(item, room) {
        clearForm('info');
        showhidepage('.paydeposit,nav');
        $('.idlist').text(room[0] || '');
        $('#paydepositadd').val(item.plan.amt[item.next - 1] || '');
        $('#paydeposit legend').first().text('ชำระงวดที่ ' + item.next);
        window.__pailayDepNo = item.next;
    }
    function populate(data) {
        var items = pendingRows(data || []);
        var $box = $('#usertables').empty();
        var q = String($('#searchuser').val() || '').toLowerCase().trim();
        var rl = (typeof roomlist !== 'undefined' && roomlist) || [];
        var filtered = items.filter(function (it) {
            var room = rl.find(function (r) { return r[0] === it.r1[1]; }) || [];
            if (!q) return true;
            return it.r1.some(function (c) { return c && String(c).toLowerCase().indexOf(q) >= 0; }) || room.some(function (c) { return c && String(c).toLowerCase().indexOf(q) >= 0; });
        });
        var size = (typeof totalPages !== 'undefined' && totalPages) || 10;
        var page = (typeof currentPage !== 'undefined' && currentPage) || 1;
        var start = (page - 1) * size;
        filtered.slice(start, start + size).forEach(function (it, i) {
            var room = rl.find(function (r) { return r[0] === it.r1[1]; }) || [];
            var $c = $(card(it, start + i, room));
            $c.on('click', function (e) { e.preventDefault(); openPay(it, room); });
            $c.find('.edits').on('click', function (e) { e.preventDefault(); e.stopPropagation(); openPay(it, room); });
            $box.append($c);
        });
        if (typeof createPagination === 'function') createPagination('#userlistpage', Math.ceil(filtered.length / size), page, function (p) { currentPage = p; populate(data); });
    }

    $(document).ready(function () {
        // ลงใบจอง
        var form = document.getElementById('formpoolvilla');
        if (form) new MutationObserver(function () { if ($('#formpoolvilla #deposit1').is(':checked')) inject(); }).observe(form, { childList: true, subtree: true });
        $(document).on('click', '#formpoolvilla .dep4-n', function () {
            $('#formpoolvilla .dep4-n').removeClass('active'); $(this).addClass('active'); drawExtra();
        });
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.savepool');
            if (!btn || !splitOn()) return;
            var n = count(), miss = [];
            for (var k = 3; k <= n; k++) if (!(num($('#formpoolvilla .dep4-amt[data-k="' + k + '"]').val()) > 0)) miss.push(k);
            if (miss.length) { e.preventDefault(); e.stopImmediatePropagation(); Swal.fire({ icon: 'warning', title: 'กรุณาใส่ยอดมัดจำงวดที่ ' + miss.join(', '), confirmButtonText: 'ตกลง' }); }
        }, true);
        var origSave = window.savepool;
        if (typeof origSave === 'function') window.savepool = function (itemData) {
            var extra = {};
            if (splitOn()) {
                var n = count();
                extra = { dep_count: String(n), paytotal3: n >= 3 ? String(num($('#formpoolvilla .dep4-amt[data-k="3"]').val())) : '', paytotal4: n >= 4 ? String(num($('#formpoolvilla .dep4-amt[data-k="4"]').val())) : '' };
            }
            return origSave.call(this, Object.assign({}, itemData, extra));
        };

        // รายการค้างชำระ + ชำระงวดถัดไป
        window.populateTable = populate;
        var origPay = window.savepaydeposit;
        if (typeof origPay === 'function') window.savepaydeposit = function (itemData) {
            return origPay.call(this, Object.assign({}, itemData, { depositno: String(window.__pailayDepNo || 2) }));
        };
    });
})();
