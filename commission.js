/**
 * commission.js — เพิ่มส่วน "ค่าคอม" ในฟอร์มออกใบจอง
 * ---------------------------------------------------------------
 * ไฟล์ใหม่ทั้งไฟล์ โหลดต่อจาก functionlist.js ไม่ได้แก้ script.js เดิม
 *
 * ทำอะไรบ้าง
 *  1. ช่อง "ช่องทางการจอง" (ทั้งบ้านในเครือและนอกเครือ) มีรายการให้เลือก
 *     ดึงจากแท็บ "ตั้งค่า" ในชีทค่าคอม และตรวจว่าต้องเป็นค่าในรายการ
 *  2. เพิ่มกล่อง "ค่าคอม" ก่อนช่องทางการชำระเงิน
 *       - ช่องทางของเรา: เลือกพนักงานปิดการขาย + ค่าคอม Agent (G, ไม่บังคับ) + ค่าคอมแอดมิน (H)
 *       - ช่องทาง Agent: กรอกค่าคอม Agent (G) อย่างเดียว ไม่ต้องเลือกพนักงาน
 *       - ผู้ออกใบจอง: เลือกจากรายชื่อ (เลือกชื่อคนที่ล็อกอินไว้ให้ก่อนถ้าตรงกัน)
 *  3. ตอนกดบันทึก แนบค่าคอมไปกับข้อมูลเดิม
 *  4. ตอนเปิดแก้ไขใบจอง ดึงค่าคอมเดิมมาแสดง
 *     ถ้าเป็นใบจองเก่าที่ลงค่าคอมไว้ใน AppSheet จะซ่อนกล่องและไม่ส่งค่าคอม
 *  5. ใบเสนอราคาไม่มีกล่องค่าคอม
 *
 * ถ้าไฟล์นี้โหลดไม่ขึ้น ฟอร์มเดิมยังทำงานได้ตามปกติ (แค่ไม่มีค่าคอม)
 */
(function () {
  'use strict';

  var FORM_OUTSIDE_REGISTER = 'ลงทะเบียนบ้านพักนอกเครือ';
  var NO_STAFF = '-';

  var state = {
    channels: [],
    staff: [],
    issuers: [],
    loading: null,
    editUid: '',
    editChannel: null,   // ช่องทางเดิมของใบจองที่เปิดแก้ไข (ข้อมูลเก่าอาจไม่ตรงรายการ)
    editHasRow: true     // ใบจองที่แก้ไขมีแถวค่าคอมในระบบใหม่หรือไม่
  };

  var FORMS = {
    pool: { form: '#formpoolvilla', channel: '#bookinguser' },
    out:  { form: '#houseoutside',  channel: '#booking_channel' }
  };

  /* ---------------- helpers ---------------- */

  function isAgent(ch) { return /^\s*agen/i.test(ch || ''); }

  function cleanNum(v) { return String(v || '').replace(/[^0-9.]/g, ''); }

  function api(opt, data) {
    var body = new URLSearchParams(Object.assign({ opt: opt }, data || {}));
    return fetch(scriptUrl, {
      method: 'POST',
      body: body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).then(function (r) { return r.json(); });
  }

  function box(kind) { return $(FORMS[kind].form + ' .comm-box'); }
  function field(kind, name) { return box(kind).find('[data-comm="' + name + '"]'); }
  function channelVal(kind) { return String($(FORMS[kind].channel).val() || '').trim(); }

  function outsideActive() {
    return String($('#formtype').text() || '').trim() === FORM_OUTSIDE_REGISTER;
  }

  function boxActive(kind) {
    if (kind === 'out') return outsideActive();
    return !(state.editUid && !state.editHasRow);
  }

  /* ---------------- UI ---------------- */

  function boxHtml(kind) {
    return '' +
      '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row comm-box" data-comm-kind="' + kind + '">' +
      '  <legend class="float-none w-auto px-3">ค่าคอม</legend>' +
      '  <div class="col-12 col-md-6 mb-1 comm-staff-wrap">' +
      '    <div class="form-floating">' +
      '      <select class="form-select" data-comm="staff"></select>' +
      '      <label>พนักงานปิดการขาย</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-12 col-md-6 mb-1 comm-issuer-wrap">' +
      '    <div class="form-floating">' +
      '      <select class="form-select" data-comm="issuer"></select>' +
      '      <label>ผู้ออกใบจอง</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-6 col-md-6 mb-1 comm-g-wrap">' +
      '    <div class="form-floating">' +
      '      <input class="form-control" type="text" inputmode="decimal" placeholder="ค่าคอม Agent (G)" data-comm="g">' +
      '      <label>ค่าคอม Agent (G)</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-6 col-md-6 mb-1 comm-h-wrap">' +
      '    <div class="form-floating">' +
      '      <input class="form-control" type="text" inputmode="decimal" placeholder="ค่าคอมแอดมิน (H)" data-comm="h">' +
      '      <label>ค่าคอมแอดมิน (H)</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-12 small text-muted mt-1 comm-hint"></div>' +
      '</fieldset>';
  }

  function injectBoxes() {
    Object.keys(FORMS).forEach(function (kind) {
      var $form = $(FORMS[kind].form);
      if (!$form.length || $form.find('.comm-box').length) return;
      var $payment = $form.find('fieldset.payment').first();
      if ($payment.length) $payment.before(boxHtml(kind));
      else $form.find('.savepool, .savehouseoutside').closest('div').before(boxHtml(kind));
      // ช่องทางการจองใช้รายการเดียวกัน
      $(FORMS[kind].channel).attr('list', 'comm_channel_list').attr('autocomplete', 'off');
    });
    if (!$('#comm_channel_list').length) $('body').append('<datalist id="comm_channel_list"></datalist>');
  }

  function fillOptions() {
    var $dl = $('#comm_channel_list').empty();
    state.channels.forEach(function (c) { $dl.append($('<option>').attr('value', c)); });

    Object.keys(FORMS).forEach(function (kind) {
      var $sel = field(kind, 'staff');
      var cur = $sel.val();
      $sel.empty()
        .append('<option value="" selected disabled>เลือกพนักงานปิดการขาย</option>');
      state.staff.forEach(function (s) { $sel.append($('<option>').val(s).text(s)); });
      $sel.append($('<option>').val(NO_STAFF).text('ไม่มี (ไม่คิดค่าคอมพนักงาน)'));
      if (cur) setStaff(kind, cur);

      var $iss = field(kind, 'issuer');
      var curIss = $iss.val();
      $iss.empty().append('<option value="" selected disabled>เลือกผู้ออกใบจอง</option>');
      state.issuers.forEach(function (s) { $iss.append($('<option>').val(s).text(s)); });
      setIssuer(kind, curIss || defaultIssuer());
    });
  }

  function defaultIssuer() {
    var me = String(localStorage.getItem('name') || '').trim();
    return state.issuers.indexOf(me) !== -1 ? me : '';
  }

  function setIssuer(kind, value) {
    var $sel = field(kind, 'issuer');
    value = String(value || '').trim();
    if (!value) { $sel.prop('selectedIndex', 0); return; }
    if (!$sel.find('option').filter(function () { return this.value === value; }).length) {
      $sel.append($('<option>').val(value).text(value)); // ชื่อจากข้อมูลเก่า
    }
    $sel.val(value);
  }

  function setStaff(kind, value) {
    var $sel = field(kind, 'staff');
    value = String(value || '').trim();
    if (!value) { $sel.prop('selectedIndex', 0); return; }
    if (!$sel.find('option').filter(function () { return this.value === value; }).length) {
      $sel.append($('<option>').val(value).text(value)); // ชื่อจากข้อมูลเก่า
    }
    $sel.val(value);
  }

  function resetBox(kind) {
    field(kind, 'staff').prop('selectedIndex', 0);
    field(kind, 'g').val('');
    field(kind, 'h').val('');
    setIssuer(kind, defaultIssuer());
    refreshMode(kind);
  }

  function refreshMode(kind) {
    var $box = box(kind);
    if (!$box.length) return;

    if (!boxActive(kind)) {
      if (kind === 'pool' && state.editUid && !state.editHasRow) {
        $box.show();
        $box.find('.comm-staff-wrap, .comm-issuer-wrap, .comm-g-wrap, .comm-h-wrap').hide();
        $box.find('.comm-hint').text('ใบจองนี้ลงค่าคอมไว้ในระบบเดิม (AppSheet) แก้ค่าคอมได้ที่ชีทค่าคอมโดยตรง');
      } else {
        $box.hide();
      }
      return;
    }

    $box.show();
    var agent = isAgent(channelVal(kind));
    $box.find('.comm-g-wrap, .comm-issuer-wrap').show();
    $box.find('.comm-staff-wrap, .comm-h-wrap').toggle(!agent);
    $box.find('.comm-hint').text(agent
      ? 'งาน Agent: กรอกค่าคอมที่ต้องจ่าย Agent ไม่นับคืนให้พนักงาน'
      : 'ค่าคอมแอดมิน (H) ใช้คำนวณค่าคอมพนักงานตามเกณฑ์ 25 คืน/เดือน ค่าคอม Agent (G) ไม่บังคับ');
  }

  /* ---------------- data ---------------- */

  function loadOptions() {
    if (state.loading) return state.loading;
    state.loading = api('getcommissionoptions')
      .then(function (res) {
        if (res && res.status === 'success') {
          state.channels = res.channels || [];
          state.staff = res.staff || [];
          state.issuers = res.issuers || [];
          fillOptions();
        } else {
          state.loading = null;
        }
      })
      .catch(function (err) { console.error('commission options', err); state.loading = null; });
    return state.loading;
  }

  function loadForEdit(uid) {
    state.editUid = uid;
    state.editHasRow = true;
    state.editChannel = channelVal('pool');
    resetBox('pool');
    api('getcommission', { uid: uid })
      .then(function (res) {
        if (state.editUid !== uid) return; // เปลี่ยนใบจองไปแล้ว
        if (!res || res.status !== 'success') return;
        state.editHasRow = !!res.found;
        if (res.found) {
          setStaff('pool', isAgent(res.channel) ? '' : (res.staff || NO_STAFF));
          field('pool', 'g').val(res.g === '' ? '' : res.g);
          field('pool', 'h').val(res.h === '' ? '' : res.h);
          setIssuer('pool', res.issuer || '');
        }
        refreshMode('pool');
      })
      .catch(function (err) { console.error('commission edit', err); });
  }

  /* ---------------- validate + payload ---------------- */

  function validate(kind) {
    var ch = channelVal(kind);
    if (!ch) return 'กรุณาเลือกช่องทางการจอง';

    var keepOld = kind === 'pool' && state.editUid && ch === state.editChannel;
    if (state.channels.length && state.channels.indexOf(ch) === -1 && !keepOld) {
      return 'ช่องทางการจองต้องเลือกจากรายการ (ถ้าไม่มี ให้เพิ่มในแท็บตั้งค่าของชีทค่าคอมก่อน)';
    }

    if (!boxActive(kind)) return '';

    var g = cleanNum(field(kind, 'g').val());
    var h = cleanNum(field(kind, 'h').val());

    if (isAgent(ch)) {
      if (!g) return 'กรุณากรอกค่าคอม Agent (G)';
      return '';
    }
    var staff = field(kind, 'staff').val();
    if (!staff) return 'กรุณาเลือกพนักงานปิดการขาย';
    if (!field(kind, 'issuer').val()) return 'กรุณาเลือกผู้ออกใบจอง';
    if (staff !== NO_STAFF && !h) return 'กรุณากรอกค่าคอมแอดมิน (H)';
    return '';
  }

  function payload(kind) {
    if (!boxActive(kind)) return { comm_enabled: '0' };
    var agent = isAgent(channelVal(kind));
    return {
      comm_enabled: '1',
      comm_staff: agent ? '' : (field(kind, 'staff').val() || ''),
      comm_g: cleanNum(field(kind, 'g').val()),
      comm_h: agent ? '' : cleanNum(field(kind, 'h').val()),
      comm_issuer: field(kind, 'issuer').val() || ''
    };
  }

  // ตรวจก่อน handler เดิมของปุ่มบันทึก (capture phase ทำงานก่อน jQuery)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.savepool, .savehouseoutside');
    if (!btn) return;
    var kind = btn.classList.contains('savepool') ? 'pool' : 'out';
    if (kind === 'out' && !outsideActive()) return; // ใบเสนอราคา ไม่ตรวจ
    var err = validate(kind);
    if (err) {
      e.preventDefault();
      e.stopImmediatePropagation();
      Swal.fire({ icon: 'warning', title: err, confirmButtonText: 'ตกลง' });
    }
  }, true);

  // แนบค่าคอมไปกับข้อมูลเดิมก่อนส่งหลังบ้าน
  function wrapSave(fnName, kind) {
    var orig = window[fnName];
    if (typeof orig !== 'function') return;
    window[fnName] = function (itemData) {
      if (kind === 'out' && !outsideActive()) return orig.call(this, itemData);
      return orig.call(this, Object.assign({}, itemData, payload(kind)));
    };
  }

  /* ---------------- events ---------------- */

  function watchText(selector, cb) {
    var el = document.querySelector(selector);
    if (!el) return;
    new MutationObserver(function () { cb(String(el.textContent || '').trim()); })
      .observe(el, { childList: true, characterData: true, subtree: true });
  }

  $(function () {
    injectBoxes();
    fillOptions();
    wrapSave('savepool', 'pool');
    wrapSave('savehouseoutside', 'out');

    if (localStorage.getItem('values')) loadOptions();

    // หลังล็อกอินสำเร็จ หรือเปิดฟอร์ม ถ้ายังไม่มีรายการให้โหลด
    $(document).on('focus click', FORMS.pool.channel + ',' + FORMS.out.channel + ',.comm-box select', function () {
      if (!state.channels.length) loadOptions();
    });

    $(document).on('input change', FORMS.pool.channel, function () { refreshMode('pool'); });
    $(document).on('input change', FORMS.out.channel, function () { refreshMode('out'); });

    // เปิดฟอร์มจองใหม่ (เลือกบ้าน) → ล้างกล่องค่าคอม
    $(document).on('click', '.card-row', function () {
      state.editUid = '';
      state.editChannel = null;
      state.editHasRow = true;
      resetBox('pool');
      if (!state.channels.length) loadOptions();
    });

    // เปิดแก้ไขใบจอง: script.js เดิมใส่ UID ลง #houseedit
    watchText('#houseedit', function (uid) {
      if (uid) {
        loadForEdit(uid);
      } else {
        state.editUid = '';
        state.editChannel = null;
        state.editHasRow = true;
        resetBox('pool');
      }
    });

    // สลับระหว่าง ลงทะเบียนบ้านนอกเครือ / ใบเสนอราคา
    watchText('#formtype', function () {
      resetBox('out');
      if (outsideActive() && !state.channels.length) loadOptions();
    });

    refreshMode('pool');
    refreshMode('out');
  });
})();
