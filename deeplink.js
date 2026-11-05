/* ลิงก์ตรงไปหน้าในเว็บจอง (5 พ.ย. 2569) — ใช้กับปุ่มของศูนย์งาน (pailay-hub.vercel.app)
 *
 *   https://pailay.vercel.app/?page=checkin  → เปิดหน้า Check In เลย
 *   page = checkin · checkout · staying · revenue (รายการค้างชำระ) · ota · postponed · outside
 *
 * - ล็อกอินอยู่แล้ว: script.js เปิดหน้าแรก + getdata() ไปแล้ว → สลับไปหน้าที่ขอ (showhidepage เหมือนกดเมนู ไม่โหลดข้อมูลซ้ำ)
 * - ยังไม่ล็อกอิน: จำหน้าไว้ใน sessionStorage → ล็อกอินสำเร็จ (script.js เรียก getdata) แล้วค่อยสลับไป
 * - ลบ ?page ออกจากแถบที่อยู่ทันที (รีเฟรชแล้วไม่เด้งกลับหน้าเดิม) · ค่าไม่อยู่ในรายการ = ไม่ทำอะไร เว็บทำงานเหมือนเดิม
 */
(function () {
    var PAGES = {
        checkin: '.checkin', checkout: '.checkout', staying: '.staying', revenue: '.revenuelist',
        ota: '.otalist', postponed: '.postponed', outside: '.houseoutsidelist'
    };
    var KEY = 'pailay_deeplink';

    function store(v) { try { v ? sessionStorage.setItem(KEY, v) : sessionStorage.removeItem(KEY); } catch (e) {} }
    function stored() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
    function loggedIn() { try { return !!localStorage.getItem('values'); } catch (e) { return false; } }
    function go(page) {
        if (!PAGES[page] || typeof showhidepage !== 'function') return;
        showhidepage(PAGES[page] + ',nav');
        window.scrollTo(0, 0);
    }

    $(document).ready(function () {
        var page = null;
        try { page = new URLSearchParams(location.search).get('page'); } catch (e) {}
        if (page) {
            try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
            if (!PAGES[page]) return;
            if (loggedIn()) go(page);
            else store(page);
        }
        // ล็อกอินสำเร็จ → script.js เรียก getdata() → ไปหน้าที่จำไว้ (ครั้งเดียว)
        var orig = window.getdata;
        if (typeof orig !== 'function') return;
        window.getdata = function () {
            var r = orig.apply(this, arguments);
            var p = stored();
            if (p && loggedIn()) { store(null); go(p); }
            return r;
        };
    });
})();
