/* ลูกค้าเลื่อนการเข้าพักแบบไม่มีกำหนด + ปุ่มบนการ์ดเช็คอิน (29 ต.ค. 2569)
 *
 * การ์ดเช็คอิน (#housetable): ส่วนบนเดิมมี แก้ไขข้อมูล / Check In → เพิ่ม ⏸️ เลื่อนไม่มีกำหนด / ❌ ยกเลิกใบจอง (รวม 4 ปุ่ม)
 * - กดเลื่อน → opt=postponebooking (หลังบ้าน postpone.gs: วันเดิมว่าง + คืนตารางนายหน้า + แจ้ง Lark)
 *   การ์ดถูกซ่อนจากหน้าเช็คอิน แล้วไปแสดงในเมนู "ลูกค้าเลื่อนไม่มีกำหนด" (.postponed)
 * - กด "กำหนดวันเข้าพักใหม่" → คลิกปุ่มแก้ไขข้อมูลของการ์ดเดิม (ซ่อนอยู่ใน #housetable, handler ของ script.js ยังผูกอยู่)
 *   แล้วล้างวันเข้า-ออกให้เลือกใหม่ → บันทึก = savepools แก้ไข (ออก PDF ใหม่/ลงตารางใหม่) → หลังบ้านเอาออกจากรายการเลื่อน
 * รายการเลื่อนมาจาก doGet data9; roomlist (ใบจองทั้งหมด) เป็นตัวแปร global ของ script.js
 */
(function () {
    var postponed = {};   // uid → [uid, เวลาเลื่อน, ผู้เลื่อน, เหตุผล, วันเข้าเดิม, วันออกเดิม]

    var ACTIONS =
        '<div class="col-6 mb-1 checkins pp-injected">' +
        '  <button class="btn btn-outline-secondary btn-sm w-100 pp-postpone"><i class="bi bi-pause-circle me-1"></i>เลื่อนไม่มีกำหนด</button>' +
        '</div>' +
        '<div class="col-6 mb-1 checkins pp-injected">' +
        '  <button class="btn btn-outline-danger btn-sm w-100 pp-cancel"><i class="bi bi-x-circle me-1"></i>ยกเลิกใบจอง</button>' +
        '</div>';

    function bookingOfCard(card) {
        var btn = card.querySelector('[data-row]');
        if (!btn || typeof roomlist === 'undefined') return null;
        return roomlist[Number(btn.getAttribute('data-row'))] || null;
    }

    function fmtDate(v) {
        var d = new Date(v);
        if (isNaN(d.getTime())) return String(v || '-');
        var y = d.getFullYear();
        return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + (y < 2400 ? y + 543 : y);
    }

    // การ์ดเช็คอิน: ซ่อนใบที่เลื่อนอยู่ + เติม 2 ปุ่มใหม่ที่ส่วนบน
    function decorateCheckin() {
        var box = document.getElementById('housetable');
        if (!box) return;
        Array.prototype.forEach.call(box.querySelectorAll('.card'), function (card) {
            var row = bookingOfCard(card);
            var col = card.parentElement;
            if (!row) return;
            col.style.display = postponed[row[0]] ? 'none' : '';
            if (card.querySelector('.pp-injected')) return;
            var tops = card.querySelectorAll('.checkins');
            if (!tops.length) return;
            tops[tops.length - 1].insertAdjacentHTML('afterend', ACTIONS);
            var hidden = tops[0].style.display === 'none';
            Array.prototype.forEach.call(card.querySelectorAll('.pp-injected'), function (el) {
                el.style.display = hidden ? 'none' : '';
                el.querySelector('button').setAttribute('data-uid', row[0]);
            });
        });
    }

    function renderList() {
        var $box = $('#postponedlist').empty();
        var uids = Object.keys(postponed);
        $('.navbar-nav [data-target=".postponed"]').text('ลูกค้าเลื่อนไม่มีกำหนด' + (uids.length ? ' (' + uids.length + ')' : ''));
        if (!uids.length) {
            $box.append('<div class="col-12 text-center text-muted py-3">ไม่มีลูกค้าที่เลื่อนไม่มีกำหนด</div>');
            return;
        }
        uids.forEach(function (uid) {
            var p = postponed[uid];
            var b = (typeof roomlist !== 'undefined' && roomlist.find(function (r) { return r[0] === uid; })) || [];
            var $card = $(
                '<div class="col-md-4 col-12 mb-1"><div class="card mb-1 shadow-sm"><div class="card-body">' +
                '  <button class="btn btn-outline-success btn-sm w-100 mb-2 pp-reschedule"><i class="bi bi-calendar-plus me-1"></i>กำหนดวันเข้าพักใหม่</button>' +
                '  <div><b>บ้าน:</b> <span class="pp-house"></span></div>' +
                '  <div><b>ชื่อผู้จอง:</b> <span class="pp-name"></span></div>' +
                '  <div><b>เบอร์:</b> <span class="pp-tel"></span></div>' +
                '  <div><b>วันเข้าพักเดิม:</b> <span class="pp-dates"></span></div>' +
                '  <div><b>เหตุผล:</b> <span class="pp-reason"></span></div>' +
                '  <div class="text-muted small mt-1">เลื่อนเมื่อ <span class="pp-when"></span> โดย <span class="pp-by"></span> · UID <span class="pp-uid"></span></div>' +
                '</div></div></div>');
            // ใส่ข้อความด้วย .text() กันอักขระพิเศษในชื่อ/เหตุผล
            $card.find('.pp-house').text(b[1] || '-');
            $card.find('.pp-name').text(b[2] || '-');
            $card.find('.pp-tel').text(b[3] || '-');
            $card.find('.pp-dates').text(fmtDate(p[4]) + ' → ' + fmtDate(p[5]));
            $card.find('.pp-reason').text(p[3] || '-');
            $card.find('.pp-when').text(fmtDate(p[1]));
            $card.find('.pp-by').text(p[2] || '-');
            $card.find('.pp-uid').text(uid);
            $card.find('.pp-reschedule').attr('data-uid', uid);
            $box.append($card);
        });
    }

    function loadPostponed() {
        if (typeof fetchDataFromServer !== 'function') return;
        fetchDataFromServer('postponed', 'data9').then(function (rows) {
            postponed = {};
            (rows || []).forEach(function (r) { postponed[String(r[0]).trim()] = r; });
            renderList();
            decorateCheckin();
        }).catch(function (e) { console.error('loadPostponed', e); });
    }

    function post(opt, params, onOk) {
        showhidepage('header');
        fetch(scriptUrl, {
            method: 'POST',
            body: new URLSearchParams(Object.assign({ opt: opt, user: localStorage.getItem('name') || '' }, params)),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
            .then(function (response) { return response.json(); })
            .then(function (res) {
                if (res.status === 'success') {
                    Swal.fire({ title: res.message, icon: 'success', confirmButtonText: 'ตกลง' }).then(onOk);
                } else {
                    Swal.fire({ icon: 'error', title: res.message, confirmButtonText: 'ตกลง' }).then(function () {
                        showhidepage('.checkin,nav');
                    });
                }
            })
            .catch(function (err) {
                console.error(err);
                showhidepage('.checkin,nav');
                Swal.fire({ icon: 'error', title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', confirmButtonText: 'ตกลง' });
            });
    }

    function askPostpone(row) {
        Swal.fire({
            icon: 'question',
            title: 'เลื่อนการเข้าพักแบบไม่มีกำหนด?',
            html: '<b></b><br><span></span><br>' +
                '<small>วันเดิมจะว่างให้จองใหม่ ตารางนายหน้าคืนค่าเดิม และแจ้งกลุ่ม Lark — ใบจองย้ายไปเมนู "ลูกค้าเลื่อนไม่มีกำหนด" (เงินที่รับไว้ยังอยู่)</small>',
            didOpen: function () {
                var c = Swal.getHtmlContainer();
                c.querySelector('b').textContent = row[1] || '';
                c.querySelector('span').textContent = (row[2] || '') + ' · ' + fmtDate(row[8]) + ' → ' + fmtDate(row[9]);
            },
            input: 'text',
            inputPlaceholder: 'เหตุผลที่เลื่อน (บังคับ)',
            showCancelButton: true,
            confirmButtonText: 'ยืนยันเลื่อน',
            cancelButtonText: 'ไม่เลื่อน',
            reverseButtons: true,
            inputValidator: function (v) { if (!String(v || '').trim()) return 'กรุณาใส่เหตุผล'; }
        }).then(function (r) {
            if (!r.isConfirmed) return;
            post('postponebooking', { uid: row[0], reason: String(r.value).trim() }, function () {
                postponed[row[0]] = [row[0], new Date(), '', String(r.value).trim(), row[8], row[9]];
                showhidepage('.checkin,nav');
                decorateCheckin();
                getdata();
            });
        });
    }

    function reschedule(uid) {
        var box = document.getElementById('housetable');
        var btn = box && Array.prototype.find.call(box.querySelectorAll('.editinfo'), function (b) {
            var r = roomlist[Number(b.getAttribute('data-row'))];
            return r && r[0] === uid;
        });
        if (!btn) {
            Swal.fire({ icon: 'error', title: 'เปิดใบจองนี้ไม่ได้', text: 'ลองรีเฟรชหน้าแล้วกดใหม่อีกครั้ง', confirmButtonText: 'ตกลง' });
            return;
        }
        $(btn).trigger('click'); // handler เดิมของ script.js เปิดหน้าแก้ไขพร้อมข้อมูลทั้งหมด
        setTimeout(function () {
            $('.backhome').data('target', '.postponed');
            $('#timestart').val('');
            $('#timeend').val('');
            $('#timevalue').val('');
            $('.nights').empty();
            window.scrollTo(0, 0);
            Swal.fire({ icon: 'info', title: 'เลือกวันเข้าพักใหม่', text: 'ใส่วันเข้า-ออกและราคาต่อคืนใหม่ แล้วกด "บันทึกการจอง" — ระบบจะออกใบจองใหม่และลงตารางให้', confirmButtonText: 'ตกลง' });
        }, 0);
    }

    $(document).ready(function () {
        var box = document.getElementById('housetable');
        if (box) new MutationObserver(decorateCheckin).observe(box, { childList: true });

        $(document).on('click', '.pp-postpone', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var row = bookingOfCard(this.closest('.card'));
            if (row) askPostpone(row);
        });
        $(document).on('click', '.pp-cancel', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var row = bookingOfCard(this.closest('.card'));
            if (row && window.pailayAskCancel) window.pailayAskCancel(row[0], row[1], row[2], '.checkin');
        });
        $(document).on('click', '.pp-reschedule', function (e) {
            e.preventDefault();
            reschedule(this.getAttribute('data-uid'));
        });

        // getdata() (เรียกทุกครั้งที่เปลี่ยนหน้า/บันทึก) → โหลดรายการเลื่อนใหม่ด้วย
        var origGetdata = window.getdata;
        if (typeof origGetdata === 'function') {
            window.getdata = function () {
                var r = origGetdata.apply(this, arguments);
                loadPostponed();
                return r;
            };
        }
        if (localStorage.getItem('values')) loadPostponed();
    });
})();
