/* ปุ่ม "ยกเลิกใบจองนี้" ในหน้าแก้ไขใบจองบ้านในเครือ (#formpoolvilla)
 *
 * - แสดงเฉพาะตอนแก้ไขใบจอง (#houseedit มี UID) — ดูด้วย MutationObserver เหมือน commission.js
 * - ต้องใส่เหตุผล + เลือกการจัดการเงิน (31 ต.ค. 2569): คืนเงิน (ยอด/เงินสด-โอน/บัญชี/วันที่/สลิปบังคับ) หรือริบมัดจำทั้งหมด
 *   ใบที่ยังไม่ได้รับเงินไม่ต้องเลือก → POST opt=cancelrefund (หลังบ้าน refund.gs: ลงรายจ่าย "คืนเงินยกเลิก"
 *   แล้ว cancel.gs: ย้ายแถวไปแท็บ "ใบจองที่ยกเลิก", ค่าคอมเป็น "ยกเลิก", คืนตารางนายหน้า, แจ้ง Lark)
 * - askCancel ใช้ร่วมกับปุ่มยกเลิกบนการ์ดเช็คอินและหน้าลูกค้าเลื่อนไม่มีกำหนด (postpone.js)
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
    function postCancel(uid, reason, from, money) {
        showhidepage('header');
        fetch(scriptUrl, {
            method: 'POST',
            body: new URLSearchParams(Object.assign({
                opt: 'cancelrefund',
                uid: uid,
                reason: reason,
                user: localStorage.getItem('name') || ''
            }, money)),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function (response) { return response.json(); })
            .then(function (res) {
                if (res.status === 'success') {
                    Swal.fire({ title: res.message, icon: 'success', confirmButtonText: 'ตกลง' }).then(function () {
                        $('#houseedit').text('');
                        clearForm('formpoolvilla');
                        showhidepage((from === '.formpoolvilla' ? '.listpoolvilla' : from) + ',nav');
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

    function num(v) { return parseFloat(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
    function money(n) { return num(n).toLocaleString('th-TH', { maximumFractionDigits: 2 }); }
    function today() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    // รายรับรวมของใบ (income = บันทึกรายรับ จาก doGet data5; หลังบ้านตรวจซ้ำ)
    function received(uid) {
        var rows = typeof income !== 'undefined' && Array.isArray(income) ? income : [];
        return rows.filter(function (r) { return r[1] === uid; }).reduce(function (s, r) { return s + num(r[4]); }, 0);
    }
    function readFile(input) {
        return new Promise(function (resolve, reject) {
            var f = input && input.files && input.files[0];
            if (!f) return resolve('');
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result); };
            reader.onerror = reject;
            reader.readAsDataURL(f);
        });
    }

    var MONEY_FORM =
        '<div class="text-start border rounded p-2 mt-2 cx-money">' +
        '  <div class="small mb-2">รับเงินไว้แล้ว <b class="cx-got"></b> บาท</div>' +
        '  <div class="row g-1 mb-2">' +
        '    <div class="col-6"><input type="radio" class="btn-check" name="cx-mode" id="cx-refund" value="refund">' +
        '      <label class="btn btn-outline-primary btn-sm w-100" for="cx-refund">คืนเงิน</label></div>' +
        '    <div class="col-6"><input type="radio" class="btn-check" name="cx-mode" id="cx-forfeit" value="forfeit">' +
        '      <label class="btn btn-outline-secondary btn-sm w-100" for="cx-forfeit">ริบมัดจำทั้งหมด</label></div>' +
        '  </div>' +
        '  <div class="cx-refund-box" style="display:none">' +
        '    <input type="text" inputmode="decimal" class="form-control form-control-sm mb-1 cx-amount" placeholder="ยอดที่คืน (บาท)">' +
        '    <select class="form-select form-select-sm mb-1 cx-paytype"><option value="โอนจ่าย">โอนจ่าย</option><option value="เงินสด">เงินสด</option></select>' +
        '    <select class="form-select form-select-sm mb-1 cx-bank"><option value="">เลือกบัญชีที่โอนคืน</option></select>' +
        '    <input type="date" class="form-control form-control-sm mb-1 cx-date">' +
        '    <label class="form-label small mb-1 d-block">สลิป / หลักฐานการคืนเงิน (บังคับ)</label>' +
        '    <input type="file" accept="image/*" class="form-control form-control-sm cx-slip">' +
        '  </div>' +
        '</div>';

    // ใช้ร่วมกับปุ่มยกเลิกบนการ์ดเช็คอิน / หน้าลูกค้าเลื่อนไม่มีกำหนด (postpone.js)
    function askCancel(uid, house, name, from) {
        var got = received(uid);
        Swal.fire({
            icon: 'warning',
            title: 'ยกเลิกใบจองนี้?',
            html: '<b class="cx-house"></b><br><span class="cx-name"></span><br>' +
                '<small>ใบจองจะถูกย้ายไปแท็บ "ใบจองที่ยกเลิก" วันที่จะว่างให้จองใหม่ ตารางนายหน้าคืนค่าเดิม และแจ้งกลุ่ม Lark</small>' +
                '<input type="text" class="form-control mt-2 cx-reason" placeholder="เหตุผลที่ยกเลิก (บังคับ)">' +
                (got > 0 ? MONEY_FORM : '<div class="small text-muted mt-2">ใบนี้ยังไม่ได้รับเงิน</div>'),
            didOpen: function () {
                var c = Swal.getHtmlContainer();
                c.querySelector('.cx-house').textContent = house || '';
                c.querySelector('.cx-name').textContent = (name || '') + ' · UID ' + uid;
                if (!(got > 0)) return;
                c.querySelector('.cx-got').textContent = money(got);
                c.querySelector('.cx-amount').value = got;
                c.querySelector('.cx-date').value = today();
                var sel = c.querySelector('.cx-bank');
                (typeof bank !== 'undefined' ? bank : []).forEach(function (b) {
                    var o = document.createElement('option'); o.value = b[0]; o.textContent = b[0]; sel.appendChild(o);
                });
                var box = c.querySelector('.cx-refund-box');
                Array.prototype.forEach.call(c.querySelectorAll('[name=cx-mode]'), function (r) {
                    r.addEventListener('change', function () { box.style.display = c.querySelector('#cx-refund').checked ? '' : 'none'; });
                });
                c.querySelector('.cx-paytype').addEventListener('change', function () { sel.style.display = this.value === 'โอนจ่าย' ? '' : 'none'; });
            },
            showCancelButton: true,
            confirmButtonText: 'ยืนยันยกเลิกใบจอง',
            cancelButtonText: 'ไม่ยกเลิก',
            confirmButtonColor: '#dc3545',
            reverseButtons: true,
            preConfirm: function () {
                var c = Swal.getHtmlContainer();
                var reason = String(c.querySelector('.cx-reason').value || '').trim();
                if (!reason) return Swal.showValidationMessage('กรุณาใส่เหตุผล');
                if (!(got > 0)) return { reason: reason, money: { refundmode: 'none' } };
                var mode = c.querySelector('[name=cx-mode]:checked');
                if (!mode) return Swal.showValidationMessage('กรุณาเลือก คืนเงิน หรือ ริบมัดจำทั้งหมด');
                if (mode.value === 'forfeit') return { reason: reason, money: { refundmode: 'forfeit' } };
                var amount = num(c.querySelector('.cx-amount').value);
                var paytype = c.querySelector('.cx-paytype').value;
                var paylist = paytype === 'โอนจ่าย' ? c.querySelector('.cx-bank').value : '';
                var paydate = c.querySelector('.cx-date').value;
                if (!(amount > 0)) return Swal.showValidationMessage('กรุณาใส่ยอดที่คืน');
                if (amount > got + 0.001) return Swal.showValidationMessage('ยอดคืนมากกว่าที่รับไว้ (' + money(got) + ' บาท)');
                if (paytype === 'โอนจ่าย' && !paylist) return Swal.showValidationMessage('กรุณาเลือกบัญชีที่โอนคืน');
                if (!paydate) return Swal.showValidationMessage('กรุณาเลือกวันที่คืนเงิน');
                var slipInput = c.querySelector('.cx-slip');
                if (!slipInput.files || !slipInput.files[0]) return Swal.showValidationMessage('กรุณาแนบสลิป/หลักฐานการคืนเงิน');
                return readFile(slipInput).then(function (slip) {
                    return { reason: reason, money: { refundmode: 'refund', money: amount, paytype: paytype, paylist: paylist, paydate: paydate, slip: slip } };
                });
            }
        }).then(function (r) {
            if (r.isConfirmed) postCancel(uid, r.value.reason, from, r.value.money);
        });
    }
    window.pailayAskCancel = askCancel;
})();
