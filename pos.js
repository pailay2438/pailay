/* pos.js — หน้า "ออเดอร์อาหาร" (หลังบ้าน POS pailayfood) · เฟส 1 · ของเรา
 * เรียกผ่านหลังบ้านระบบจอง (opt=poslive / posact) — คีย์ POS อยู่ฝั่งหลังบ้านเท่านั้น
 * ถอด = ลบ script นี้ + บรรทัด .posorders ใน CSS · ?pos_demo=1 ใช้ข้อมูลจำลองทดสอบหน้าตา */
(function () {
    'use strict';
    if (!window.jQuery) return;
    var $ = window.jQuery, DEMO = /[?&]pos_demo=1/.test(location.search), TAB = 'pending', DATA = null, TIMER = null, BUSY = false;
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function money(n) { return Number(n || 0).toLocaleString('th-TH'); }
    function user() { return localStorage.getItem('name') || 'พนักงาน'; }
    function call(opt, data) {
        if (DEMO) return Promise.resolve(demo(opt, data));
        return fetch(scriptUrl, { method: 'POST', body: new URLSearchParams(Object.assign({ opt: opt, user: user() }, data || {})), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(function (r) { return r.json(); });
    }
    function nm(l) { return (l && (l.th || l.en)) || String(l || ''); }
    function house(name) { return (window.pailayHouse ? window.pailayHouse(name) : { s: String(name).slice(0, 2), short: name, c: '#dfe7ec' }); }
    function ago(iso) { var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return m < 1 ? 'เมื่อสักครู่' : m < 60 ? m + ' นาทีที่แล้ว' : Math.floor(m / 60) + ' ชม. ' + (m % 60) + ' นาที'; }

    /* ---------- ข้อมูล ---------- */
    function sessionOf(o) { return ((DATA && DATA.openSessions) || []).filter(function (s) { return s.id === o.sessionId; })[0] || {}; }
    function payOf(o) { return (DATA && DATA.payments && DATA.payments[o.id]) || null; }
    function paid(o) { var p = payOf(o); return p && p.status === 'APPROVED'; }
    function unpriced(o) { return (o.items || []).some(function (i) { return i.priceOnRequest && !i.pricedBy; }); }
    function bucket(o) {
        if (o.status === 'PENDING_CONFIRM') return 'pending';
        if (o.status === 'NEW' || o.status === 'COOKING') return 'cooking';
        if (o.status === 'SERVED' && !paid(o)) return 'bill';
        return 'done';
    }
    function counts() {
        var c = { pending: 0, cooking: 0, bill: 0, all: 0 };
        ((DATA && DATA.orders) || []).forEach(function (o) { if (o.status === 'CANCELLED') return; c.all++; var b = bucket(o); if (c[b] != null) c[b]++; });
        return c;
    }

    /* ---------- วาด ---------- */
    function orderCard(o) {
        var s = sessionOf(o), h = house(o.villa), b = bucket(o);
        var items = (o.items || []).map(function (i) {
            var opts = (i.options || []).map(function (x) { return nm(x.name || x.label); }).filter(Boolean).join(', ');
            var price = i.priceOnRequest && !i.pricedBy ? '<span class="po-ask">ใส่ราคา</span>' : '฿' + money(i.lineTotal);
            return '<li><span>' + esc(i.qty) + '× ' + esc(nm(i.name)) + (opts ? ' <small>(' + esc(opts) + ')</small>' : '') + (i.note ? '<em>“' + esc(i.note) + '”</em>' : '') + '</span><b>' + price + '</b></li>';
        }).join('');
        var allergy = (o.allergyLabels || []).length ? '<div class="po-allergy"><i class="bi bi-exclamation-triangle-fill"></i> แพ้: ' + esc(o.allergyLabels.join(', ')) + '</div>' : '';
        var who = (s.guestName || '-') + (s.guestPhone ? ' · ' + s.guestPhone : '');
        var btns = '';
        if (b === 'pending') btns = '<button class="po-btn" data-do="edit">แก้ไข</button><button class="po-btn po-pri" data-do="confirm">ยืนยันออเดอร์</button><button class="po-btn po-bad" data-do="cancel">ยกเลิก</button>';
        else if (b === 'cooking') btns = (o.status === 'NEW' ? '<button class="po-btn" data-do="cooking">เริ่มทำ</button>' : '') + '<button class="po-btn po-pri" data-do="served">ส่งถึงบ้านแล้ว</button>';
        else if (b === 'bill') btns = '<span class="po-note">รอชำระ — ไปที่ “บิลรวมบ้าน” ด้านล่าง</span>';
        return '<div class="po-card" data-id="' + esc(o.id) + '"><div class="po-head"><span class="po-tag" style="background:' + h.c + '">' + esc(h.short) + '</span><b>' + esc(who) + '</b><small>' + ago(o.createdAt) + '</small></div>' +
            allergy + '<ul class="po-items">' + items + '</ul>' +
            '<div class="po-foot"><span>รวม <b>฿' + money(o.total) + '</b>' + (unpriced(o) ? ' <span class="po-ask">ยังไม่ครบราคา</span>' : '') + (paid(o) ? ' <span class="po-ok">ชำระแล้ว</span>' : '') + '</span></div>' +
            '<div class="po-acts">' + btns + '<button class="po-btn po-ghost" data-do="copy" title="คัดลอกข้อความส่งไลน์ร้าน"><i class="bi bi-clipboard"></i></button></div></div>';
    }
    function billCards() {
        var by = {};
        ((DATA && DATA.orders) || []).forEach(function (o) { if (bucket(o) === 'bill') (by[o.sessionId] = by[o.sessionId] || []).push(o); });
        return Object.keys(by).map(function (sid) {
            var os = by[sid], tot = os.reduce(function (a, o) { return a + Number(o.total || 0); }, 0), h = house(os[0].villa), s = sessionOf(os[0]);
            var ids = os.map(function (o) { return (payOf(o) || {}).id; }).filter(Boolean);
            return '<div class="po-card po-bill" data-ids="' + esc(ids.join(',')) + '"><div class="po-head"><span class="po-tag" style="background:' + h.c + '">' + esc(h.short) + '</span><b>บิลรวม ' + esc(s.guestName || os[0].tableLabel) + '</b><small>' + os.length + ' ออเดอร์</small></div>' +
                '<div class="po-bigtotal">฿' + money(tot) + '</div><div class="po-acts"><button class="po-btn po-pri" data-do="cash">รับเงินสด</button><button class="po-btn" data-do="slip">แนบสลิปโอน</button></div></div>';
        }).join('');
    }
    function render() {
        var $m = $('main.posorders'); if (!$m.length) return;
        var c = counts(), orders = ((DATA && DATA.orders) || []).filter(function (o) { return o.status !== 'CANCELLED'; });
        var list = TAB === 'all' ? orders : orders.filter(function (o) { return bucket(o) === TAB; });
        list.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
        var tabs = [['pending', 'รอยืนยัน'], ['cooking', 'กำลังทำ'], ['bill', 'รอชำระ'], ['all', 'ทั้งหมด']].map(function (t) {
            return '<button data-tab="' + t[0] + '" class="' + (TAB === t[0] ? 'on' : '') + '">' + t[1] + (c[t[0]] ? ' <i>' + c[t[0]] + '</i>' : '') + '</button>';
        }).join('');
        var body = TAB === 'bill' ? (billCards() || '<div class="po-empty">ไม่มีบิลค้างชำระ</div>') : (list.map(orderCard).join('') || '<div class="po-empty">ไม่มีรายการ</div>');
        $m.find('.po-tabs').html(tabs); $m.find('.po-list').html(body);
        $m.find('.po-upd').text(DATA ? 'อัปเดต ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');
        badge();
    }
    function badge() { var n = counts().pending; $('nav.navbar .pl-badge[data-b=".posorders"]').text(n || '').toggle(!!n); }

    /* ---------- โหลด/คำสั่ง ---------- */
    function load(quiet) {
        if (BUSY) return; BUSY = true;
        call('poslive').then(function (r) {
            BUSY = false;
            if (r.status !== 'success') { if (!quiet || !DATA) $('main.posorders .po-list').html('<div class="po-empty po-err">' + esc(r.message || 'ติดต่อ POS ไม่ได้') + '</div>'); return; }
            DATA = r.data; render();
        }).catch(function () { BUSY = false; if (!DATA) $('main.posorders .po-list').html('<div class="po-empty po-err">ติดต่อหลังบ้านไม่ได้</div>'); });
    }
    function act(a, body, ok) {
        return call('posact', { act: a, body: JSON.stringify(body) }).then(function (r) {
            if (r.status !== 'success') { Swal.fire({ icon: 'error', title: 'ไม่สำเร็จ', text: r.message || '' }); return; }
            if (ok) Swal.fire({ icon: 'success', title: ok, timer: 1200, showConfirmButton: false });
            load();
        }).catch(function () { Swal.fire({ icon: 'error', title: 'ติดต่อหลังบ้านไม่ได้' }); });
    }
    function orderById(id) { return ((DATA && DATA.orders) || []).filter(function (o) { return o.id === id; })[0]; }
    function lineText(o) {
        var s = sessionOf(o);
        return 'ออเดอร์ ' + o.villa + (s.guestName ? ' · ' + s.guestName : '') + '\n' + (o.items || []).map(function (i) { return i.qty + '× ' + nm(i.name) + (i.note ? ' (' + i.note + ')' : ''); }).join('\n') +
            ((o.allergyLabels || []).length ? '\n⚠️ แพ้: ' + o.allergyLabels.join(', ') : '') + '\nรวม ฿' + money(o.total);
    }
    function fileToData(file) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); }); }

    function editDialog(o) {
        var rows = (o.items || []).map(function (i, k) {
            return '<div class="po-ed"><div>' + esc(nm(i.name)) + '</div>' +
                '<input type="number" min="0" class="po-q" data-i="' + k + '" value="' + esc(i.qty) + '" title="จำนวน (0 = ลบ)">' +
                (i.priceOnRequest ? '<input type="number" min="0" step="1" class="po-p" data-i="' + k + '" value="' + (i.pricedBy ? esc(i.unitPrice) : '') + '" placeholder="ราคา/หน่วย">' : '<span></span>') + '</div>';
        }).join('');
        Swal.fire({ title: 'แก้ออเดอร์', html: '<div class="po-edwrap">' + rows + '<small>จำนวน 0 = ลบรายการ · ช่องราคา = รายการถามราคา</small></div>', showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ปิด', focusConfirm: false,
            preConfirm: function () {
                var q = [], p = [];
                $('.po-q').each(function () { var k = +$(this).data('i'); q.push({ id: o.items[k].id, qty: +$(this).val() || 0 }); });
                $('.po-p').each(function () { var k = +$(this).data('i'), v = $(this).val(); if (v !== '' && (+v !== o.items[k].unitPrice || !o.items[k].pricedBy)) p.push({ itemId: o.items[k].id, unitPrice: +v }); });
                return { q: q, p: p };
            } }).then(function (r) {
            if (!r.isConfirmed) return;
            var chain = Promise.resolve();
            r.value.p.forEach(function (x) { chain = chain.then(function () { return call('posact', { act: 'reprice', body: JSON.stringify({ orderId: o.id, itemId: x.itemId, unitPrice: x.unitPrice }) }); }); });
            var changedQty = r.value.q.some(function (x, k) { return x.qty !== o.items[k].qty; });
            if (changedQty) chain = chain.then(function () { return call('posact', { act: 'edit', body: JSON.stringify({ orderId: o.id, items: r.value.q.map(function (x) { return { itemId: x.id, qty: x.qty }; }) }) }); });
            chain.then(function (res) { if (res && res.status === 'error') Swal.fire({ icon: 'error', title: 'ไม่สำเร็จ', text: res.message || '' }); load(); });
        });
    }

    function bind() {
        $(document).on('click', 'main.posorders [data-tab]', function () { TAB = $(this).data('tab'); render(); });
        $(document).on('click', 'main.posorders [data-do]', function () {
            var $b = $(this), d = $b.data('do'), $c = $b.closest('.po-card'), id = $c.data('id'), o = orderById(id);
            if (d === 'confirm') {
                if (unpriced(o)) return Swal.fire({ icon: 'warning', title: 'ยังมีรายการถามราคา', text: 'กด “แก้ไข” แล้วใส่ราคาก่อนยืนยัน' });
                Swal.fire({ title: 'ยืนยันออเดอร์?', text: 'ยอดรวม ฿' + money(o.total), icon: 'question', showCancelButton: true, confirmButtonText: 'ยืนยัน', cancelButtonText: 'ปิด' }).then(function (r) { if (r.isConfirmed) act('confirm', { orderId: id }, 'ยืนยันแล้ว'); });
            } else if (d === 'cancel') {
                Swal.fire({ title: 'ยกเลิกออเดอร์นี้?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ยกเลิกออเดอร์', cancelButtonText: 'ไม่', confirmButtonColor: '#dc3545' }).then(function (r) { if (r.isConfirmed) act('cancel', { orderId: id }, 'ยกเลิกแล้ว'); });
            } else if (d === 'edit') editDialog(o);
            else if (d === 'cooking') act('status', { orderId: id, status: 'COOKING' });
            else if (d === 'served') act('status', { orderId: id, status: 'SERVED' }, 'บันทึกแล้ว');
            else if (d === 'copy') {
                var t = lineText(o);
                (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { Swal.fire({ icon: 'success', title: 'คัดลอกแล้ว', timer: 900, showConfirmButton: false }); }, function () { Swal.fire({ title: 'ข้อความส่งร้าน', html: '<pre style="text-align:left;white-space:pre-wrap">' + esc(t) + '</pre>' }); });
            } else if (d === 'cash') {
                var ids = String($c.data('ids')).split(',').filter(Boolean);
                Swal.fire({ title: 'รับเงินสดครบบิล?', icon: 'question', showCancelButton: true, confirmButtonText: 'รับเงินแล้ว', cancelButtonText: 'ปิด' }).then(function (r) { if (r.isConfirmed) act('cash', { paymentIds: ids }, 'บันทึกรับเงินแล้ว'); });
            } else if (d === 'slip') {
                var ids2 = String($c.data('ids')).split(',').filter(Boolean);
                Swal.fire({ title: 'แนบสลิปโอน', input: 'file', inputAttributes: { accept: 'image/*' }, showCancelButton: true, confirmButtonText: 'ส่งสลิป', cancelButtonText: 'ปิด' }).then(function (r) {
                    if (!r.isConfirmed || !r.value) return;
                    fileToData(r.value).then(function (data) { act('slip', { paymentIds: ids2, slip: data }, 'บันทึกสลิปแล้ว'); });
                });
            }
        });
    }

    /* ---------- เมนู/หน้า ---------- */
    function ensure() {
        var $ul = $('nav.navbar .navbar-nav').first();
        if (!$ul.length) return;
        if (!$ul.find('[data-target=".posorders"]').length) {
            var $a = $('<li class="nav-item"><a class="nav-link navigate-button" href="#" data-bs-toggle="collapse" data-bs-target=".navbar-collapse.show" data-target=".posorders"><i class="bi bi-cup-hot pl-ni"></i>ออเดอร์อาหาร<span class="pl-badge" data-b=".posorders"></span></a></li>');
            var $co = $ul.find('[data-target=".checkout"]').closest('li');
            if ($co.length) $co.after($a); else $ul.append($a);
        }
        if (!$('main.posorders').length) {
            $('main.plhome').first().after('<main class="posorders mt-5" style="display:none"><div class="container"><div class="po-top"><h5>ออเดอร์อาหาร</h5><span class="po-upd"></span></div><div class="po-tabs"></div><div class="po-list"><div class="po-empty">กำลังโหลด…</div></div></div></main>');
            if (!$('main.posorders').length) $('body').append('<main class="posorders mt-5" style="display:none"><div class="container"><div class="po-top"><h5>ออเดอร์อาหาร</h5><span class="po-upd"></span></div><div class="po-tabs"></div><div class="po-list"></div></div></main>');
        }
    }
    function onShow() {
        clearInterval(TIMER);
        if (!$('main.posorders').is(':visible')) return;
        load(); TIMER = setInterval(function () { if ($('main.posorders').is(':visible') && !document.hidden) load(true); else if (!$('main.posorders').is(':visible')) clearInterval(TIMER); }, 20000);
    }
    var prev = window.showhidepage;
    window.showhidepage = function (sel) { var r = prev.apply(this, arguments); ensure(); setTimeout(onShow, 0); return r; };
    // เมนูดูตัวเลขรอยืนยันในพื้นหลังทุก 60 วิ (เฉพาะตอนล็อกอินแล้ว)
    setInterval(function () { if (localStorage.getItem('name') && !document.hidden && !$('main.posorders').is(':visible') && $('nav.navbar').is(':visible')) load(true); }, 60000);
    $(function () { ensure(); bind(); new MutationObserver(function () { ensure(); }).observe(document.body, { childList: true, subtree: false }); });

    /* ---------- ข้อมูลจำลอง (?pos_demo=1) ---------- */
    function demo(opt) {
        if (opt === 'posact') return { status: 'success', data: {} };
        var now = Date.now(), t = function (m) { return new Date(now - m * 60000).toISOString(); };
        var it = function (id, n, q, p, extra) { return Object.assign({ id: id, menuId: id, name: { th: n }, qty: q, unitPrice: p, lineTotal: q * p, options: [], note: '', priceOnRequest: false, pricedBy: null }, extra || {}); };
        return { status: 'success', data: {
            openSessions: [{ id: 's1', guestName: 'คุณสมชาย', guestPhone: '0812345678' }, { id: 's2', guestName: 'คุณมินตรา', guestPhone: '0899999999' }, { id: 's3', guestName: 'คุณวิชัย', guestPhone: '0861112222' }],
            payments: { o3: { id: 'p3', status: 'PENDING' }, o4: { id: 'p4', status: 'PENDING' } },
            orders: [
                { id: 'o1', sessionId: 's1', villa: 'Pailay', createdAt: t(4), status: 'PENDING_CONFIRM', total: 780, allergyLabels: ['กุ้ง'], items: [it('a', 'ผัดกะเพราหมูกรอบ', 2, 120), it('b', 'ต้มยำกุ้ง', 1, 340, { note: 'เผ็ดน้อย' })] },
                { id: 'o2', sessionId: 's2', villa: 'Bubble sea', createdAt: t(11), status: 'PENDING_CONFIRM', total: 0, allergyLabels: [], items: [it('c', 'ปลากะพงทอด (ตามน้ำหนัก)', 1, 0, { priceOnRequest: true })] },
                { id: 'o3', sessionId: 's3', villa: 'Sunsea', createdAt: t(25), status: 'NEW', total: 450, allergyLabels: [], items: [it('d', 'ข้าวผัดปู', 3, 150)] },
                { id: 'o4', sessionId: 's3', villa: 'Sunsea', createdAt: t(70), status: 'SERVED', total: 220, allergyLabels: [], items: [it('e', 'ส้มตำไทย', 2, 110)] }
            ] } };
    }
})();
