/* หน้า "รอการเข้าพักบ้านนอกเครือ" (.houseoutsidelist) — 29 ต.ค. 2569
 *
 * บ้านนอกเครือ: เราแค่ออกใบจองให้ลูกค้าและบันทึกรายรับ ไม่ได้รอรับชำระ
 * → แสดงทุกใบที่ลงบันทึก (แท็บ บันทึกบ้านนอกเครือ = doGet data7, ตัวแปร houseoutside ของ script.js)
 *   จนเลยวันเช็คเอ้าไป 2 วันแล้วหายเอง · การ์ดดูอย่างเดียว: รายละเอียด / รายรับ + สลิป / ใบจอง PDF
 * รายการเดิมของ script.js (ค้างชำระ + ปุ่มเพิ่มการชำระยอดคงเหลือ) ซ่อนไว้ (ไม่ลบโค้ด)
 * คอลัมน์ (savehouseoutsides): C ชื่อ · D เบอร์ · G ช่องทาง · I/J เข้า-ออก · K คืน · Z ราคารวม · AF (32) ลิงก์ PDF
 */
(function () {
    var KEEP_DAYS = 2;
    var box;

    function dayKey(v) {
        var s = String(v || '').trim();
        var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        var d = new Date(s);
        if (isNaN(d.getTime())) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    function fmt(d) { return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + (d.getFullYear() + 543) : '-'; }
    function num(v) { return parseFloat(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
    function money(v) { return num(v).toLocaleString('th-TH', { maximumFractionDigits: 2 }); }

    function render() {
        if (!box || typeof houseoutside === 'undefined') return;
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var q = String($('#searchusers').val() || '').toLowerCase().trim();
        var incomes = typeof income !== 'undefined' ? income : [];
        var rows = (houseoutside || []).filter(function (r) {
            if (!r || !r[0] || r[0] === '-') return false;
            var out = dayKey(r[9]);
            if (!out) return false;
            var last = new Date(out.getTime()); last.setDate(last.getDate() + KEEP_DAYS);
            return last >= today;
        }).sort(function (a, b) { return (dayKey(a[8]) || 0) - (dayKey(b[8]) || 0); });

        box.innerHTML = '';
        rows.forEach(function (r) {
            var pays = incomes.filter(function (p) { return p[1] === r[0]; });
            var $c = $(
                '<div class="col-md-4 col-12 mb-1"><div class="card mb-1 shadow-sm"><div class="card-body">' +
                '  <h5 class="card-title mb-1 o-house"></h5>' +
                '  <div><b>ชื่อผู้จอง:</b> <span class="o-name"></span></div>' +
                '  <div><b>เบอร์:</b> <span class="o-tel"></span></div>' +
                '  <div><b>ช่องทาง:</b> <span class="o-ch"></span></div>' +
                '  <div><b>เข้าพัก:</b> <span class="o-dates"></span></div>' +
                '  <div><b>ราคารวม:</b> <span class="o-total"></span> บาท</div>' +
                '  <hr class="my-2"><div class="o-pays small"></div>' +
                '  <button type="button" class="btn btn-outline-info btn-sm w-100 mt-2 o-pdf"><i class="bi bi-file-earmark-pdf me-1"></i>ดูใบจอง</button>' +
                '</div></div></div>');
            // ใส่ข้อความด้วย .text() กันอักขระพิเศษ
            $c.find('.o-house').text('บ้าน: ' + (r[1] || ''));
            $c.find('.o-name').text(r[2] || '-');
            $c.find('.o-tel').text(r[3] || '-');
            $c.find('.o-ch').text(r[6] || '-');
            $c.find('.o-dates').text(fmt(dayKey(r[8])) + ' → ' + fmt(dayKey(r[9])) + (r[10] ? ' (' + r[10] + ' คืน)' : ''));
            $c.find('.o-total').text(money(r[25]));
            var $p = $c.find('.o-pays');
            if (!pays.length) $p.text('ยังไม่มีรายการรับเงิน');
            pays.forEach(function (p) {
                var $line = $('<div class="d-flex align-items-center gap-2 mb-1"><span class="flex-grow-1"></span></div>');
                $line.find('span').text(fmt(dayKey(p[3])) + ' · ' + (p[2] || '') + ' ' + money(p[4]) + ' บาท' + (p[5] ? ' (' + p[5] + ')' : ''));
                if (/^https:\/\/lh3\.googleusercontent\.com\/d\//.test(String(p[6] || ''))) {
                    var $img = $('<img class="img-thumbnail" style="max-width:32px;height:auto;cursor:pointer" alt="สลิป">').attr('src', p[6]);
                    $img.on('click', function () { if (typeof openImagePopup === 'function') openImagePopup(p[6]); });
                    $line.append($img);
                }
                $p.append($line);
            });
            var pdf = String(r[31] || '');
            if (/^https?:\/\//.test(pdf)) $c.find('.o-pdf').on('click', function () { window.open(pdf, '_blank'); });
            else $c.find('.o-pdf').prop('disabled', true).text('ยังไม่มีใบจอง');
            if (q && $c.text().toLowerCase().indexOf(q) === -1) return;
            $(box).append($c);
        });
        if (!box.children.length) $(box).append('<div class="col-12 text-center text-muted py-3">ไม่มีใบจองบ้านนอกเครือที่รอเข้าพัก</div>');
    }

    $(document).ready(function () {
        var old = document.getElementById('houseoutsidetables');
        if (!old) return;
        old.insertAdjacentHTML('afterend', '<div id="houseoutside-cards" class="row"></div>');
        box = document.getElementById('houseoutside-cards');
        // ซ่อนรายการค้างชำระเดิม + ตัวแบ่งหน้า (ปุ่มเพิ่มการชำระยอดคงเหลือเลิกใช้)
        old.style.display = 'none';
        // id="controls-container" ซ้ำหลายหน้า → หาจากตัวเลือกจำนวนรายการของหน้านี้
        var sel = document.getElementById('houseoutsidelistSelect');
        var ctrl = sel && sel.closest('[id="controls-container"]');
        if (ctrl) ctrl.style.setProperty('display', 'none', 'important'); // class d-flex ของ Bootstrap เป็น !important
        // วาดใหม่เมื่อข้อมูลนอกเครือ (script.js วาดรายการเดิม) หรือรายรับ (#usertables) เปลี่ยน
        ['houseoutsidetables', 'usertables'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) new MutationObserver(render).observe(el, { childList: true });
        });
        $(document).on('input', '#searchusers', render);
        render();
    });
})();
