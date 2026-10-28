/* ปุ่ม "ยกเลิกใบจองนี้" ในหน้าแก้ไขใบจองบ้านในเครือ (#formpoolvilla)
 *
 * - แสดงเฉพาะตอนแก้ไขใบจอง (#houseedit มี UID) — ดูด้วย MutationObserver เหมือน commission.js
 * - ต้องใส่เหตุผล + ยืนยัน → POST opt=cancelbooking (หลังบ้าน cancel.gs: ย้ายแถวไปแท็บ "ใบจองที่ยกเลิก",
 *   ค่าคอมเป็น "ยกเลิก", คืนตารางนายหน้า, แจ้ง Lark)
 */
(function () {
    var BUTTON =
        '<div class="col-12 mt-2 cancel-booking-wrap">' +
        '  <button type="button" class="btn btn-outline-danger w-100 cancel-booking">' +
        '    <i class="bi bi-x-circle me-1"></i>ยกเลิกใบจองนี้' +
        '  </button>' +
        '</div>';

    function currentUid() {
        return String($('#houseedit').text() || '').trim();
    }

    // from = หน้าที่กดมา ('.formpoolvilla' หน้าแก้ไข / '.checkin' การ์ดเช็คอิน) — ล้มเหลวกลับหน้านั้น สำเร็จไปหน้าที่ควรไป
    function postCancel(uid, reason, from) {
        showhidepage('header');
        fetch(scriptUrl, {
            method: 'POST',
            body: new URLSearchParams({
                opt: 'cancelbooking',
                uid: uid,
                reason: reason,
                user: localStorage.getItem('name') || ''
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function (response) { return response.json(); })
            .then(function (res) {
                if (res.status === 'success') {
                    Swal.fire({ title: res.message, icon: 'success', confirmButtonText: 'ตกลง' }).then(function () {
                        $('#houseedit').text('');
                        clearForm('formpoolvilla');
                        showhidepage((from === '.checkin' ? '.checkin' : '.listpoolvilla') + ',nav');
                        getdata();
                    });
                } else {
                    Swal.fire({ icon: 'error', title: res.message, confirmButtonText: 'ตกลง' }).then(function () {
                        showhidepage(from + ',nav');
                    });
                }
            })
            .catch(function (err) {
                console.error(err);
                showhidepage(from + ',nav');
                Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' });
            });
    }

    $(document).ready(function () {
        var $save = $('#formpoolvilla .savepool');
        if (!$save.length) return;
        $save.parent().after(BUTTON);
        var $wrap = $('.cancel-booking-wrap');

        function toggle() { $wrap.toggle(!!currentUid()); }
        toggle();
        var edit = document.getElementById('houseedit');
        if (edit) new MutationObserver(toggle).observe(edit, { childList: true, characterData: true, subtree: true });

        $wrap.on('click', '.cancel-booking', function () {
            var uid = currentUid();
            if (uid) askCancel(uid, $('.textedit').first().text(), $('#name').val(), '.formpoolvilla');
        });
    });

    // ใช้ร่วมกับปุ่มยกเลิกบนการ์ดเช็คอิน (postpone.js)
    function askCancel(uid, house, name, from) {
        Swal.fire({
            icon: 'warning',
            title: 'ยกเลิกใบจองนี้?',
            html: '<b>' + (house || '') + '</b><br>' +
                (name || '') + ' · UID ' + uid + '<br>' +
                '<small>ใบจองจะถูกย้ายไปแท็บ "ใบจองที่ยกเลิก" วันที่จะว่างให้จองใหม่ ตารางนายหน้าคืนค่าเดิม และแจ้งกลุ่ม Lark</small>',
            input: 'text',
            inputPlaceholder: 'เหตุผลที่ยกเลิก (บังคับ)',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันยกเลิกใบจอง',
            cancelButtonText: 'ไม่ยกเลิก',
            confirmButtonColor: '#dc3545',
            reverseButtons: true,
            inputValidator: function (v) { if (!String(v || '').trim()) return 'กรุณาใส่เหตุผล'; }
        }).then(function (r) {
            if (r.isConfirmed) postCancel(uid, String(r.value).trim(), from);
        });
    }
    window.pailayAskCancel = askCancel;
})();
