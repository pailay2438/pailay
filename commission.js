/**
 * commission.js — เพิ่มส่วน "ค่าคอม" ในฟอร์มออกใบจอง
 * ---------------------------------------------------------------
 * ไฟล์ใหม่ทั้งไฟล์ โหลดต่อจาก functionlist.js ไม่ได้แก้ script.js เดิม
 *
 * ทำอะไรบ้าง
 *  1. ช่อง "ช่องทางการจอง" (ทั้งบ้านในเครือและนอกเครือ) มีรายการให้เลือก
 *     ดึงจากแท็บ "ตั้งค่า" ในชีทค่าคอม และตรวจว่าต้องเป็นค่าในรายการ
 *  2. เพิ่มกล่อง "ค่าคอม" ก่อนช่องทางการชำระเงิน
 *       - ช่องทางแอดมิน (คอลัมน์ F แท็บตั้งค่า): ติ๊กพนักงานปิดการขาย 1-3 คน + ผู้ออกใบจอง + ค่าคอมแอดมิน (H)
 *       - ช่องทางอื่น (เอเจ้น/OTA/Walk in): กรอกค่าคอมเอเจ้น (G) อย่างเดียว (บังคับ ไม่มีใส่ 0)
 *  3. ตอนกดบันทึก แนบค่าคอมไปกับข้อมูลเดิม
 *  4. ตอนเปิดแก้ไขใบจอง ดึงค่าคอมเดิมมาแสดง
 *     ถ้าเป็นใบจองเก่าที่ลงค่าคอมไว้ใน AppSheet จะซ่อนกล่องและไม่ส่งค่าคอม
 *  5. ใบเสนอราคาไม่มีกล่องค่าคอม
 *  6. ฟอร์มบ้านในเครือมีช่อง "ข้อความลงตารางนายหน้า" (เติม "จอง K.ชื่อผู้จอง" ให้ก่อน แก้ได้)
 *
 * ถ้าไฟล์นี้โหลดไม่ขึ้น ฟอร์มเดิมยังทำงานได้ตามปกติ (แค่ไม่มีค่าคอม)
 */
(function () {
  'use strict';

  var FORM_OUTSIDE_REGISTER = 'ลงทะเบียนบ้านพักนอกเครือ';
  var NO_STAFF = '-';
  var MAX_STAFF = 3;
  var FORMS_NIGHTS = { pool: '#timevalue', out: '#booking_timevalue' };

  var state = {
    channels: [],
    staff: [],
    issuers: [],
    own: [],
    loading: null,
    editUid: '',
    editChannel: null,   // ช่องทางเดิมของใบจองที่เปิดแก้ไข (ข้อมูลเก่าอาจไม่ตรงรายการ)
    editHasRow: true,    // ใบจองที่แก้ไขมีแถวค่าคอมในระบบใหม่หรือไม่
    editHasCal: true,    // ใบจองที่แก้ไขเคยลงตารางผ่านระบบหรือไม่
    calTouched: false    // ผู้ใช้แก้ข้อความลงตารางเองแล้ว (หยุดเติมอัตโนมัติ)
  };

  var FORMS = {
    pool: { form: '#formpoolvilla', channel: '#bookinguser' },
    out:  { form: '#houseoutside',  channel: '#booking_channel' }
  };

  /* ---------------- helpers ---------------- */

  // งานเอเจ้น = ช่องทางที่ไม่อยู่ในรายการช่องทางแอดมิน (ถ้ายังโหลดรายการไม่ได้ ใช้กติกาเดิม)
  function isAgent(ch) {
    ch = String(ch || '').trim();
    if (!state.own.length) return /^\s*agen/i.test(ch);
    return state.own.indexOf(ch) === -1;
  }

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
      '  <div class="col-12 mb-2 comm-staff-wrap">' +
      '    <div class="small mb-1">พนักงานปิดการขาย <span class="text-muted">(เลือกได้สูงสุด ' + MAX_STAFF + ' คน)</span></div>' +
      '    <div class="d-flex flex-wrap gap-2" data-comm="staffbox"></div>' +
      '    <div class="small mt-1 text-primary comm-split"></div>' +
      '  </div>' +
      '  <div class="col-12 col-md-6 mb-1 comm-issuer-wrap">' +
      '    <div class="form-floating">' +
      '      <select class="form-select" data-comm="issuer"></select>' +
      '      <label>ผู้ออกใบจอง</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-6 col-md-6 mb-1 comm-g-wrap">' +
      '    <div class="form-floating">' +
      '      <input class="form-control" type="text" inputmode="decimal" placeholder="ค่าคอมเอเจ้น (G)" data-comm="g">' +
      '      <label>ค่าคอมเอเจ้น (G)</label>' +
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

  /* ---- ข้อความลงตารางนายหน้า (เฉพาะบ้านในเครือ) ---- */

  function calBoxHtml() {
    return '' +
      '<fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm row cal-box">' +
      '  <legend class="float-none w-auto px-3">ลงตารางนายหน้า</legend>' +
      '  <div class="col-12 mb-1 cal-text-wrap">' +
      '    <div class="form-floating">' +
      '      <input class="form-control" type="text" placeholder="ข้อความลงตาราง" data-cal="text">' +
      '      <label>ข้อความลงตาราง (ลงทุกคืนที่พัก)</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="col-12 small text-muted mt-1 cal-hint">ระบบจะลงข้อความนี้ในชีทตารางนายหน้าตามวันที่พัก และแจ้งในกลุ่ม Lark "ใบจอง"</div>' +
      '</fieldset>';
  }

  function calBox() { return $(FORMS.pool.form + ' .cal-box'); }
  function calInput() { return calBox().find('[data-cal="text"]'); }
  function calDefault() {
    var n = String($('#name').val() || '').trim();
    return n ? 'จอง K.' + n : '';
  }
  function calActive() { return !(state.editUid && !state.editHasCal); }

  function calRefresh() {
    var $b = calBox();
    if (!$b.length) return;
    if (!calActive()) {
      $b.find('.cal-text-wrap').hide();
      $b.find('.cal-hint').text('ใบจองนี้ลงตารางนายหน้าด้วยมือ ระบบจะไม่แตะตาราง (แก้ที่ชีทตารางโดยตรง)');
    } else {
      $b.find('.cal-text-wrap').show();
      $b.find('.cal-hint').text('ระบบจะลงข้อความนี้ในชีทตารางนายหน้าตามวันที่พัก และแจ้งในกลุ่ม Lark "ใบจอง"');
      if (!state.calTouched) calInput().val(calDefault());
    }
  }

  function calReset() {
    state.calTouched = false;
    state.editHasCal = true;
    calInput().val('');
    calRefresh();
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
    var $pc = box('pool');
    if ($pc.length && !calBox().length) $pc.before(calBoxHtml());
  }

  function fillOptions() {
    var $dl = $('#comm_channel_list').empty();
    state.channels.forEach(function (c) { $dl.append($('<option>').attr('value', c)); });

    Object.keys(FORMS).forEach(function (kind) {
      var cur = getStaff(kind);
      var $box = field(kind, 'staffbox').empty();
      state.staff.forEach(function (s) { $box.append(chipHtml(s, false)); });
      $box.append(chipHtml(NO_STAFF, true));
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

  /* ---- พนักงานปิดการขาย (ติ๊กได้หลายคน) ---- */

  function chipHtml(name, isNone) {
    var $l = $('<label class="btn btn-sm btn-outline-primary comm-chip"></label>')
      .toggleClass('btn-outline-secondary comm-chip-none', !!isNone)
      .toggleClass('btn-outline-primary', !isNone);
    $l.append($('<input type="checkbox" class="d-none">').val(name));
    $l.append(document.createTextNode(isNone ? 'ไม่มีพนักงาน' : name));
    return $l;
  }

  function chips(kind) { return field(kind, 'staffbox').find('input[type=checkbox]'); }

  // ชื่อที่ติ๊ก เรียงตามลำดับในรายชื่อเสมอ → 'กิมโห + เมล์' ; ไม่มีพนักงาน → '-'
  function getStaff(kind) {
    var picked = chips(kind).filter(':checked').map(function () { return this.value; }).get();
    if (picked.indexOf(NO_STAFF) !== -1) return NO_STAFF;
    return picked.join(' + ');
  }

  function staffCount(kind) {
    var v = getStaff(kind);
    if (!v || v === NO_STAFF) return 0;
    return v.split(' + ').length;
  }

  function setStaff(kind, value) {
    var $box = field(kind, 'staffbox');
    chips(kind).prop('checked', false);
    value = String(value || '').trim();
    if (value) {
      var names = value === NO_STAFF ? [NO_STAFF]
        : value.split('+').map(function (n) { return n.trim(); }).filter(Boolean);
      names.forEach(function (n) {
        var $c = chips(kind).filter(function () { return this.value === n; });
        if (!$c.length) { // ชื่อจากข้อมูลเก่าที่ไม่อยู่ในรายชื่อ
          $box.find('.comm-chip-none').before(chipHtml(n, false));
          $c = chips(kind).filter(function () { return this.value === n; });
        }
        $c.prop('checked', true);
      });
    }
    syncChips(kind);
  }

  function syncChips(kind) {
    var n = staffCount(kind);
    var none = getStaff(kind) === NO_STAFF;
    chips(kind).each(function () {
      var on = this.checked;
      $(this).parent().toggleClass('active', on);
      var lockIt = !on && this.value !== NO_STAFF && n >= MAX_STAFF;
      $(this).prop('disabled', lockIt).parent().toggleClass('disabled', lockIt);
    });
    updateSplit(kind, n, none);
  }

  function updateSplit(kind, n, none) {
    var $s = box(kind).find('.comm-split');
    if (none) { $s.text('ไม่คิดค่าคอมพนักงานสำหรับใบจองนี้'); return; }
    if (!n) { $s.text(''); return; }
    var nights = parseFloat(cleanNum($(FORMS_NIGHTS[kind]).val())) || 0;
    var h = parseFloat(cleanNum(field(kind, 'h').val())) || 0;
    var fmt = function (x) { return (Math.round(x * 100) / 100).toLocaleString('th-TH'); };
    var txt = n === 1 ? 'ได้คนเดียว' : 'แบ่งคนละ 1/' + n;
    if (nights) txt += ' = คนละ ' + fmt(nights / n) + ' คืน';
    if (h) txt += (nights ? ', ' : ' = ') + 'ค่าคอมคนละ ฿' + fmt(h / n);
    $s.text(txt);
  }

  function onChipChange(input) {
    var $box = $(input).closest('[data-comm="staffbox"]');
    var kind = $box.closest('.comm-box').data('comm-kind');
    if (input.checked) {
      if (input.value === NO_STAFF) {
        chips(kind).not(input).prop('checked', false);
      } else {
        chips(kind).filter(function () { return this.value === NO_STAFF; }).prop('checked', false);
      }
    }
    syncChips(kind);
  }

  function resetBox(kind) {
    setStaff(kind, '');
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
    var ch = channelVal(kind);
    var agent = ch ? isAgent(ch) : false;
    $box.find('.comm-g-wrap').toggle(agent);
    $box.find('.comm-staff-wrap, .comm-issuer-wrap, .comm-h-wrap').toggle(!agent);
    $box.find('.comm-hint').text(!ch ? 'เลือกช่องทางการจองก่อน'
      : (agent
        ? 'งานเอเจ้น/ช่องทางภายนอก: กรอกค่าคอมเอเจ้น (ไม่มีให้ใส่ 0) ไม่นับคืนให้พนักงาน และไม่นับค่าออกใบจอง'
        : 'ค่าคอมแอดมิน (H) ใช้คำนวณค่าคอมพนักงานตามเกณฑ์ 25 คืน/เดือน'));
  }

  /* ---------------- data ---------------- */

  function loadOptions() {
    if (state.loading) return state.loading;
    state.loading = api('getcommissionoptions')
      .then(function (res) {
        if (res && res.status === 'success') {
          state.channels = res.channels || [];
          // ชื่อเดี่ยวเท่านั้น (ชื่อคู่แบบเดิมไม่ต้องใช้แล้ว เพราะติ๊กได้หลายคน)
          state.staff = (res.staff || []).filter(function (s) { return s.indexOf('+') === -1; });
          state.issuers = res.issuers || [];
          state.own = res.ownChannels || [];
          fillOptions();
          refreshMode('pool');
          refreshMode('out');
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
    state.calTouched = true; // ตอนแก้ไขไม่เติมอัตโนมัติ ใช้ข้อความเดิม
    calInput().val('');
    api('getcalendar', { uid: uid })
      .then(function (res) {
        if (state.editUid !== uid || !res || res.status !== 'success') return;
        state.editHasCal = !!res.found;
        if (res.found) calInput().val(res.text || '');
        calRefresh();
      })
      .catch(function (err) { console.error('calendar edit', err); });
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
          syncChips('pool');
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

    if (kind === 'pool' && calActive() && !String(calInput().val() || '').trim()) {
      return 'กรุณากรอกข้อความลงตารางนายหน้า';
    }

    if (!boxActive(kind)) return '';

    var g = cleanNum(field(kind, 'g').val());
    var h = cleanNum(field(kind, 'h').val());

    if (isAgent(ch)) {
      if (!g) return 'กรุณากรอกค่าคอมเอเจ้น (ไม่มีให้ใส่ 0)';
      return '';
    }
    var staff = getStaff(kind);
    if (!staff) return 'กรุณาติ๊กพนักงานปิดการขาย (หรือ "ไม่มีพนักงาน")';
    if (!field(kind, 'issuer').val()) return 'กรุณาเลือกผู้ออกใบจอง';
    if (staff !== NO_STAFF && !h) return 'กรุณากรอกค่าคอมแอดมิน (H)';
    return '';
  }

  function payload(kind) {
    var cal = {};
    if (kind === 'pool') {
      cal = calActive() ? { cal_enabled: '1', cal_text: String(calInput().val() || '').trim() }
                        : { cal_enabled: '0' };
    }
    if (!boxActive(kind)) return Object.assign({ comm_enabled: '0' }, cal);
    var agent = isAgent(channelVal(kind));
    return Object.assign(cal, {
      comm_enabled: '1',
      comm_staff: agent ? '' : getStaff(kind),
      comm_g: agent ? cleanNum(field(kind, 'g').val()) : '',
      comm_h: agent ? '' : cleanNum(field(kind, 'h').val()),
      comm_issuer: agent ? '' : (field(kind, 'issuer').val() || '')
    });
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
    $(document).on('focus click', FORMS.pool.channel + ',' + FORMS.out.channel + ',.comm-box select,.comm-box .comm-chip', function () {
      if (!state.channels.length) loadOptions();
    });

    $(document).on('change', '.comm-box [data-comm="staffbox"] input[type=checkbox]', function () { onChipChange(this); });
    $(document).on('input change', '.comm-box [data-comm="h"]', function () {
      var kind = $(this).closest('.comm-box').data('comm-kind'); syncChips(kind);
    });
    $(document).on('input change', FORMS_NIGHTS.pool + ',' + FORMS_NIGHTS.out, function () { syncChips('pool'); syncChips('out'); });

    $(document).on('input', '.cal-box [data-cal="text"]', function () { state.calTouched = true; });
    $(document).on('input change', '#name', function () { if (!state.calTouched && calActive()) calInput().val(calDefault()); });

    $(document).on('input change', FORMS.pool.channel, function () { refreshMode('pool'); });
    $(document).on('input change', FORMS.out.channel, function () { refreshMode('out'); });

    // เปิดฟอร์มจองใหม่ (เลือกบ้าน) → ล้างกล่องค่าคอม
    $(document).on('click', '.card-row', function () {
      state.editUid = '';
      state.editChannel = null;
      state.editHasRow = true;
      resetBox('pool');
      calReset();
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
        calReset();
      }
    });

    // สลับระหว่าง ลงทะเบียนบ้านนอกเครือ / ใบเสนอราคา
    watchText('#formtype', function () {
      resetBox('out');
      if (outsideActive() && !state.channels.length) loadOptions();
    });

    refreshMode('pool');
    refreshMode('out');
    calRefresh();

    // จำนวนคืนถูกคำนวณโดย script.js เดิม (ไม่มี event) → อัปเดตบรรทัดสรุปการแบ่งทุก 1 วินาที
    setInterval(function () {
      ['pool', 'out'].forEach(function (k) { if (box(k).is(':visible')) syncChips(k); });
    }, 1000);
  });
})();
