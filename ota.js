/* ใบจองผ่าน OTA (Airbnb / Booking / Agoda) — ฟอร์มลงบันทึกการจอง + รับชำระจากแพลตฟอร์ม (29 ต.ค. 2569)
 *
 * ใบ OTA = มีแถวรายรับช่องทาง "ไม่ได้รับเงิน (OTA)" (ยอด 0) · รับเงินแล้ว = มีรายรับสถานะ "ค่าที่พัก OTA"
 * (ไม่เพิ่มคอลัมน์ — หลังบ้าน ota.gs อธิบายไว้)
 *
 * ฟอร์ม: ช่องทางเป็น OTA → ซ่อนปุ่มเงินสด/โอนจ่าย/แบ่งมัดจำ แสดงปุ่ม "ไม่ได้รับเงิน จองผ่าน OTA" (บังคับกด)
 *   ห่อ window.savepool: ส่งเป็นช่องทาง "ไม่ได้รับเงิน (OTA)" ยอด 0 ไม่แบ่งมัดจำ และค่าชำระอีก = ค่าประกัน
 *   → PDF แม่แบบเดิม: มัดจำ 0 · จ่ายวันเข้าพัก 0 · รวมจ่ายวันเข้าพัก = ค่าประกัน; แม่บ้านเห็นยอดเก็บ = ค่าประกัน
 *   แก้ไขใบ OTA เดิม: ค่าชำระอีก = ค่าประกันเสมอ (ฟอร์มเดิมจะคิดเป็นราคาเต็ม)
 * ปุ่ม "รับชำระจาก OTA" (pages.js ใส่บนการ์ด) → window.pailayOta.openPayout(uid) → opt=otapayout
 */
(function () {
    var CHANNELS = ['airbnb', 'booking', 'agoda'];
    var MARK = 'ไม่ได้รับเงิน (OTA)';
    var PAYOUT = 'ค่าที่พัก OTA';

    function isOtaChannel(v) { return CHANNELS.indexOf(String(v || '').trim().toLowerCase()) !== -1; }
    function incomeRows() { return typeof income !== 'undefined' && Array.isArray(income) ? income : []; }
    function isOta(uid) { return incomeRows().some(function (r) { return r[1] === uid && String(r[2]).trim() === MARK; }); }
    function paidTotal(uid) {
        return incomeRows().filter(function (r) { return r[1] === uid && String(r[7]).trim() === PAYOUT; })
            .reduce(function (s, r) { return s + num(r[4]); }, 0);
    }
    function num(v) { return parseFloat(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
    function today() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }

    /* ---------- ฟอร์มลงบันทึกการจอง ---------- */
    var OTA_BUTTON =
        '<div class="col-12 mb-1 ota-pay-col" style="display:none">' +
        '  <input type="radio" class="btn-check" name="paytype" id="pay_ota" autocomplete="off" placeholder="ช่องทางชำระเงิน" value="' + MARK + '">' +
        '  <label class="btn btn-outline-warning w-100" for="pay_ota"><i class="bi bi-globe me-1"></i>ไม่ได้รับเงิน จองผ่าน OTA</label>' +
        '  <div class="small text-muted mt-1">ค่าที่พักแพลตฟอร์มโอนให้ภายหลัง — วันเข้าพักรับเฉพาะค่าประกัน</div>' +
        '</div>';

    function formIsEdit() { return !!String($('#houseedit').text() || '').trim(); }

    function syncForm() {
        var ota = isOtaChannel($('#bookinguser').val()) && !formIsEdit();
        var $pay = $('#formpoolvilla');
        $pay.find('#pay_1, #pay_2, #deposit1, #deposit2').closest('.col-6').toggle(!ota);
        $pay.find('.ota-pay-col').toggle(ota);
        if (!ota && $('#pay_ota').is(':checked')) $('#pay_ota').prop('checked', false);
        if (ota && ($('#pay_1').is(':checked') || $('#pay_2').is(':checked'))) {
            $('#pay_1, #pay_2').prop('checked', false);
            $('.typepay').empty();
        }
    }

    function wrapSavepool() {
        var orig = window.savepool;
        if (typeof orig !== 'function') return;
        window.savepool = function (itemData) {
            if (itemData) {
                var insurance = String(num(itemData.totalhouse));
                if (itemData.pay_ota) {
                    delete itemData.pay_ota;
                    delete itemData.pay_1;
                    delete itemData.deposit1;
                    itemData.pay_2 = MARK;
                    itemData.deposit2 = 'ไม่แบ่งมัดจำ';
                    itemData.paydate = today();
                    itemData.paytotal = '0';
                    itemData.paylist = '';
                    itemData.overdue = insurance;
                } else if (itemData.houseedit && isOta(itemData.houseedit)) {
                    itemData.overdue = insurance;
                }
            }
            return orig.apply(this, arguments);
        };
    }

    /* ---------- รับชำระจาก OTA ---------- */
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

    function openPayout(uid) {
        var row = (typeof roomlist !== 'undefined' ? roomlist : []).find(function (r) { return r[0] === uid; }) || [];
        var expected = num(row[25]) - num(row[24]);
        var banks = (typeof bank !== 'undefined' ? bank : []).map(function (b) { return b[0]; });
        Swal.fire({
            title: 'รับชำระจาก ' + (row[6] || 'OTA'),
            html:
                '<div class="text-start small mb-2"><b class="ota-h"></b><br><span class="ota-c"></span><br>ราคาตามใบจอง ' +
                expected.toLocaleString('th-TH') + ' บาท</div>' +
                '<input type="date" class="form-control mb-2 ota-date">' +
                '<select class="form-select mb-2 ota-bank"><option value="">เลือกบัญชีรับเงิน</option></select>' +
                '<input type="text" inputmode="decimal" class="form-control mb-2 ota-money" placeholder="ยอดที่ได้รับจริง (บาท)">' +
                '<label class="form-label small mb-1 d-block text-start">สลิป / หลักฐานการโอน (ถ้ามี)</label>' +
                '<input type="file" accept="image/*" class="form-control ota-slip">',
            didOpen: function () {
                var c = Swal.getHtmlContainer();
                c.querySelector('.ota-h').textContent = row[1] || '';
                c.querySelector('.ota-c').textContent = (row[2] || '') + ' · UID ' + uid;
                c.querySelector('.ota-date').value = today();
                var sel = c.querySelector('.ota-bank');
                banks.forEach(function (b) { var o = document.createElement('option'); o.value = b; o.textContent = b; sel.appendChild(o); });
            },
            showCancelButton: true,
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            preConfirm: function () {
                var c = Swal.getHtmlContainer();
                var money = num(c.querySelector('.ota-money').value);
                var paylist = c.querySelector('.ota-bank').value;
                var paydate = c.querySelector('.ota-date').value;
                if (!paydate) return Swal.showValidationMessage('กรุณาเลือกวันที่รับเงิน');
                if (!paylist) return Swal.showValidationMessage('กรุณาเลือกบัญชีรับเงิน');
                if (!(money > 0)) return Swal.showValidationMessage('กรุณาใส่ยอดที่ได้รับ');
                return readFile(c.querySelector('.ota-slip')).then(function (slip) {
                    return { uid: uid, money: money, paylist: paylist, paydate: paydate, slip: slip };
                });
            }
        }).then(function (r) {
            if (!r.isConfirmed) return;
            showhidepage('header');
            fetch(scriptUrl, {
                method: 'POST',
                body: new URLSearchParams(Object.assign({ opt: 'otapayout' }, r.value)),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
                .then(function (response) { return response.json(); })
                .then(function (res) {
                    Swal.fire({ icon: res.status === 'success' ? 'success' : 'error', title: res.message, confirmButtonText: 'ตกลง' })
                        .then(function () {
                            showhidepage('.otalist,nav');
                            if (res.status === 'success') getdata();
                        });
                })
                .catch(function (err) {
                    console.error(err);
                    showhidepage('.otalist,nav');
                    Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' });
                });
        });
    }

    window.pailayOta = { isOtaChannel: isOtaChannel, isOta: isOta, paidTotal: paidTotal, openPayout: openPayout };

    $(document).ready(function () {
        var $pay2 = $('#formpoolvilla #pay_2').closest('.col-6');
        if ($pay2.length) $pay2.after(OTA_BUTTON);

        $(document).on('input change', '#bookinguser', syncForm);
        $(document).on('click', '#pay_ota', function () {
            $('.typepay').empty();
            $('#deposit2').prop('checked', true);
            $('label[for=pay_ota]').removeClass('btn-outline-danger').addClass('btn-outline-warning');
        });
        // เปิดฟอร์มจากการ์ดบ้าน / เปิดแก้ไข → ตั้งปุ่มตามช่องทางหลัง handler เดิมเติมค่าเสร็จ
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.card-row, .editinfo, .editinfo2')) setTimeout(syncForm, 0);
        }, true);

        // บังคับกดปุ่ม OTA ก่อนบันทึก (capture: ทำก่อน handler ของ script.js)
        document.addEventListener('click', function (e) {
            if (!e.target.closest || !e.target.closest('#formpoolvilla .savepool')) return;
            if (formIsEdit() || !isOtaChannel($('#bookinguser').val()) || $('#pay_ota').is(':checked')) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            $('label[for=pay_ota]').removeClass('btn-outline-warning').addClass('btn-outline-danger');
            Swal.fire({ icon: 'warning', title: 'ช่องทาง OTA', text: 'กรุณากดปุ่ม "ไม่ได้รับเงิน จองผ่าน OTA" ในช่องทางการชำระเงิน', confirmButtonText: 'ตกลง' });
        }, true);

        wrapSavepool();
        syncForm();
    });
})();
