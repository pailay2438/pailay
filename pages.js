/* แบ่งหน้าเช็คอิน/เช็คเอ้าใหม่ (29 ต.ค. 2569)
 *
 *   รายการค้างชำระ OTA (.otalist)  #ota-wait = ใบ OTA ยังไม่เช็คอิน (การ์ดจาก #housetable)
 *                                  #ota-stay = ใบ OTA เช็คอินแล้ว จนกว่าจะ "เช็คเอ้าแล้ว + รับเงินแพลตฟอร์มแล้ว" (จาก #housetable2)
 *   ระหว่างการพัก (.staying)      #stayinglist = ใบปกติ เช็คอินแล้วยังไม่เช็คเอ้า (จาก #housetable2)
 *   Check Out (#housetable2)       เหลือเฉพาะใบที่เช็คเอ้าแล้ว รอเคลียร์ 7 วัน (เพิ่มปุ่มเพิ่มรายรับ)
 *
 * ไม่วาดการ์ดใหม่: script.js ผูกปุ่มด้วย $('.class').on(...) กับทุกการ์ดในหน้าทุกครั้งที่วาด ถ้าวาดซ้ำที่อื่นปุ่มจะทำงานซ้อน
 * → ย้าย "การ์ดเดิม" (ปุ่มผูกไว้ครบแล้ว) ไปหน้าที่ถูกต้อง; เมื่อ script.js วาดรายการใหม่ (ล้าง #housetable/#housetable2)
 *   ลบการ์ดชุดเก่าที่ย้ายออกไปทิ้งก่อน แล้วย้ายชุดใหม่ · รายรับเปลี่ยน (#usertables วาดใหม่) → จัดใหม่ไม่ลบ
 * ใบที่ "เลื่อนไม่มีกำหนด" ถูก postpone.js ซ่อนไว้ใน #housetable → ไม่ย้าย (ปุ่มกำหนดวันใหม่หาการ์ดใน #housetable)
 */
(function () {
    var observers = [];
    var src1, src2, otaWait, otaStay, staying;

    function rowOf(col) {
        var btn = col.querySelector('[data-row]');
        if (!btn || typeof roomlist === 'undefined') return null;
        return roomlist[Number(btn.getAttribute('data-row'))] || null;
    }
    function ota() { return window.pailayOta || { isOta: function () { return false; }, paidTotal: function () { return 0; } }; }
    function cardsOf(el) { return el ? Array.prototype.slice.call(el.children) : []; }

    function badge(col, row, paid) {
        var body = col.querySelector('.card-body');
        if (!body) return;
        var b = body.querySelector('.ota-badge');
        if (!b) {
            body.insertAdjacentHTML('afterbegin', '<div class="ota-badge mb-2"></div>');
            b = body.querySelector('.ota-badge');
        }
        b.innerHTML = '<span class="badge bg-warning text-dark me-1">OTA</span><span class="badge bg-light text-dark border ota-ch"></span>' +
            (paid ? ' <span class="badge bg-success ota-paid"></span>' : '');
        b.querySelector('.ota-ch').textContent = row[6] || '';
        if (paid) b.querySelector('.ota-paid').textContent = 'รับเงิน OTA แล้ว ' + paid.toLocaleString('th-TH') + ' บาท';
    }

    // ปุ่ม "รับชำระจาก OTA" ที่ส่วนบนของการ์ด (ขั้นระหว่างพัก/รอเงินแพลตฟอร์ม)
    function payoutButton(col, row, show) {
        var body = col.querySelector('.card-body');
        var wrap = body && body.querySelector('.ota-payout-wrap');
        if (!show) { if (wrap) wrap.remove(); return; }
        if (!wrap && body) {
            body.insertAdjacentHTML('afterbegin',
                '<div class="ota-payout-wrap mb-2"><button type="button" class="btn btn-success btn-sm w-100 ota-payout">' +
                '<i class="bi bi-bank me-1"></i>รับชำระจาก OTA</button></div>');
            body.querySelector('.ota-payout').setAttribute('data-uid', row[0]);
        }
    }

    function setVisible(el, show) { if (el) el.style.display = show ? '' : 'none'; }

    // การ์ดหน้า Check Out (เช็คเอ้าแล้ว): เพิ่มรายรับ + Complete + PDF
    function checkoutButtons(col) {
        var add = col.querySelector('.adddeposit2');
        var out = col.querySelector('.checkoutstatus2');
        var addCell = add && add.closest('.checkouts');
        var outCell = out && out.closest('.checkouts');
        setVisible(addCell, true);
        setVisible(outCell, false);
        if (addCell) { addCell.classList.remove('col-4', 'col-6'); addCell.classList.add('col-12'); }
    }

    function route(fromRender1, fromRender2) {
        if (!src1 || typeof roomlist === 'undefined') return;
        if (fromRender1) otaWait.innerHTML = '';
        if (fromRender2) { otaStay.innerHTML = ''; staying.innerHTML = ''; }

        // ยังไม่เช็คอิน: ใบ OTA → หน้า OTA, ใบปกติ → Check In
        cardsOf(src1).concat(cardsOf(otaWait)).forEach(function (col) {
            var row = rowOf(col);
            if (!row || col.style.display === 'none') return;
            if (ota().isOta(row[0])) { badge(col, row, 0); otaWait.appendChild(col); }
            else if (col.parentElement !== src1) src1.appendChild(col);
        });

        // เช็คอินแล้ว
        cardsOf(src2).concat(cardsOf(otaStay), cardsOf(staying)).forEach(function (col) {
            var row = rowOf(col);
            if (!row) return;
            var out = String(row[33] || '').trim() !== '';
            var isOta = ota().isOta(row[0]);
            var paid = isOta ? ota().paidTotal(row[0]) : 0;
            if (isOta && !(out && paid)) {
                badge(col, row, paid);
                payoutButton(col, row, !paid);
                var complete = col.querySelector('.completework2');
                setVisible(complete && complete.closest('.complete'), false); // ยังไม่ได้เงินแพลตฟอร์ม → ห้าม Complete
                otaStay.appendChild(col);
            } else if (!out) {
                staying.appendChild(col);
            } else {
                if (isOta) { badge(col, row, paid); payoutButton(col, row, false); }
                checkoutButtons(col);
                if (col.parentElement !== src2) src2.appendChild(col);
            }
        });
        // เรียงการ์ดที่ย้ายกลับเข้า #housetable2 ใหม่ — todayfirst.js จัดเองเมื่อรายการเปลี่ยน
        observers.forEach(function (o) { o.takeRecords(); });
        updateCounts();
    }

    function updateCounts() {
        var n = function (el) { return cardsOf(el).filter(function (c) { return c.style.display !== 'none'; }).length; };
        $('.navbar-nav [data-target=".otalist"]').text('รายการค้างชำระ OTA' + (n(otaWait) + n(otaStay) ? ' (' + (n(otaWait) + n(otaStay)) + ')' : ''));
        $('.navbar-nav [data-target=".staying"]').text('ระหว่างการพัก' + (n(staying) ? ' (' + n(staying) + ')' : ''));
        $('.ota-empty').toggle(!n(otaWait) && !n(otaStay));
        $('.staying-empty').toggle(!n(staying));
    }

    function search(input, boxes) {
        var q = String(input.value || '').toLowerCase().trim();
        boxes.forEach(function (box) {
            cardsOf(box).forEach(function (col) {
                if (col.dataset.hiddenBySearch === '1') col.style.display = '';
                col.dataset.hiddenBySearch = '';
                if (q && col.style.display !== 'none' && col.textContent.toLowerCase().indexOf(q) === -1) {
                    col.style.display = 'none';
                    col.dataset.hiddenBySearch = '1';
                }
            });
        });
    }

    function watch(el, onRecords) {
        if (!el) return;
        var o = new MutationObserver(onRecords);
        o.observe(el, { childList: true });
        observers.push(o);
    }

    $(document).ready(function () {
        src1 = document.getElementById('housetable');
        src2 = document.getElementById('housetable2');
        otaWait = document.getElementById('ota-wait');
        otaStay = document.getElementById('ota-stay');
        staying = document.getElementById('stayinglist');
        if (!src1 || !src2 || !otaWait || !otaStay || !staying) return;

        // วาดใหม่จริง = การ์ดถูกลบออกจากหน้า (jQuery .empty()) · todayfirst.js เรียงใหม่/เราย้ายการ์ด = ยังอยู่ในหน้า ไม่นับ
        var hasRemoval = function (records) {
            return records.some(function (r) {
                return Array.prototype.some.call(r.removedNodes, function (n) { return !n.isConnected; });
            });
        };
        watch(src1, function (rec) { route(hasRemoval(rec), false); });
        watch(src2, function (rec) { route(false, hasRemoval(rec)); });
        watch(document.getElementById('usertables'), function () { route(false, false); }); // รายรับอัปเดต

        $(document).on('click', '.ota-payout', function (e) {
            e.preventDefault();
            e.stopPropagation();
            ota().openPayout(this.getAttribute('data-uid'));
        });
        $(document).on('input', '#searchota', function () { search(this, [otaWait, otaStay]); });
        $(document).on('input', '#searchstaying', function () { search(this, [staying]); });
        route(false, false);
    });
})();
