/* เช็คอินจ่ายได้หลายช่องทาง (29 ต.ค. 2569): เงินสด + โอนบัญชีที่ 1 + โอนบัญชีที่ 2 (เพิ่มได้)
 *
 * ใช้หน้า "เพิ่มรายรับ" (#addsdeposit) เดิม — เฉพาะตอนรายรับ = checkin จะซ่อนปุ่มเงินสด/โอนจ่ายแบบเลือกได้ทางเดียว
 * แล้วแสดงแผงนี้แทน; รายรับอื่นๆ ยังใช้แบบเดิมทุกอย่าง
 * บันทึก → opt=savecheckinsplit (หลังบ้าน checkin.gs: รายรับ 1 แถวต่อช่องทาง + สถานะ checkin + แจ้ง Lark สรุปเดียว)
 * ช่องในแผงไม่มี id → getFormData/checkvalue ของฟอร์มเดิมไม่ยุ่ง
 */
(function () {
    var PANEL =
        '<div class="checkin-split col-12">' +
        '  <div class="mb-1"><div class="form-floating">' +
        '    <input class="form-control cs-date" type="date" placeholder="วันที่รับเงิน"><label>วันที่รับเงิน</label>' +
        '  </div></div>' +
        '  <div class="mb-1"><div class="form-floating">' +
        '    <input class="form-control cs-money" data-type="cash" type="text" inputmode="decimal" placeholder="เงินสด"><label>เงินสด (บาท) — ไม่มีเว้นว่าง</label>' +
        '  </div></div>' +
        '  <div class="cs-transfer border rounded p-2 mb-1" data-n="1"></div>' +
        '  <div class="cs-transfer border rounded p-2 mb-1" data-n="2" style="display:none"></div>' +
        '  <button type="button" class="btn btn-outline-primary w-100 mb-1 cs-add2"><i class="bi bi-plus-circle me-1"></i>เพิ่มบัญชีรับเงินที่ 2</button>' +
        '  <div class="alert alert-secondary py-2 mb-1 cs-sum"></div>' +
        '  <button type="button" class="btn btn-primary w-100 mb-1 cs-save">บันทึกเช็คอิน</button>' +
        '</div>';

    function transferHtml(n) {
        return '<div class="small fw-bold mb-1">โอนเข้าบัญชีที่ ' + n + (n === 2 ? ' <a href="#" class="cs-remove2 text-danger ms-2">เอาออก</a>' : '') + '</div>' +
            '<div class="mb-1"><div class="form-floating">' +
            '  <select class="form-select cs-bank"><option value="" selected>เลือกบัญชีรับเงิน</option></select><label>รับเงินผ่านบัญชี</label>' +
            '</div></div>' +
            '<div class="mb-1"><div class="form-floating">' +
            '  <input class="form-control cs-money" data-type="transfer" type="text" inputmode="decimal" placeholder="ยอดโอน"><label>ยอดโอน (บาท)</label>' +
            '</div></div>' +
            '<div><div class="form-floating">' +
            '  <input class="form-control cs-slip" type="file" accept="image/*" placeholder="สลิป"><label>สลิปโอนเงิน (ถ้ามี)</label>' +
            '</div></div>';
    }

    function num(v) { return parseFloat(String(v || '').replace(/,/g, '')) || 0; }
    function fmt(n) { return n.toLocaleString('th-TH', { maximumFractionDigits: 2 }); }
    function $panel() { return $('#addsdeposit .checkin-split'); }
    function expected() { return num($('#totalguides3').val()); }

    function refreshSum() {
        var total = 0;
        $panel().find('.cs-money:visible').each(function () { total += num(this.value); });
        var exp = expected();
        var ok = Math.abs(total - exp) < 0.01;
        $panel().find('.cs-sum')
            .toggleClass('alert-success', ok).toggleClass('alert-warning', !ok)
            .text('รวมที่รับ ' + fmt(total) + ' บาท / ยอดรวมทั้งสิ้น ' + fmt(exp) + ' บาท' + (ok ? ' ✓' : ''));
    }

    function fillBanks() {
        $panel().find('.cs-bank').each(function () {
            var $s = $(this);
            if ($s.children().length > 1) return;
            (typeof bank !== 'undefined' ? bank : []).forEach(function (item) {
                $s.append($('<option>').val(item[0]).text(item[0]));
            });
        });
    }

    function reset() {
        var $p = $panel();
        $p.find('.cs-date').val('');
        $p.find('.cs-money').val('');
        $p.find('.cs-bank').val('');
        $p.find('.cs-slip').val('');
        $p.find('.cs-transfer[data-n="2"]').hide();
        $p.find('.cs-add2').show();
        refreshSum();
    }

    // แสดงแผงเฉพาะตอนรายรับ = checkin; ซ่อนปุ่มเลือกช่องทาง/ฟอร์มเดิม
    function sync() {
        var isCheckin = $('#depositlist').val() === 'checkin';
        var $page = $('#addsdeposit');
        $page.find('#pay_111, #pay_222').closest('.col-6').toggle(!isCheckin);
        $page.find('.typepay3').toggle(!isCheckin);
        $page.find('.savedeposit').closest('.col-12').toggle(!isCheckin);
        // ยอดค้างชำระ / ค่าประกัน / ยอดรวมทั้งสิ้น ใช้เฉพาะรายรับ checkin — รายรับอื่นซ่อน
        $page.find('.totalguide').toggle(isCheckin);
        $panel().toggle(isCheckin);
        if (isCheckin) {
            fillBanks();
            refreshSum();
        }
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

    async function save() {
        var $p = $panel();
        var paydate = $p.find('.cs-date').val();
        if (!paydate) return Swal.fire({ icon: 'warning', title: 'กรุณาเลือกวันที่รับเงิน', confirmButtonText: 'ตกลง' });

        var parts = [];
        var cash = num($p.find('.cs-money[data-type="cash"]').val());
        if (cash > 0) parts.push({ type: 'เงินสด', money: cash });
        var $boxes = $p.find('.cs-transfer:visible');
        for (var i = 0; i < $boxes.length; i++) {
            var $b = $($boxes[i]);
            var money = num($b.find('.cs-money').val());
            if (money <= 0) continue;
            var bankName = $b.find('.cs-bank').val();
            if (!bankName) return Swal.fire({ icon: 'warning', title: 'กรุณาเลือกบัญชีรับเงินของยอดโอนบัญชีที่ ' + $b.data('n'), confirmButtonText: 'ตกลง' });
            parts.push({ type: 'โอนจ่าย', money: money, paylist: bankName, slip: await readFile($b.find('.cs-slip')[0]) });
        }
        if (!parts.length) return Swal.fire({ icon: 'warning', title: 'กรุณาใส่ยอดเงินอย่างน้อย 1 ช่องทาง', confirmButtonText: 'ตกลง' });

        var total = parts.reduce(function (s, p) { return s + p.money; }, 0);
        if (Math.abs(total - expected()) >= 0.01) {
            var r = await Swal.fire({
                icon: 'warning',
                title: 'ยอดรับไม่เท่ายอดรวมทั้งสิ้น',
                text: 'รับ ' + fmt(total) + ' บาท แต่ยอดรวมทั้งสิ้น ' + fmt(expected()) + ' บาท — ยืนยันบันทึก?',
                showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'กลับไปแก้', reverseButtons: true
            });
            if (!r.isConfirmed) return;
        }

        showhidepage('header');
        fetch(scriptUrl, {
            method: 'POST',
            body: new URLSearchParams({
                opt: 'savecheckinsplit',
                idlists: $('#addsdeposit .idlists').text().trim(),
                paydate: paydate,
                parts: JSON.stringify(parts)
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function (response) { return response.json(); })
            .then(function (res) {
                if (res.status === 'success') {
                    Swal.fire({ title: res.message, icon: 'success', timer: 2000, showConfirmButton: false }).then(function () {
                        showhidepage('.checkout,nav');
                        getdata();
                        clearForm('addsdeposit');
                        reset();
                    });
                } else {
                    Swal.fire({ icon: 'error', title: res.message, confirmButtonText: 'ตกลง' }).then(function () {
                        showhidepage('.addsdeposit,nav');
                    });
                }
            })
            .catch(function (err) {
                console.error(err);
                showhidepage('.addsdeposit,nav');
                Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' });
            });
    }

    $(document).ready(function () {
        var $anchor = $('#addsdeposit .typepay3');
        if (!$anchor.length) return;
        $anchor.after(PANEL);
        $panel().find('.cs-transfer').each(function () { $(this).html(transferHtml(Number($(this).data('n')))); });
        $panel().hide();

        $panel().on('input', '.cs-money', refreshSum);
        $panel().on('click', '.cs-add2', function () {
            $panel().find('.cs-transfer[data-n="2"]').show();
            $(this).hide();
            fillBanks();
            refreshSum();
        });
        $panel().on('click', '.cs-remove2', function (e) {
            e.preventDefault();
            var $b = $panel().find('.cs-transfer[data-n="2"]').hide();
            $b.find('.cs-money, .cs-bank, .cs-slip').val('');
            $panel().find('.cs-add2').show();
            refreshSum();
        });
        $panel().on('click', '.cs-save', save);

        // script.js ตั้ง #depositlist = checkin ตอนกดปุ่ม Check In บนการ์ด แล้ว stopPropagation
        // → ฟังแบบ capture แล้วตรวจหลังจาก handler เดิมทำงานเสร็จ
        document.addEventListener('click', function (e) {
            if (!e.target.closest || !e.target.closest('.checkinstatus, .checkinstatus2, .adddeposit')) return;
            setTimeout(function () { reset(); sync(); }, 0);
        }, true);
        $(document).on('change', '#depositlist', sync);
    });
})();
