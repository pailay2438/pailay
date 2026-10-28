/* หน้า Check In / Check Out: เรียงการ์ดให้ลูกค้าของ "วันนี้" อยู่บนสุด (29 ต.ค. 2569)
 *
 * Check In (#housetable) ดูวันเข้าพัก (คอลัมน์ I) · Check Out (#housetable2) ดูวันออก (คอลัมน์ J)
 * ลำดับ: วันนี้ → วันถัดไปเรียงใกล้ไปไกล → ใบที่เลยวันมาแล้วไว้ท้าย
 * การ์ดวันนี้มีป้าย "วันนี้" — script.js วาดการ์ดใหม่ทุกครั้งที่ข้อมูลอัปเดต → จัดลำดับซ้ำด้วย MutationObserver
 * (ข้อมูลการ์ดอ้าง roomlist ของ script.js ผ่าน data-row เหมือน postpone.js)
 */
(function () {
    var LISTS = [
        { id: 'housetable', col: 8, label: 'เข้าพักวันนี้' },
        { id: 'housetable2', col: 9, label: 'เช็คเอ้าวันนี้' }
    ];

    function dayKey(v) {
        var s = String(v || '').trim();
        var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return Number(m[1] + m[2] + m[3]);
        var d = new Date(s);
        if (isNaN(d.getTime())) return Infinity;
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    function todayKey() {
        var d = new Date();
        return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    }

    function sortList(list) {
        var box = document.getElementById(list.id);
        if (!box || typeof roomlist === 'undefined') return;
        var today = todayKey();
        var items = Array.prototype.map.call(box.children, function (col, i) {
            var btn = col.querySelector('[data-row]');
            var row = btn ? roomlist[Number(btn.getAttribute('data-row'))] : null;
            var key = row ? dayKey(row[list.col]) : Infinity;
            return { col: col, i: i, key: key, isToday: key === today };
        });
        items.forEach(function (it) {
            var card = it.col.querySelector('.card-body');
            var badge = it.col.querySelector('.today-badge');
            if (it.isToday && card && !badge) {
                card.insertAdjacentHTML('afterbegin', '<span class="badge bg-danger today-badge mb-2">' + list.label + '</span>');
            } else if (!it.isToday && badge) {
                badge.remove();
            }
        });
        // วันนี้ → วันถัดไปเรียงใกล้ไปไกล → ใบที่เลยวันมาแล้ว (ล่าสุดก่อน) ไว้ท้าย
        var group = function (it) { return it.isToday ? 0 : it.key > today ? 1 : 2; };
        var sorted = items.slice().sort(function (a, b) {
            var ga = group(a), gb = group(b);
            if (ga !== gb) return ga - gb;
            return (ga === 2 ? b.key - a.key : a.key - b.key) || a.i - b.i;
        });
        var changed = sorted.some(function (it, i) { return it !== items[i]; });
        if (changed) sorted.forEach(function (it) { box.appendChild(it.col); });
    }

    $(document).ready(function () {
        LISTS.forEach(function (list) {
            var box = document.getElementById(list.id);
            if (!box) return;
            sortList(list);
            new MutationObserver(function () { sortList(list); }).observe(box, { childList: true });
        });
    });
})();
