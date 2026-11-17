/* ฟอร์มลงใบจองแบบแบ่งขั้น เฟส 3 (17 พ.ย. 2569) — คู่กับ ocean.css (ส่วน "ฟอร์มแบ่งขั้น")
 * #formpoolvilla (บ้านในเครือ ใบใหม่ + แก้ไข) แบ่ง 4 ขั้นจาก legend ของ fieldset เดิม (ไม่ย้าย/ไม่ลบช่อง ไม่แตะ id):
 *   1 ลูกค้า: ข้อมูลผู้เข้าพัก · ใบจองในนามบริษัท · เปลี่ยนบ้านพัก · ปุ่มวางข้อความ
 *   2 วันที่และห้อง: วันที่เข้าพัก · ราคาต่อคืน · รายละเอียดการเข้าพัก
 *   3 ราคาและบริการ: รายละเอียดราคา · ของแถม · ค่าประกันบ้านพัก · สรุปค่าที่พัก
 *   4 ชำระเงิน: ลงตารางนายหน้า · ค่าคอม · ช่องทางการชำระเงิน · ปุ่มบันทึก/ยกเลิกใบจองเดิม
 * แถบล่างติดจอ: ยอดรวม/ค้างจ่าย + ย้อนกลับ/ถัดไป · ขั้น 4 = "บันทึกการจอง" (คลิกปุ่ม .savepool เดิม → ตัวตรวจเดิมทุกตัวทำงาน)
 * ตรวจไม่ผ่าน (ช่องที่ถูกติด .is-invalid อยู่ขั้นอื่น) → พาไปขั้นนั้นอัตโนมัติ
 * fieldset ที่ไม่รู้จัก (เพิ่มในอนาคต) = แสดงทุกขั้น (ไม่หาย) · ถอด = ลบ <script src="steps.js">
 */
(function () {
    'use strict';
    var STEPS = [
        { t: 'ลูกค้า', re: /ข้อมูลผู้เข้าพัก|ในนามบริษัท|เปลี่ยนบ้านพัก/ },
        { t: 'วันที่และห้อง', re: /วันที่เข้าพัก|ราคาต่อคืน|รายละเอียดการเข้าพัก/ },
        { t: 'ราคาและบริการ', re: /รายละเอียดราคา|ของแถม|ค่าประกันบ้านพัก|สรุปค่าที่พัก/ },
        { t: 'ชำระเงิน', re: /ลงตารางนายหน้า|ค่าคอม|ช่องทางการชำระเงิน/ }
    ];
    var cur = 1;
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
    function money(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
    function outer() { return document.querySelector('#formpoolvilla fieldset'); }
    function inner() { var o = outer(); return o ? Array.prototype.find.call(o.children, function (e) { return e.tagName === 'DIV' && e.classList.contains('row'); }) : null; }
    function stepOfEl(el) {
        if (!el) return 0;
        if (el.classList.contains('paste-bar')) return 1;
        if (el.querySelector && el.querySelector('.savepool, .cancel-booking')) return 4;
        var lg = el.querySelector && el.querySelector(':scope > legend');
        var txt = lg ? lg.textContent : '';
        for (var i = 0; i < STEPS.length; i++) if (txt && STEPS[i].re.test(txt)) return i + 1;
        return 0;
    }
    function blocks() {
        var o = outer(), r = inner(), out = [];
        if (!o || !r) return out;
        Array.prototype.forEach.call(o.children, function (e) { if (e !== r && (e.tagName === 'FIELDSET' || e.classList.contains('paste-bar'))) out.push(e); });
        Array.prototype.forEach.call(r.children, function (e) { out.push(e); });
        return out;
    }
    function apply() {
        blocks().forEach(function (e) {
            var s = stepOfEl(e);
            e.classList.toggle('pls-off', s !== 0 && s !== cur);
            if (s) e.setAttribute('data-pls', s);
        });
        var $bar = $('.pls-steps');
        $bar.find('.pls-st').each(function (i) { $(this).toggleClass('on', i + 1 === cur).toggleClass('done', i + 1 < cur); });
        $('.pls-prev').css('visibility', cur > 1 ? 'visible' : 'hidden');
        $('.pls-next').html(cur < 4 ? 'ถัดไป <i class="bi bi-arrow-right"></i>' : '<i class="bi bi-check2-circle"></i> ' + (isEdit() ? 'บันทึกการแก้ไข' : 'บันทึกการจอง'));
        $('.pls-hint').text('ขั้นที่ ' + cur + ' จาก 4 · ' + STEPS[cur - 1].t);
        updateSum();
    }
    function isEdit() { return !!String($('#formpoolvilla #houseedit').text() || '').trim(); }
    function go(n, scroll) {
        cur = Math.max(1, Math.min(4, n));
        apply();
        if (scroll !== false) { var t = document.querySelector('#formpoolvilla .pls-steps'); if (t) window.scrollTo(0, Math.max(0, t.getBoundingClientRect().top + window.scrollY - 70)); }
    }
    function updateSum() {
        var tot = num($('#totalall').val()), due = num($('#overdue').val()), pay = num($('#paytotal').val());
        $('.pls-sum-main').text('฿' + money(tot));
        $('.pls-sum-sub').text(tot ? (pay ? 'มัดจำ ฿' + money(pay) + ' · ' : '') + 'ค้างจ่าย ฿' + money(due) : 'ราคารวมทั้งหมด');
    }
    // ตรวจขั้นก่อนไปต่อ (เบา ๆ เฉพาะช่องหลัก — ตัวตรวจจริงยังเป็นของเดิมตอนบันทึก)
    function checkStep(n) {
        var miss = [];
        var need = function (sel, label) { var $e = $(sel).first(); if (!$e.length) return; if (!String($e.val() || '').trim()) { miss.push(label); $e.addClass('is-invalid'); } };
        if (n === 1) { need('#name', 'ชื่อผู้จอง'); need('#tel', 'เบอร์ติดต่อ'); need('#bookinguser', 'ช่องทางการจอง'); }
        if (n === 2) {
            need('#timestart', 'วันที่เข้า'); need('#timeend', 'วันที่ออก'); need('#quser', 'จำนวนผู้เข้าพัก');
            var empty = $('#formpoolvilla .night-input').filter(function () { return !String(this.value || '').trim(); });
            if (empty.length) { miss.push('ราคาทุกคืน'); empty.addClass('is-invalid'); }
        }
        return miss;
    }
    function next() {
        if (cur === 4) { var b = document.querySelector('#formpoolvilla .savepool'); if (b) b.click(); return; }
        var miss = checkStep(cur);
        if (miss.length) return Swal.fire({ icon: 'warning', title: 'กรุณากรอกให้ครบ', text: miss.join(' · '), confirmButtonText: 'ตกลง' });
        go(cur + 1);
    }
    // หลังกดบันทึก: ช่องที่ตรวจไม่ผ่านอยู่ขั้นอื่น → พาไป
    function jumpToInvalid() {
        var bad = document.querySelector('#formpoolvilla .is-invalid, #formpoolvilla .btn-outline-danger[for]');
        if (!bad) return;
        var el = bad;
        while (el && el.parentElement && !el.hasAttribute('data-pls')) el = el.parentElement;
        var s = el && Number(el.getAttribute('data-pls'));
        if (s && s !== cur) go(s);
    }

    var UI = '<div class="pls-steps">' + STEPS.map(function (s, i) { return '<button type="button" class="pls-st" data-s="' + (i + 1) + '"><span class="pls-n">' + (i + 1) + '</span><span class="pls-t">' + s.t + '</span></button>'; }).join('') + '</div><div class="pls-hint small"></div>';
    var BAR = '<div class="pls-bar"><div class="pls-sum"><small class="pls-sum-sub"></small><b class="pls-sum-main"></b></div>' +
        '<button type="button" class="btn pls-prev"><i class="bi bi-arrow-left"></i></button><button type="button" class="btn pls-next"></button></div>';

    function wrapShow() {
        var orig = window.showhidepage;
        if (typeof orig !== 'function' || orig.__pls) return;
        var w = function (sel) {
            var r = orig.apply(this, arguments);
            if (/\.formpoolvilla\b/.test(String(sel || ''))) setTimeout(function () { go(1, false); }, 0);
            return r;
        };
        w.__pls = true; w.__pl = orig.__pl;
        window.showhidepage = w;
    }

    $(document).ready(function () {
        var o = outer();
        if (!o) return;
        var lg = o.querySelector(':scope > legend');
        $(UI).insertAfter(lg || o.firstChild);
        $('main.formpoolvilla').append(BAR).addClass('pls-on');
        wrapShow();
        go(1, false);
        // สคริปต์อื่นเพิ่ม fieldset ทีหลัง (ค่าคอม/บริษัท/เปลี่ยนบ้าน) → จัดขั้นใหม่
        var r = inner();
        if (r) new MutationObserver(function () { clearTimeout(o.__plsT); o.__plsT = setTimeout(apply, 50); }).observe(r, { childList: true });
        new MutationObserver(function () { clearTimeout(o.__plsT); o.__plsT = setTimeout(apply, 50); }).observe(o, { childList: true });
        $(document).on('click', '.pls-st', function () { go(Number($(this).data('s'))); });
        $(document).on('click', '.pls-prev', function () { go(cur - 1); });
        $(document).on('click', '.pls-next', next);
        document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#formpoolvilla .savepool')) setTimeout(jumpToInvalid, 350); }, true);
        $(document).on('input change', '#formpoolvilla input, #formpoolvilla select', function () { $(this).removeClass('is-invalid'); });
        setInterval(function () { if ($('main.formpoolvilla').is(':visible')) updateSum(); }, 600);
    });
    window.pailaySteps = { go: go, current: function () { return cur; } };
})();
