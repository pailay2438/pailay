/* ลูกค้าวอล์กอิน (14 พ.ย. 2569) — ไม่แก้ script.js · แบบเดียวกับ ota.js
 *
 * ฟอร์มลงบันทึกการจอง (บ้านในเครือ) ช่องทาง "Walk in":
 *   - ปุ่ม "วอล์กอิน ไม่มีมัดจำ (แม่บ้านเก็บเงินวันเข้าพัก)" ในช่องทางชำระเงิน (ไม่บังคับ — เงินสด/โอนมัดจำยังใช้ได้)
 *     ห่อ window.savepool: ช่องทาง "วอล์กอิน (เก็บวันเข้าพัก)" ยอด 0 ไม่แบ่งมัดจำ · ค่าชำระอีก = ราคารวมทั้งหมด (รวมค่าประกัน)
 *     → แม่บ้านเห็นยอดเก็บเต็มในระบบแม่บ้าน · เช็กอินแล้วระบบลงรายรับ checkin ให้เอง (hksync)
 *   - กล่องค่าคอม: ปุ่ม "ปิดการขายโดย แอดมิน / เอเจ้น" (บังคับเลือก) → commission.js ใช้ window.pailayCommOverride
 *     ส่ง comm_mode = admin | agent ให้หลังบ้าน (commissionIsAgent_)
 */
(function () {
    'use strict';
    var MARK = 'วอล์กอิน (เก็บวันเข้าพัก)';
    var mode = ''; // '' | 'admin' | 'agent'

    function isWalkin(ch) { return /walk\s*-?\s*in|วอล์?ค?กอิน|วอคอิน/i.test(String(ch || '')); }
    function num(v) { return parseFloat(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
    function today() {
        var d = new Date();
        return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function formIsEdit() { return !!String($('#houseedit').text() || '').trim(); }
    function poolChannel() { return $('#bookinguser').val(); }

    /* ---------- ปุ่มชำระเงิน ---------- */
    var BUTTON =
        '<div class="col-12 mb-1 walkin-pay-col" style="display:none">' +
        '  <input type="radio" class="btn-check" name="paytype" id="pay_walkin" autocomplete="off" placeholder="ช่องทางชำระเงิน" value="' + MARK + '">' +
        '  <label class="btn btn-outline-success w-100" for="pay_walkin"><i class="bi bi-person-walking me-1"></i>วอล์กอิน ไม่มีมัดจำ (แม่บ้านเก็บเงินวันเข้าพัก)</label>' +
        '  <div class="small text-muted mt-1">ไม่ต้องใส่เงิน · แม่บ้านเก็บยอดเต็ม (รวมค่าประกัน) ตอนเช็กอินในระบบแม่บ้าน · ใบเป็น CHECK-IN CONFIRMATION</div>' +
        '</div>';

    function syncPay() {
        var on = isWalkin(poolChannel()) && !formIsEdit();
        $('#formpoolvilla .walkin-pay-col').toggle(on);
        if (!on && $('#pay_walkin').is(':checked')) $('#pay_walkin').prop('checked', false);
        var picked = on && $('#pay_walkin').is(':checked');
        $('#formpoolvilla').find('#deposit1').closest('.col-6').toggle(!picked);
    }

    /* ---------- ค่าคอม: ปิดการขายโดย แอดมิน / เอเจ้น ---------- */
    var MODE_HTML =
        '<div class="col-12 mb-2 comm-mode-wrap" style="display:none">' +
        '  <div class="fw-semibold mb-1">Walk in — ปิดการขายโดย</div>' +
        '  <div class="btn-group w-100" role="group">' +
        '    <button type="button" class="btn btn-outline-primary comm-mode-btn" data-mode="admin">แอดมิน (พนักงานปิดการขาย)</button>' +
        '    <button type="button" class="btn btn-outline-primary comm-mode-btn" data-mode="agent">เอเจ้น</button>' +
        '  </div>' +
        '</div>';

    function injectMode() {
        $('.comm-box').each(function () {
            if (!$(this).find('.comm-mode-wrap').length) $(this).find('legend').first().after(MODE_HTML);
        });
    }
    function channelOf($box) {
        return $box.closest('#houseoutside').length ? $('#booking_channel').val() : poolChannel();
    }
    function syncMode() {
        injectMode();
        $('.comm-box').each(function () {
            var $b = $(this);
            $b.find('.comm-mode-wrap').toggle(isWalkin(channelOf($b)));
            $b.find('.comm-mode-btn').each(function () { $(this).toggleClass('active', $(this).data('mode') === mode); });
        });
    }
    function setMode(m) {
        mode = m || '';
        syncMode();
        if (typeof window.pailayCommRefresh === 'function') window.pailayCommRefresh();
    }
    // commission.js ถามก่อนตัดสินว่าเป็นงานเอเจ้นไหม: true = เอเจ้น · false = แอดมิน · null = ใช้กติกาเดิม
    window.pailayCommOverride = function (ch) {
        if (!isWalkin(ch) || !mode) return null;
        return mode === 'agent';
    };
    // commission.js โหลดค่าคอมเดิม (เปิดแก้ไข) → เดาโหมดจากข้อมูลเดิม
    window.pailayCommLoaded = function (res) {
        if (!res || !isWalkin(res.channel)) return;
        mode = (String(res.staff || '').trim() === '' && String(res.g || '') !== '') ? 'agent' : 'admin';
        syncMode();
    };

    /* ---------- ห่อการบันทึก ---------- */
    function wrapSavepool() {
        var orig = window.savepool;
        if (typeof orig !== 'function') return;
        window.savepool = function (itemData) {
            if (itemData) {
                var walk = !!itemData.pay_walkin;
                delete itemData.pay_walkin;
                if (walk) {
                    delete itemData.pay_1;
                    delete itemData.deposit1;
                    delete itemData.slip;
                    itemData.pay_2 = MARK;
                    itemData.deposit2 = 'ไม่แบ่งมัดจำ';
                    itemData.paydate = today();
                    itemData.paytotal = '0';
                    itemData.paylist = '';
                    itemData.overdue = String(num(itemData.totalall));
                    itemData.walkin = '1';
                }
                if (isWalkin(itemData.bookinguser) && mode) itemData.comm_mode = mode;
            }
            return orig.apply(this, arguments);
        };
    }
    function wrapCheckvalue() {
        var orig = window.checkvalue;
        if (typeof orig !== 'function') return;
        window.checkvalue = function (formData, excludeFields) {
            return orig.call(this, formData, (excludeFields || []).concat(['pay_walkin']));
        };
    }

    $(document).ready(function () {
        var $pay2 = $('#formpoolvilla #pay_2').closest('.col-6');
        var $ota = $('#formpoolvilla .ota-pay-col');
        if ($ota.length) $ota.after(BUTTON); else if ($pay2.length) $pay2.after(BUTTON);

        $(document).on('input change', '#bookinguser, #booking_channel', function () { syncPay(); syncMode(); });
        $(document).on('click', '#pay_walkin', function () {
            $('.typepay').empty();
            $('#deposit-extra').empty();
            $('#deposit2').prop('checked', true);
            syncPay();
        });
        $(document).on('click', '#pay_1, #pay_2, #pay_ota', function () { setTimeout(syncPay, 0); });
        $(document).on('click', '.comm-mode-btn', function () { setMode($(this).data('mode')); });

        // เปิดฟอร์มใบใหม่/แก้ไข → ล้างโหมด (แก้ไขจะได้โหมดจาก pailayCommLoaded)
        document.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.card-row, .editinfo, .editinfo2, .navigate-button')) {
                mode = '';
                setTimeout(function () { syncPay(); syncMode(); }, 0);
            }
        }, true);

        // บังคับเลือกแอดมิน/เอเจ้นเมื่อช่องทาง Walk in (window capture: ทำก่อน capture ของ commission.js บน document)
        window.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.savepool, .savehouseoutside');
            if (!btn) return;
            var ch = btn.classList.contains('savepool') ? poolChannel() : $('#booking_channel').val();
            if (btn.classList.contains('savehouseoutside') && String($('#formtype').text() || '').trim() !== 'ลงทะเบียนบ้านพักนอกเครือ') return;
            if (!isWalkin(ch) || mode) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            $('.comm-mode-wrap:visible').get(0) && $('.comm-mode-wrap:visible').get(0).scrollIntoView({ block: 'center' });
            Swal.fire({ icon: 'warning', title: 'ช่องทาง Walk in', text: 'กรุณาเลือก "ปิดการขายโดย แอดมิน หรือ เอเจ้น" ในกล่องค่าคอม', confirmButtonText: 'ตกลง' });
        }, true);

        wrapSavepool();
        wrapCheckvalue();
        setTimeout(function () { syncPay(); syncMode(); }, 0);
        setInterval(syncMode, 1500); // กล่องค่าคอมถูกสร้าง/วาดใหม่ภายหลัง
    });
})();
