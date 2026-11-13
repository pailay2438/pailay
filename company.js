/* ใบจองในนามบริษัท (14 พ.ย. 2569) — กล่อง "ลูกค้าเป็นบริษัท" ใต้ "ข้อมูลผู้เข้าพัก" ในฟอร์มบ้านในเครือ
 *
 * - ช่องไม่มี id (getFormData/checkvalue/removeinvalid ไม่แตะ) → ส่งค่าผ่านการห่อ window.savepool เป็น comp_*
 * - ติ๊กแล้วบังคับ ชื่อบริษัท / ที่อยู่ / เลขผู้เสียภาษี 13 หลัก (ตรวจแบบ capture ก่อน handler เดิมของปุ่มบันทึก)
 * - หลังบ้าน (company.gs) เก็บในแท็บ "ข้อมูลบริษัทลูกค้า" ตาม UID → PDF ใบจองใช้แบบบริษัท (pdfbooking.gs)
 * - เปิดแก้ไขใบจอง (#houseedit มี UID) → ดึงข้อมูลบริษัทเดิมมาเติม (opt=getcompany) · ใบใหม่ → ล้างกล่อง
 */
(function () {
    'use strict';
    var BOX =
        '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row comp-box">' +
        '  <legend class="float-none w-auto px-3">ใบจองในนามบริษัท</legend>' +
        '  <div class="col-12 mb-2"><div class="form-check form-switch">' +
        '    <input class="form-check-input comp-on" type="checkbox" role="switch">' +
        '    <label class="form-check-label">ลูกค้าเป็นบริษัท — ออกใบจองในนามบริษัท</label></div></div>' +
        '  <div class="comp-fields row g-0" style="display:none">' +
        '    <div class="col-12 col-md-8 mb-1"><div class="form-floating"><input class="form-control comp-name" type="text" placeholder="ชื่อบริษัท"><label>ชื่อบริษัท / นิติบุคคล *</label></div></div>' +
        '    <div class="col-12 col-md-4 mb-1"><div class="form-floating"><input class="form-control comp-branch" type="text" placeholder="สาขา" value="สำนักงานใหญ่"><label>สาขา</label></div></div>' +
        '    <div class="col-12 mb-1"><div class="form-floating"><textarea class="form-control comp-addr" placeholder="ที่อยู่" style="height:76px"></textarea><label>ที่อยู่บริษัท *</label></div></div>' +
        '    <div class="col-12 col-md-6 mb-1"><div class="form-floating"><input class="form-control comp-tax" type="text" inputmode="numeric" maxlength="17" placeholder="เลขประจำตัวผู้เสียภาษี"><label>เลขประจำตัวผู้เสียภาษี (13 หลัก) *</label></div></div>' +
        '  </div>' +
        '</fieldset>';

    var $box;
    function on() { return $box && $box.find('.comp-on').is(':checked'); }
    function show() { $box.find('.comp-fields').toggle(on()); }
    function taxDigits() { return String($box.find('.comp-tax').val() || '').replace(/\D/g, ''); }
    function reset() {
        if (!$box) return;
        $box.find('.comp-on').prop('checked', false);
        $box.find('.comp-name, .comp-addr, .comp-tax').val('');
        $box.find('.comp-branch').val('สำนักงานใหญ่');
        show();
    }
    function fill(c) {
        if (!$box || !c) return;
        $box.find('.comp-on').prop('checked', true);
        $box.find('.comp-name').val(c.name || '');
        $box.find('.comp-addr').val(c.addr || '');
        $box.find('.comp-tax').val(c.tax || '');
        $box.find('.comp-branch').val(c.branch || 'สำนักงานใหญ่');
        show();
    }
    function validate() {
        if (!on()) return '';
        if (!String($box.find('.comp-name').val() || '').trim()) return 'กรุณาใส่ชื่อบริษัท';
        if (!String($box.find('.comp-addr').val() || '').trim()) return 'กรุณาใส่ที่อยู่บริษัท';
        if (taxDigits().length !== 13) return 'เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก';
        return '';
    }
    function payload() {
        if (!on()) return { comp_enabled: '0' };
        return {
            comp_enabled: '1',
            comp_name: String($box.find('.comp-name').val() || '').trim(),
            comp_addr: String($box.find('.comp-addr').val() || '').trim().replace(/\s*\n\s*/g, ' '),
            comp_tax: taxDigits(),
            comp_branch: String($box.find('.comp-branch').val() || '').trim() || 'สำนักงานใหญ่'
        };
    }
    function load(uid) {
        if (typeof scriptUrl === 'undefined' || !uid) return;
        fetch(scriptUrl, { method: 'POST', body: new URLSearchParams({ opt: 'getcompany', uid: uid }) })
            .then(function (r) { return r.json(); })
            .then(function (res) { if (res && res.status === 'success' && res.data && String($('#houseedit').text()).trim() === uid) fill(res.data); })
            .catch(function () { });
    }

    $(document).ready(function () {
        var $guest = $('#formpoolvilla legend').filter(function () { return $(this).text().trim() === 'ข้อมูลผู้เข้าพัก'; }).first().closest('fieldset');
        if (!$guest.length) return;
        $box = $(BOX).insertAfter($guest);
        $box.on('change', '.comp-on', show);

        // ตรวจก่อนบันทึก (capture ทำงานก่อน jQuery handler ของปุ่ม)
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('.savepool');
            if (!btn) return;
            var err = validate();
            if (err) { e.preventDefault(); e.stopImmediatePropagation(); Swal.fire({ icon: 'warning', title: err, confirmButtonText: 'ตกลง' }); }
        }, true);

        var orig = window.savepool;
        if (typeof orig === 'function') window.savepool = function (itemData) { return orig.call(this, Object.assign({}, itemData, payload())); };

        // แก้ไขใบจอง → ดึงข้อมูลบริษัทเดิม · ใบใหม่ → ล้าง
        var he = document.getElementById('houseedit');
        if (he) new MutationObserver(function () {
            var uid = String(he.textContent || '').trim();
            reset();
            if (uid) load(uid);
        }).observe(he, { childList: true, characterData: true, subtree: true });
        $(document).on('click', '.navigate-button[data-target=".listpoolvilla"]', reset);
    });
})();
