/* หน้าแรก "ลงบันทึกการจอง": การ์ดบ้านในเครือ + การ์ด "บ้านพักนอกเครือ" ต่อท้าย (แทนเมนูลงทะเบียนบ้านพักนอกเครือเดิม)
 *
 * - crehouse() ใน script.js ล้าง .cardContainer แล้ววาดการ์ดใหม่ทุกครั้งที่ข้อมูลอัปเดต → ดูด้วย MutationObserver แล้วเติมการ์ดกลับ
 * - การ์ดใช้ class navigate-button + data-target=".houseoutside" → handler เดิมใน script.js เตรียมฟอร์มนอกเครือให้เหมือนกดเมนูเดิม
 *   (ห้ามใช้ class card-row — crehouse() ผูกคลิกนั้นไว้กับบ้านในเครือ)
 * - หน้าฟอร์มนอกเครือใช้ร่วมกับ "ออกใบเสนอราคา" → ปุ่มกลับหน้าหลักแสดงเฉพาะตอนเข้าจากการ์ด
 */
(function () {
    var OUTSIDE_CARD =
        '<div class="col-12 col-md-4 outside-card-col">' +
        '  <div class="card mb-1 shadow position-relative">' +
        '    <div class="card-body text-center navigate-button outside-card" data-target=".houseoutside" role="button">' +
        '      <div class="outside-card-icon rounded mb-0"><i class="bi bi-house-add"></i></div>' +
        '      <h5 class="card-title fw-bold">บ้านพักนอกเครือ</h5>' +
        '    </div>' +
        '  </div>' +
        '</div>';

    var BACK_BUTTON =
        '<button class="btn btn-outline-danger w-100 navigate-button outside-backhome" data-target=".listpoolvilla">กลับหน้าหลัก</button>';

    function ensureOutsideCard(container) {
        // รอให้ crehouse() วาดบ้านในเครือก่อน การ์ดนอกเครือจะได้อยู่ท้ายสุด
        if (!container.querySelector('.card-row')) return;
        var last = container.lastElementChild;
        if (last && last.classList.contains('outside-card-col')) return;
        $(container).find('.outside-card-col').remove();
        $(container).append(OUTSIDE_CARD);
    }

    $(document).ready(function () {
        var container = document.querySelector('.listpoolvilla .cardContainer');
        if (container) {
            ensureOutsideCard(container);
            new MutationObserver(function () { ensureOutsideCard(container); })
                .observe(container, { childList: true });
        }

        var $row = $('#houseoutside > .container > .row');
        $row.prepend(BACK_BUTTON);
        var $back = $row.children('.outside-backhome').hide();

        // capture phase: ตั้งค่าก่อน handler ของ script.js (ซึ่งผูกที่ document แบบ bubble)
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.navigate-button');
            if (!btn) return;
            var target = btn.getAttribute('data-target');
            if (target === '.houseoutside') $back.toggle(btn.classList.contains('outside-card'));
            else if (target === '.quotation') $back.hide();
            // การ์ดอยู่ท้ายหน้าแรก → เปิดฟอร์มแล้วเลื่อนขึ้นบนสุด ไม่ค้างกลางฟอร์ม
            if (btn.classList.contains('outside-card')) setTimeout(function () { window.scrollTo(0, 0); }, 0);
        }, true);
    });
})();
