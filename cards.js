/* การ์ดรายการแบบใหม่ เฟส 2 (17 พ.ย. 2569) — คู่กับ ocean.css (ส่วน "การ์ดรายการ")
 * ใช้กับ: #housetable (Check In) · #ota-wait · #stayinglist (ระหว่างพัก) · #ota-stay · #housetable2 (Check Out)
 * ไม่ย้าย/ไม่ลบปุ่มเดิม (handler ของ script.js/postpone/bookingplus/pages ผูกกับปุ่มตรง ๆ) — ทำแค่:
 *   1) เติมหัวการ์ด .plc-head: ป้ายสีบ้าน · ชื่อลูกค้า · ไอคอนใบรวม · ป้ายวัน · วันเข้า→ออก · คืน/ท่าน · ยอดที่ต้องรู้
 *   2) ติดบทบาทให้กล่องปุ่ม: .plc-pri (ปุ่มหลัก) · .plc-sec (ปุ่มรอง) · .plc-more (ซ่อนไว้ใต้ปุ่ม ⋯) แล้วจัดเรียงด้วย CSS
 *   3) แท็บกรอง (Check In: ทั้งหมด/วันนี้/พรุ่งนี้/7 วัน · ระหว่างพัก: ทั้งหมด/ออกวันนี้/เลยวันออก) ด้วยคลาส .plc-hide
 *      (ไม่แตะ style.display ที่ postpone.js ใช้ซ่อนใบที่เลื่อน)
 * ถอด = ลบ <script src="cards.js">
 */
(function () {
    'use strict';
    function arr(name) { try { var v = window.eval(name); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function pad(n) { return ('0' + n).slice(-2); }
    function ymdOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function ymd(x) { var m = String(x == null ? '' : x).match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0]; var d = new Date(x); return isNaN(d) ? '' : ymdOf(d); }
    function hm(x) { var m = String(x == null ? '' : x).match(/(\d{1,2}):(\d{2})/); return m ? pad(m[1]) + ':' + m[2] : ''; }
    function addDays(s, n) { var p = s.split('-'); return ymdOf(new Date(+p[0], +p[1] - 1, +p[2] + n)); }
    var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'], TH_D = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    function thd(s) { if (!s) return '-'; var p = s.split('-'); return +p[2] + ' ' + TH_M[+p[1] - 1]; }
    function dow(s) { return TH_D[new Date(s + 'T00:00:00').getDay()] + ' ' + (+s.slice(8)); }
    var HOUSES = [
        { re: /pailay/i, short: 'Pailay', c: '#a4c2f4' }, { re: /view\s*lay/i, short: 'Viewlay', c: '#b6d7a8' },
        { re: /sea\s*time/i, short: 'Sea Time', c: '#f6b26b' }, { re: /sun\s*rise|sunsea2/i, short: 'Sun rise', c: '#f9cb9c' },
        { re: /sun\s*sea/i, short: 'Sun Sea', c: '#ffd966' }, { re: /bubble/i, short: 'Bubble Sea', c: '#93c47d' }
    ];
    function house(name) { var n = String(name || ''); for (var i = 0; i < HOUSES.length; i++) if (HOUSES[i].re.test(n)) return HOUSES[i]; return { short: n.split(' ')[0] || n, c: '#dfe7ec' }; }

    // โหมดของแต่ละกล่อง: date = วันที่ใช้กรอง/ป้าย · money = ยอดที่แสดง
    var BOXES = {
        housetable: { mode: 'in', tabs: [['all', 'ทั้งหมด'], ['today', 'วันนี้'], ['tmr', 'พรุ่งนี้'], ['week', '7 วัน']] },
        'ota-wait': { mode: 'in' },
        stayinglist: { mode: 'stay', tabs: [['all', 'ทั้งหมด'], ['today', 'ออกวันนี้'], ['late', 'เลยวันออก']] },
        'ota-stay': { mode: 'stay' },
        housetable2: { mode: 'out' }
    };
    var tabSel = {};

    function rowOf(card) { var b = card.querySelector('[data-row]'); return b ? arr('roomlist')[Number(b.getAttribute('data-row'))] || null : null; }
    function chipOf(mode, b, today) {
        var din = ymd(b[8]), dout = ymd(b[9]);
        if (mode === 'in') {
            if (din === today) return ['t', 'วันนี้'];
            if (din === addDays(today, 1)) return ['w', 'พรุ่งนี้'];
            if (din && din < today) return ['t', 'เลยวันเข้า'];
            return ['d', din ? dow(din) : '-'];
        }
        if (mode === 'stay') {
            if (dout === today) return ['w', 'ออกวันนี้'];
            if (dout && dout < today) return ['t', 'เลยวันออก'];
            return ['d', 'ออก ' + (dout ? dow(dout) : '-')];
        }
        return ['ok', 'เช็คเอาต์แล้ว'];
    }
    function headHtml(mode, b, today) {
        var h = house(b[1]), din = ymd(b[8]), dout = ymd(b[9]), ch = chipOf(mode, b, today);
        var nights = num(b[10]) || '-', guests = b[12] || '-';
        var grp = window.pailayGroup && window.pailayGroup.groups && window.pailayGroup.groups()[String(b[0]).trim()];
        var line3 = mode === 'in'
            ? '<span>ค้างจ่ายวันเข้าพัก (รวมประกัน)</span><b class="' + (num(b[26]) > 0 ? 'plc-red' : '') + '">฿' + money(num(b[26])) + '</b>'
            : '<span>ค่าประกันบ้านพัก</span><b>฿' + money(num(b[24])) + '</b>';
        return '<div class="plc-top"><span class="plc-tag" style="background:' + h.c + '">' + esc(h.short) + '</span><b class="plc-name">' + esc(b[2]) + '</b>' +
            (grp ? '<i class="bi bi-houses plc-grp" title="ใบจองหลายหลัง (ใบรวม)"></i>' : '') + '<span class="plc-chip ' + ch[0] + '">' + esc(ch[1]) + '</span></div>' +
            '<div class="plc-kv"><span>' + thd(din) + ' ' + esc(hm(b[8]) || '14:00') + ' → ' + thd(dout) + ' ' + esc(hm(b[9]) || '11:00') + '</span><b>' + esc(nights) + ' คืน · ' + esc(guests) + ' ท่าน</b></div>' +
            '<div class="plc-kv">' + line3 + '</div>';
    }
    function shown(el, card) { for (var e = el; e && e !== card; e = e.parentElement) if (e.style && e.style.display === 'none') return false; return true; }
    function wrapperOf(btn, body) { var w = btn; while (w.parentElement && w.parentElement !== body && !w.parentElement.classList.contains('row')) w = w.parentElement; return w; }

    function decorate(col, mode, today) {
        var card = col.querySelector('.card');
        var body = card && card.querySelector('.card-body');
        var b = card && rowOf(card);
        if (!body || !b) return;
        card.classList.add('plc');
        var head = body.querySelector(':scope > .plc-head');
        if (!head) { body.insertAdjacentHTML('afterbegin', '<div class="plc-head"></div>'); head = body.querySelector(':scope > .plc-head'); }
        if (body.firstElementChild !== head) body.insertBefore(head, body.firstElementChild); // pages.js/todayfirst แทรกด้านบน → หัวการ์ดอยู่บนสุดเสมอ
        var html = headHtml(mode, b, today);
        if (head.getAttribute('data-sig') !== html) { head.innerHTML = html; head.setAttribute('data-sig', html); }
        // บทบาทปุ่ม
        var wraps = [];
        Array.prototype.forEach.call(body.querySelectorAll(':scope > .row button.btn'), function (btn) {
            if (btn.classList.contains('plc-more-btn')) return;
            var w = wrapperOf(btn, body);
            if (wraps.indexOf(w) === -1) wraps.push(w);
        });
        var vis = wraps.filter(function (w) { return shown(w, card); });
        var find = function (re) { return vis.filter(function (w) { var bt = w.querySelector('button'); return bt && re.test(bt.className); })[0] || null; };
        var pri = find(/\b(checkinstatus|checkoutstatus|completework)\w*/);
        var sec = find(/\beditinfo\w*/) || find(/\badddeposit\w*/);
        wraps.forEach(function (w) {
            w.classList.remove('plc-pri', 'plc-sec', 'plc-more');
            w.classList.add(w === pri ? 'plc-pri' : w === sec ? 'plc-sec' : 'plc-more');
        });
        var moreCount = vis.filter(function (w) { return w !== pri && w !== sec; }).length;
        var top = (pri || sec || vis[0] || {}).parentElement;
        var tg = card.querySelector('.plc-tg');
        if (top && top.classList && top.classList.contains('row')) {
            if (!tg) { top.insertAdjacentHTML('beforeend', '<div class="plc-tg"><button type="button" class="btn btn-sm plc-more-btn" aria-label="เมนูเพิ่มเติม"><i class="bi bi-three-dots"></i></button></div>'); tg = card.querySelector('.plc-tg'); }
            else if (tg.parentElement !== top) top.appendChild(tg);
            tg.style.display = moreCount ? '' : 'none';
        }
        card.classList.toggle('plc-nopri', !pri);
        card.classList.toggle('plc-nosec', !sec);
    }
    function keyFor(mode, b) { return ymd(mode === 'in' ? b[8] : b[9]); }
    function passes(tab, mode, b, today) {
        if (!tab || tab === 'all') return true;
        var k = keyFor(mode, b);
        if (tab === 'today') return k === today;
        if (tab === 'tmr') return k === addDays(today, 1);
        if (tab === 'week') return k >= today && k <= addDays(today, 7);
        if (tab === 'late') return k && k < today;
        return true;
    }
    function drawTabs(id, cfg, box, today) {
        if (!cfg.tabs) return;
        var seg = document.querySelector('.plc-seg[data-for="' + id + '"]');
        if (!seg) {
            box.insertAdjacentHTML('beforebegin', '<div class="plc-seg" data-for="' + id + '">' + cfg.tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '">' + t[1] + ' <span></span></button>'; }).join('') + '</div>');
            seg = document.querySelector('.plc-seg[data-for="' + id + '"]');
        }
        var cur = tabSel[id] || 'all', counts = {};
        cfg.tabs.forEach(function (t) { counts[t[0]] = 0; });
        Array.prototype.forEach.call(box.children, function (col) {
            var card = col.querySelector('.card'), b = card && rowOf(card);
            if (!b || col.style.display === 'none') { col.classList.remove('plc-hide'); return; }
            cfg.tabs.forEach(function (t) { if (passes(t[0], cfg.mode, b, today)) counts[t[0]]++; });
            col.classList.toggle('plc-hide', !passes(cur, cfg.mode, b, today));
        });
        Array.prototype.forEach.call(seg.querySelectorAll('button'), function (bt) {
            var t = bt.getAttribute('data-tab');
            bt.classList.toggle('on', t === cur);
            bt.querySelector('span').textContent = '(' + (counts[t] || 0) + ')';
        });
    }
    function run(id) {
        var box = document.getElementById(id), cfg = BOXES[id];
        if (!box || !cfg) return;
        var today = ymdOf(new Date());
        Array.prototype.forEach.call(box.children, function (col) { decorate(col, cfg.mode, today); });
        drawTabs(id, cfg, box, today);
    }
    var timers = {}, watched = {};
    function schedule(id) { clearTimeout(timers[id]); timers[id] = setTimeout(function () { run(id); }, 150); }
    function watch() {
        Object.keys(BOXES).forEach(function (id) {
            var box = document.getElementById(id);
            if (!box || watched[id] === box) return;
            watched[id] = box;
            new MutationObserver(function (recs) {
                var mine = recs.every(function (r) { return Array.prototype.every.call(r.addedNodes, function (n) { return n.nodeType === 1 && (n.classList.contains('plc-head') || n.classList.contains('plc-tg')); }) && !r.removedNodes.length; });
                if (!mine) schedule(id);
            }).observe(box, { childList: true, subtree: true });
            schedule(id);
        });
    }

    $(document).ready(function () {
        watch();
        setInterval(function () { watch(); Object.keys(BOXES).forEach(function (id) { if (document.getElementById(id)) run(id); }); }, 4000);
        $(document).on('click', '.plc-more-btn', function (e) {
            e.preventDefault(); e.stopPropagation();
            var card = $(this).closest('.plc')[0];
            if (card) card.classList.toggle('plc-open');
        });
        $(document).on('click', '.plc-seg button', function () {
            var id = $(this).closest('.plc-seg').data('for');
            tabSel[id] = $(this).data('tab');
            run(id);
        });
    });
    window.pailayCards = { run: run };
    window.pailayHouse = house; // ใช้ร่วม: deposit4.js / postpone.js (ป้ายสีบ้าน)
})();
