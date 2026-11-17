/* โครงหน้าใหม่ เฟส 1 (17 พ.ย. 2569) — คู่กับ ocean.css · หลังบ้าน pinlogin.gs (v49)
 * 1) เข้าสู่ระบบด้วย PIN 6 หลัก (opt=loginpin) — ฟอร์มชื่อผู้ใช้/รหัสผ่านเดิมยังอยู่ (ลิงก์ "เข้าด้วยชื่อผู้ใช้")
 * 2) เมนู: เพิ่ม "หน้าแรก" + ไอคอน + ตัวเลขแจ้งเตือนในแถบนำทางเดิม (คอม = เมนูซ้ายด้วย CSS)
 *    มือถือ = แถบล่าง (หน้าแรก · เช็คอิน · + ลงใบจอง · เมนู · ฉัน) — ทุกปุ่มคลิกลิงก์เดิมของแถบนำทาง (.navigate-button)
 * 3) หน้าแรก main.plhome: ตัวเลขสำคัญ + ปุ่มลัด + เข้าพักวันนี้/พรุ่งนี้ + (คอม) บ้านว่าง 7 วัน + ค้างชำระงวดถัดไป
 *    คำนวณจากข้อมูลที่หน้าเว็บโหลดอยู่แล้ว (roomlist/income/dayroom/room) · รอยอดบัตร = opt=cardlist (แคช 5 นาที)
 * ห่อ showhidepage: ใส่ body.pl-in · ไฮไลต์เมนู · เปิดแอป/ล็อกอินเสร็จ → หน้าแรกแทนรายการบ้าน (ครั้งแรกเท่านั้น)
 * ไม่แตะ script.js / id เดิม · ถอด = ลบ <script src="ui.js"> และ <link href="ocean.css">
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
    function api(opt, data) { return fetch(scriptUrl, { method: 'POST', body: new URLSearchParams(Object.assign({ opt: opt }, data || {})), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(function (r) { return r.json(); }); }
    var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var TH_D = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    function thd(s) { var p = s.split('-'); return +p[2] + ' ' + TH_M[+p[1] - 1]; }
    var HOUSES = [
        { re: /pailay/i, s: 'PL', short: 'Pailay', c: '#a4c2f4' }, { re: /view\s*lay/i, s: 'VL', short: 'Viewlay', c: '#b6d7a8' },
        { re: /sea\s*time/i, s: 'ST', short: 'Sea Time', c: '#f6b26b' }, { re: /sun\s*rise|sunsea2/i, s: 'SR', short: 'Sun rise', c: '#f9cb9c' },
        { re: /sun\s*sea/i, s: 'SS', short: 'Sun Sea', c: '#ffd966' }, { re: /bubble/i, s: 'BB', short: 'Bubble', c: '#93c47d' }
    ];
    function house(name) { var n = String(name || ''); for (var i = 0; i < HOUSES.length; i++) if (HOUSES[i].re.test(n)) return HOUSES[i]; return { s: n.slice(0, 2).toUpperCase(), short: n.split(' ')[0] || n, c: '#dfe7ec' }; }

    /* ---------- เมนู ---------- */
    var ICONS = {
        '.plhome': 'bi-grid-1x2', '.listpoolvilla': 'bi-journal-plus', '.quotation': 'bi-file-earmark-text', '.revenuelist': 'bi-cash-coin',
        '.otalist': 'bi-globe2', '.checkin': 'bi-box-arrow-in-right', '.staying': 'bi-moon-stars', '.checkout': 'bi-box-arrow-right',
        '.postponed': 'bi-pause-circle', '.houseoutsidelist': 'bi-signpost-2', '.cardwait': 'bi-credit-card'
    };
    function navLink(target) { return $('nav.navbar .navigate-button[data-target="' + target + '"]').first(); }
    function go(target) { var $a = navLink(target); if ($a.length) $a.trigger('click'); else showhidepage(target + ', nav'); closeSheet(); }
    function decorateNav() {
        var $ul = $('nav.navbar .navbar-nav').first();
        if (!$ul.length) return;
        if (!$ul.find('.pl-homelink').length) {
            $ul.prepend('<li class="nav-item"><a class="nav-link navigate-button pl-homelink" href="#" data-bs-toggle="collapse" data-bs-target=".navbar-collapse.show" data-target=".plhome">หน้าแรก</a></li>');
        }
        $ul.find('.nav-link.navigate-button').each(function () {
            var $a = $(this), t = $a.data('target');
            if (!$a.find('.pl-ni').length && ICONS[t]) $a.prepend('<i class="bi ' + ICONS[t] + ' pl-ni"></i>');
            if ((t === '.revenuelist' || t === '.checkin') && !$a.find('.pl-badge').length) $a.append('<span class="pl-badge" data-b="' + t + '"></span>');
        });
        var $rev = navLink('.revenuelist').closest('li');
        if ($rev.length && !$ul.find('.pl-group').length) $rev.before('<li class="pl-group">ติดตามงาน</li>');
    }
    function markActive(sel) {
        var m = String(sel).match(/\.([\w-]+)/), t = m ? '.' + m[1] : '';
        $('nav.navbar .nav-link').removeClass('pl-on');
        if (t) navLink(t).addClass('pl-on');
        $('.pl-tabbar button').removeClass('pl-on');
        $('.pl-tabbar button[data-go="' + t + '"]').addClass('pl-on');
    }
    var TABBAR = '<div class="pl-tabbar">' +
        '<button data-go=".plhome"><i class="bi bi-house-door"></i>หน้าแรก</button>' +
        '<button data-go=".checkin"><i class="bi bi-calendar-check"></i>เช็คอิน</button>' +
        '<button class="pl-fab" data-go=".listpoolvilla" aria-label="ลงบันทึกการจอง"><i class="bi bi-plus-lg"></i></button>' +
        '<button data-sheet="menu"><i class="bi bi-grid"></i>เมนู</button>' +
        '<button data-sheet="me"><i class="bi bi-person"></i>ฉัน</button></div>' +
        '<div class="pl-sheet"><div class="pl-sheet-bd"></div><div class="pl-sheet-p"></div></div>';
    function openSheet(kind) {
        var $p = $('.pl-sheet-p'), h = '<div class="pl-grab"></div>';
        if (kind === 'menu') {
            h += '<div class="fw-semibold mb-2">เมนูทั้งหมด</div><div class="pl-mgrid">';
            $('nav.navbar .navbar-nav .nav-link.navigate-button').each(function () {
                var $a = $(this), t = $a.data('target'), txt = $a.clone().children().remove().end().text().trim();
                var b = $a.find('.pl-badge').text();
                h += '<button data-go="' + esc(t) + '"><i class="bi ' + (ICONS[t] || 'bi-dot') + '"></i>' + esc(txt) + (b ? '<span class="pl-badge">' + esc(b) + '</span>' : '') + '</button>';
            });
            h += '<button data-act="group"><i class="bi bi-houses"></i>จองหลายหลัง</button></div>';
        } else {
            var name = localStorage.getItem('name') || '-', rank = localStorage.getItem('values') || '', pic = localStorage.getItem('profile') || '';
            h += '<div class="pl-me">' + (pic ? '<img src="' + esc(pic) + '" alt="">' : '<div class="pl-av">' + esc(name.charAt(0)) + '</div>') + '<div><b>' + esc(name) + '</b><div class="small text-muted">' + esc(rank) + '</div></div></div>' +
                '<button class="pl-row" data-act="dark"><i class="bi bi-moon"></i>โหมดมืด / สว่าง</button>' +
                '<button class="pl-row pl-danger" data-act="logout"><i class="bi bi-box-arrow-left"></i>ออกจากระบบ</button>';
        }
        $p.html(h); $('.pl-sheet').addClass('show');
    }
    function closeSheet() { $('.pl-sheet').removeClass('show'); }

    /* ---------- หน้าแรก ---------- */
    var HOME = '<main class="plhome mt-5" style="display:none"><div class="container"><div class="plh-top"><div class="plh-hello"><small class="plh-greet"></small><b class="plh-name"></b></div></div><div class="plh-body"></div></div></main>';
    var cardCache = { t: 0, n: null, sum: 0, busy: false };
    function loadCards() {
        if (cardCache.busy || Date.now() - cardCache.t < 300000) return;
        cardCache.busy = true;
        api('cardlist').then(function (r) {
            var d = (r && r.data) || [];
            cardCache = { t: Date.now(), n: d.length, sum: d.reduce(function (a, x) { return a + num(x.total); }, 0), busy: false };
            if ($('.plhome').is(':visible')) renderHome();
        }).catch(function () { cardCache.busy = false; });
    }
    function pendingDeposits(bookings) {
        var live = {}; bookings.forEach(function (b) { live[String(b[0]).trim()] = b; });
        var by = {};
        arr('income').filter(function (r) { return r[8] === 'แบ่งมัดจำ' && live[String(r[1]).trim()]; }).forEach(function (r) { (by[r[1]] = by[r[1]] || []).push(r); });
        var out = [];
        Object.keys(by).forEach(function (uid) {
            var rows = by[uid], r1 = rows.filter(function (r) { return String(r[7]) === 'มัดจำงวดที่ 1'; })[0] || rows[0];
            var p = [num(r1[9]), num(r1[10]), num(r1[14]), num(r1[15])], n = 2 + (p[2] > 0 ? 1 : 0) + (p[3] > 0 ? 1 : 0);
            if (rows.length < n) out.push({ b: live[String(uid).trim()], next: rows.length + 1, due: p[rows.length] || 0 });
        });
        return out;
    }
    function compute() {
        var all = arr('roomlist').filter(function (b) { return b && b[0]; });
        var today = ymdOf(new Date()), tmr = addDays(today, 1);
        var ci = function (b) { return String(b[32] || '').trim() === 'checkin'; }, co = function (b) { return String(b[33] || '').trim() === 'checkout'; };
        var inToday = all.filter(function (b) { return ymd(b[8]) === today && !ci(b); });
        var inTmr = all.filter(function (b) { return ymd(b[8]) === tmr && !ci(b); });
        var lateIn = all.filter(function (b) { var d = ymd(b[8]); return d && d < today && !ci(b) && !co(b) && ymd(b[9]) >= today; });
        var soon = all.filter(function (b) { var d = ymd(b[8]); return d > tmr && d <= addDays(today, 7) && !ci(b); }).sort(function (a, b) { return ymd(a[8]) < ymd(b[8]) ? -1 : 1; });
        var outToday = all.filter(function (b) { return ymd(b[9]) === today && ci(b) && !co(b); });
        var staying = all.filter(function (b) { return ci(b) && !co(b); });
        var lateOut = staying.filter(function (b) { var d = ymd(b[9]); return d && d < today; });
        var pend = pendingDeposits(all);
        return { all: all, today: today, tmr: tmr, inToday: inToday, inTmr: inTmr, soon: soon, lateIn: lateIn, outToday: outToday, staying: staying, lateOut: lateOut, pend: pend };
    }
    function itemHtml(b, tag) {
        var h = house(b[1]);
        return '<div class="plh-it" data-go=".checkin"><div class="plh-dot" style="background:' + h.c + '">' + h.s + '</div><div class="m"><b>' + esc(b[2]) + ' · ' + esc(b[12] || '-') + ' ท่าน</b><span>' + esc(h.short) + ' · ' + esc(hm(b[8]) || '14:00') + ' น. · ค้างจ่าย ฿' + money(num(b[26])) + '</span></div>' + tag + '</div>';
    }
    function renderHome() {
        var $h = $('.plhome');
        if (!$h.length) return;
        var hr = new Date().getHours();
        $h.find('.plh-greet').text(hr < 12 ? 'สวัสดีตอนเช้า' : hr < 17 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น');
        $h.find('.plh-name').text((localStorage.getItem('name') || '') + ' 👋');
        var c = compute();
        var pendSum = c.pend.reduce(function (a, x) { return a + x.due; }, 0);
        var names = c.inToday.map(function (b) { return house(b[1]).short; }).join(' · ');
        var h = '<div class="plh-stats">' +
            '<div class="plh-card plh-stat hero" data-go=".checkin"><div class="l">เช็คอินวันนี้</div><div class="n">' + c.inToday.length + ' หลัง</div><div class="l">' + esc(names || 'ไม่มีเข้าพักวันนี้') + '</div></div>' +
            '<div class="plh-card plh-stat" data-go=".checkout"><div class="l">เช็คเอาต์วันนี้</div><div class="n">' + c.outToday.length + '</div><div class="l">' + (c.lateOut.length ? '<span style="color:var(--pl-bad)">⚠️ ค้าง Check Out ' + c.lateOut.length + '</span>' : 'ระหว่างพัก ' + c.staying.length + ' หลัง') + '</div></div>' +
            '<div class="plh-card plh-stat" data-go=".revenuelist"><div class="l">ค้างชำระมัดจำ</div><div class="n">' + c.pend.length + '</div><div class="l" style="color:' + (c.pend.length ? 'var(--pl-bad)' : 'var(--pl-muted)') + '">฿' + money(pendSum) + '</div></div>' +
            '<div class="plh-card plh-stat" data-go=".cardwait"><div class="l">รอยอดบัตรเครดิต</div><div class="n">' + (cardCache.n == null ? '–' : cardCache.n) + '</div><div class="l">' + (cardCache.n ? '฿' + money(cardCache.sum) : 'ไม่มีรายการ') + '</div></div></div>';
        h += '<div class="plh-card plh-qa">' +
            '<button data-go=".listpoolvilla"><span><i class="bi bi-journal-plus"></i></span>ลงใบจอง</button>' +
            '<button data-act="group"><span><i class="bi bi-houses"></i></span>หลายหลัง</button>' +
            '<button data-go=".quotation"><span><i class="bi bi-file-earmark-text"></i></span>ใบเสนอราคา</button>' +
            '<button data-go=".revenuelist"><span><i class="bi bi-cash-coin"></i></span>ค้างชำระ</button>' +
            '<button data-go=".checkin"><span><i class="bi bi-box-arrow-in-right"></i></span>Check In</button>' +
            '<button data-go=".staying"><span><i class="bi bi-moon-stars"></i></span>ระหว่างพัก</button>' +
            '<button data-go=".checkout"><span><i class="bi bi-box-arrow-right"></i></span>Check Out</button>' +
            '<button data-sheet="menu"><span><i class="bi bi-grid"></i></span>เพิ่มเติม</button></div>';
        var list = c.lateIn.map(function (b) { return itemHtml(b, '<span class="plh-tag t">เลยวันเข้า</span>'); })
            .concat(c.inToday.map(function (b) { return itemHtml(b, '<span class="plh-tag w">วันนี้</span>'); }))
            .concat(c.inTmr.map(function (b) { return itemHtml(b, '<span class="plh-tag ok">พรุ่งนี้</span>'); }))
            .concat(c.soon.slice(0, 6).map(function (b) { var d = ymd(b[8]), dd = new Date(d + 'T00:00:00'); return itemHtml(b, '<span class="plh-tag" style="background:var(--pl-ice);color:var(--pl-blue)">' + TH_D[dd.getDay()] + ' ' + dd.getDate() + '</span>'); }));
        var left = '<div class="plh-sec"><b>รอเช็คอิน 7 วันข้างหน้า</b><a data-go=".checkin">ดูทั้งหมด</a></div><div class="plh-card mb-3">' + (list.length ? list.join('') : '<div class="plh-empty">ไม่มีลูกค้าเข้าพักใน 7 วันข้างหน้า</div>') + '</div>';
        // ปฏิทินบ้านว่าง 7 วัน (คอม)
        var dr = arr('dayroom'), rooms = arr('room').map(function (r) { return r[0]; }).filter(Boolean);
        var occ = '<div class="plh-card plh-occ"><div></div>';
        for (var k = 0; k < 7; k++) { var d = addDays(c.today, k), dd = new Date(d + 'T00:00:00'); occ += '<div class="h' + (k === 0 ? ' td' : '') + '">' + TH_D[dd.getDay()] + ' ' + dd.getDate() + '</div>'; }
        rooms.forEach(function (name) {
            var hh = house(name);
            occ += '<div title="' + esc(name) + '">' + esc(hh.short) + '</div>';
            for (var k2 = 0; k2 < 7; k2++) {
                var day = addDays(c.today, k2);
                var busy = dr.some(function (r) { return r[0] === name && ymd(r[1]) <= day && ymd(r[2]) > day; });
                occ += '<div class="c"' + (busy ? ' style="background:' + hh.c + ';border-color:' + hh.c + '"' : '') + '></div>';
            }
        });
        occ += '</div>';
        left += '<div class="plh-desk"><div class="plh-sec"><b>บ้านไม่ว่าง 7 วันข้างหน้า</b></div>' + occ + '</div>';
        var pend = c.pend.slice(0, 6).map(function (x) {
            var hh = house(x.b[1]);
            return '<div class="plh-it" data-go=".revenuelist"><div class="plh-dot" style="background:' + hh.c + '">' + hh.s + '</div><div class="m"><b>' + esc(x.b[2]) + '</b><span>' + esc(hh.short) + ' · งวดที่ ' + x.next + ' · เข้าพัก ' + thd(ymd(x.b[8])) + '</span></div><b style="font-size:13px">฿' + money(x.due) + '</b></div>';
        });
        var urgent = [];
        if (c.lateOut.length) urgent.push('<div class="plh-it" data-go=".staying"><i class="bi bi-exclamation-triangle" style="color:var(--pl-warn);font-size:18px"></i><div class="m"><b>ค้าง Check Out ' + c.lateOut.length + ' ใบ</b><span>เลยวันออกแล้ว ยังไม่กด Check Out</span></div></div>');
        if (c.lateIn.length) urgent.push('<div class="plh-it" data-go=".checkin"><i class="bi bi-exclamation-circle" style="color:var(--pl-bad);font-size:18px"></i><div class="m"><b>เลยวันเข้าพัก ' + c.lateIn.length + ' ใบ</b><span>ยังไม่กด Check In</span></div></div>');
        if (cardCache.n) urgent.push('<div class="plh-it" data-go=".cardwait"><i class="bi bi-credit-card" style="color:var(--pl-blue);font-size:18px"></i><div class="m"><b>รอยอดบัตร ' + cardCache.n + ' รายการ</b><span>กด "ยอดเข้าแล้ว" เมื่อเงินเข้าบัญชีบริษัท</span></div></div>');
        var right = '<div class="plh-sec"><b>ค้างชำระมัดจำงวดถัดไป</b><a data-go=".revenuelist">ดูทั้งหมด</a></div><div class="plh-card mb-3">' + (pend.length ? pend.join('') : '<div class="plh-empty">ไม่มีค้างชำระ ✓</div>') + '</div>' +
            (urgent.length ? '<div class="plh-sec"><b>งานด่วน</b></div><div class="plh-card mb-3">' + urgent.join('') + '</div>' : '');
        $h.find('.plh-body').html(h + '<div class="plh-grid"><div>' + left + '</div><div>' + right + '</div></div>');
        updateBadges(c);
        loadCards();
    }
    function updateBadges(c) {
        c = c || compute();
        $('.pl-badge[data-b=".revenuelist"]').text(c.pend.length || '');
        $('.pl-badge[data-b=".checkin"]').text((c.inToday.length + c.lateIn.length) || '');
    }

    /* ---------- PIN ---------- */
    var PIN = '<div class="pl-pin"><img src="https://lh3.googleusercontent.com/d/1WjkDUC35PL6kGfALWyzK7uXdvrSeWfLf" alt="Pailay"><h5>Pailay พูลวิลล่า</h5><div class="pl-sub">ใส่รหัส PIN 6 หลักเพื่อเข้าใช้งาน</div>' +
        '<div class="pl-dots"><span></span><span></span><span></span><span></span><span></span><span></span></div><div class="pl-msg"></div>' +
        '<div class="pl-keys">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return '<button type="button" data-k="' + n + '">' + n + '</button>'; }).join('') +
        '<button type="button" class="pl-x" disabled></button><button type="button" data-k="0">0</button><button type="button" class="pl-x" data-k="del" aria-label="ลบ"><i class="bi bi-backspace"></i></button></div>' +
        '<button type="button" class="pl-alt" data-alt="1">เข้าด้วยชื่อผู้ใช้ / รหัสผ่าน</button></div>';
    var pin = '', busy = false, landing = false;
    function devId() { var k = 'pl_dev', v = ''; try { v = localStorage.getItem(k); if (!v) { v = Math.random().toString(36).slice(2, 12); localStorage.setItem(k, v); } } catch (e) { } return v || 'x'; }
    function drawPin(err) {
        var $d = $('.pl-dots').toggleClass('err', !!err);
        $d.find('span').each(function (i) { $(this).toggleClass('f', i < pin.length); });
    }
    function pressKey(k) {
        if (busy) return;
        if (k === 'del') pin = pin.slice(0, -1); else if (/^\d$/.test(k) && pin.length < 6) pin += k;
        $('.pl-msg').text(''); drawPin(false);
        if (pin.length === 6) submitPin();
    }
    function submitPin() {
        busy = true; $('.pl-pin').addClass('pl-busy'); $('.pl-msg').css('color', '#5b7683').text('กำลังตรวจสอบ…');
        var dev = devId();
        api('loginpin', { pin: pin, dev: dev }).then(function (res) {
            busy = false; $('.pl-pin').removeClass('pl-busy');
            if (res && res.status === 'success') {
                localStorage.setItem('profile', res.profile || ''); localStorage.setItem('name', res.name); localStorage.setItem('values', res.values);
                try { localStorage.setItem('pl_dev', dev); } catch (e) { }
                pin = ''; drawPin(false); $('.pl-msg').text('');
                landing = true;
                showhidepage('.listpoolvilla,nav');
                if (typeof getdata === 'function') getdata();
            } else {
                pin = ''; drawPin(true); $('.pl-msg').css('color', '#e5484d').text((res && res.message) || 'เข้าสู่ระบบไม่สำเร็จ');
            }
        }).catch(function () { busy = false; $('.pl-pin').removeClass('pl-busy'); pin = ''; drawPin(true); $('.pl-msg').css('color', '#e5484d').text('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่'); });
    }

    /* ---------- ห่อ showhidepage ---------- */
    function wrapShow() {
        var orig = window.showhidepage;
        if (typeof orig !== 'function' || orig.__pl) return;
        var w = function (sel) {
            var s = String(sel || '');
            if (/(^|[\s,])\.login\b/.test(s)) landing = true;
            if (landing && /listpoolvilla/.test(s) && /(^|,)\s*nav\s*(,|$)/.test(s)) { landing = false; s = '.plhome, nav'; }
            var r = orig.call(this, s);
            document.body.classList.toggle('pl-in', /(^|,)\s*nav\s*(,|$)/.test(s));
            markActive(s);
            if (/\.plhome\b/.test(s)) renderHome();
            if (/\.login\b/.test(s)) { pin = ''; drawPin(false); $('.login').addClass('pl-pinmode'); }
            return r;
        };
        w.__pl = true;
        window.showhidepage = w;
    }

    $(document).ready(function () {
        $('body').append(TABBAR);
        $(HOME).insertAfter('main.listpoolvilla');
        var $login = $('main.login');
        $login.addClass('pl-pinmode').find('.bgss').append(PIN);
        wrapShow();
        decorateNav();
        setTimeout(decorateNav, 800); // ลิงก์ที่สคริปต์อื่นเพิ่ม (รอยอดบัตร)
        // เปิดแอปแล้วล็อกอินอยู่: script.js แสดงรายการบ้านไปแล้ว → ไปหน้าแรก
        setTimeout(function () {
            if (localStorage.getItem('values') && $('main.listpoolvilla').is(':visible') && !/[?&]page=/.test(location.search)) showhidepage('.plhome, nav');
            else document.body.classList.toggle('pl-in', $('nav.navbar').is(':visible'));
        }, 0);
        // หน้าแรกอัปเดตเมื่อข้อมูลโหลดเสร็จ
        var sig = '';
        setInterval(function () {
            decorateNav(); // สคริปต์อื่นเขียนข้อความลิงก์ใหม่ (ตัวเลข) → ใส่ไอคอนคืน
            var s = arr('roomlist').length + '|' + arr('income').length + '|' + arr('dayroom').length;
            if (s === sig) return; sig = s;
            if ($('.plhome').is(':visible')) renderHome(); else updateBadges();
        }, 2000);
        $(document).on('click', '[data-go]', function (e) {
            if (!$(this).closest('.pl-tabbar, .pl-sheet, .plhome').length) return;
            e.preventDefault(); go($(this).data('go'));
        });
        $(document).on('click', '.pl-tabbar [data-sheet], .plhome [data-sheet]', function () { openSheet($(this).data('sheet')); });
        $(document).on('click', '.pl-sheet-bd', closeSheet);
        $(document).on('click', '[data-act]', function () {
            var a = $(this).data('act');
            closeSheet();
            if (a === 'group' && window.pailayGroup) window.pailayGroup.open();
            if (a === 'dark') $('#darkModeIcon').trigger('click');
            if (a === 'logout') $('nav.navbar .logout').trigger('click');
        });
        $login.on('click', '.pl-keys [data-k]', function () { pressKey(String($(this).data('k'))); });
        $login.on('click', '.pl-alt', function () { $login.removeClass('pl-pinmode'); if (!$login.find('.pl-back').length) $login.find('form.login-form').append('<button type="button" class="btn btn-link w-100 pl-back">← กลับไปใช้ PIN</button>'); });
        $login.on('click', '.pl-back', function () { $login.addClass('pl-pinmode'); });
        $(document).on('keydown', function (e) {
            if (!$login.is(':visible') || !$login.hasClass('pl-pinmode')) return;
            if (/^\d$/.test(e.key)) pressKey(e.key); else if (e.key === 'Backspace') pressKey('del');
        });
    });
    window.pailayUI = { renderHome: renderHome, compute: compute, go: go };
})();
