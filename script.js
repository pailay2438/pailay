let pageOptions = [5, 25, 50, 100, 'All']
let currentPage = 1;
let totalPages = 5;

// (function () {
//     function detectDevTools() {
//         let start = performance.now();
//         debugger;
//         let end = performance.now();
//         if (end - start > 100) {
//             localStorage.clear();
//             window.location.href = "https://www.google.com";
//         } else {
//             console.log("DevTools: ปิดอยู่");
//         }
//     }
//     setInterval(detectDevTools, 1000);
// })();

$(document).ready(function () {
    flatpickr("#timestart, #timeend, #booking_timestart, #booking_timeend", {
        dateFormat: "Y-m-d",
        defaultDate: null,
        disableMobile: true
    });
    createlist('#userlistSelect', pageOptions)
    createlist('#houseoutsidelistSelect', pageOptions)
    if (localStorage.getItem('values')) {
        showhidepage('.listpoolvilla,nav')
        getdata()
    } else {
        showhidepage('.login')
    }
    $("#pay_1, #pay_2").on("click", function () {
        if (this.id === "pay_1") {
            typepay("pay_1");
        }
        else if (this.id === "pay_2") {
            typepay("pay_2");
        }
    });

    $('#timestart,#timeend').on('input', function () {
        let startVal = $("#timestart").val();
        let endVal = $("#timeend").val();

        let startDate = new Date(startVal);
        let endDate = new Date(endVal);
        if (endDate < startDate) {
            Swal.fire('วันสิ้นสุดต้องอยู่หลังวันเริ่มต้นเท่านั้น', '', 'error')
            $(this).val('')
            return;
        }
        let diffMs = endDate - startDate;
        let diffDays = diffMs / (1000 * 60 * 60 * 24);
        let nights = Math.ceil(diffDays);
        $("#timevalue").val(nights || 0);
        createNightInputs(nights)
    });

    $('#booking_timestart,#booking_timeend').on('input', function () {
        let startVal = $("#booking_timestart").val();
        let endVal = $("#booking_timeend").val();

        let startDate = new Date(startVal);
        let endDate = new Date(endVal);
        if (endDate < startDate) {
            Swal.fire('วันสิ้นสุดต้องอยู่หลังวันเริ่มต้นเท่านั้น', '', 'error')
            $(this).val('')
            return;
        }
        let diffMs = endDate - startDate;
        let diffDays = diffMs / (1000 * 60 * 60 * 24);
        let nights = Math.ceil(diffDays);
        $("#booking_timevalue").val(nights || 0);
        createNightInputs2(nights)
    });

    $(".nights").on("input", ".night-input", function () {
        sumtotal()
        sumtotalall()
        sumtotalalls()
    });
    $(".nightse").on("input", ".night-inputs", function () {
        calculateTotals()
    });

    $(".nights").on("change", ".night-input", function () {
        formatNumberRealTime($(this));
    });

    $(".nightse").on("change", ".night-inputs", function () {
        formatNumberRealTime($(this));
    });

    $(document).on('input', "#booking_totalbed,#booking_totalanimal,#booking_totalfood,#booking_free_price_4,#booking_free_price_5,#booking_free_price_6,#booking_totalhouse,#booking_paytotal", function () {
        let value = $(this).val();
        value = value.replace(/[^0-9.]/g, '');
        if ((value.match(/\./g) || []).length > 1) {
            value = value.substring(0, value.lastIndexOf('.'));
        }
        let parts = value.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        value = parts.join('.');
        $(this).val(value);
        calculateTotals()
    });

    function calculateTotals() {
        let roomTotal = 0;
        $(".night-inputs").each(function () {
            let val = $(this).val().replace(/,/g, "");
            roomTotal += parseFloat(val) || 0;
        });
        $("#booking_totalroom").val(
            roomTotal.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
        );

        let roomVal = roomTotal;
        let bedVal = parseFloat($("#booking_totalbed").val().replace(/,/g, "")) || 0;
        let qbedVal = parseFloat($("#booking_qbed").val().replace(/,/g, "")) || 0;
        let aniVal = parseFloat($("#booking_totalanimal").val().replace(/,/g, "")) || 0;
        let qaniVal = parseFloat($("#booking_qanimal").val().replace(/,/g, "")) || 0;
        let foodVal = parseFloat($("#booking_totalfood").val().replace(/,/g, "")) || 0;
        let qfoodVal = parseFloat($("#booking_qfood").val().replace(/,/g, "")) || 0;
        let totalhouse = parseFloat($("#booking_totalhouse").val().replace(/,/g, "")) || 0;

        let freefoodVal = parseFloat($("#booking_free_price_4").val().replace(/,/g, "")) || 0;
        let freebedVal = parseFloat($("#booking_free_price_5").val().replace(/,/g, "")) || 0;
        let freeaniVal = parseFloat($("#booking_free_price_6").val().replace(/,/g, "")) || 0;

        let totalFoodCost = foodVal * (qfoodVal - freefoodVal);
        let totalBedCost = bedVal * (qbedVal - freebedVal);
        let totalAniCost = aniVal * (qaniVal - freeaniVal);

        let sumTotalAll = roomVal + totalBedCost + totalAniCost + totalFoodCost + totalhouse;

        $("#booking_totalall").val(
            sumTotalAll.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
        );

        let paytotalInput = $("#booking_paytotal").val() || "";
        paytotalInput = paytotalInput.replace(/,/g, "");
        let paytotal = parseFloat(paytotalInput);
        if (isNaN(paytotal)) {
            paytotal = (typeof totalDeposit !== 'undefined') ? parseFloat(totalDeposit) : 0;
        }
        let overdue = sumTotalAll - paytotal;
        $("#booking_overdue").val(
            overdue.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
        );
    }


    $(document).on("change", "#booking_totalbed,#booking_totalanimal,#booking_totalfood,#booking_totalhouse,#booking_paytotal", function () {
        formatNumberRealTime($(this));
    });


    $(document).on("change", "#totalbed,#totalanimal,#totalfood,#totalhouse,#paytotal", function () {
        formatNumberRealTime($(this));
    });

    $(document).on('input', "#totalbed,#totalanimal,#totalfood,#free_price_4,#free_price_5,#free_price_6,#totalhouse,#paytotal", function () {
        let value = $(this).val();
        value = value.replace(/[^0-9.]/g, '');
        if ((value.match(/\./g) || []).length > 1) {
            value = value.substring(0, value.lastIndexOf('.'));
        }
        let parts = value.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        value = parts.join('.');
        $(this).val(value);
        sumtotalall()
        sumtotalalls()
    });

    $('[id^="free_"]').on('change', function () {
        let index = $(this).attr('id').split('_')[1];
        let $inputCol = $(`#input-col-${index}`);
        if (this.checked) {
            $inputCol.removeClass('d-none');
        } else {
            $inputCol.addClass('d-none');
        }
    });

    $('[id^="booking_free_"]').on('change', function () {
        let index = $(this).attr('id').split('_')[2];
        let $inputCol = $(`#booking_input_col_${index}`);
        if (this.checked) {
            $inputCol.removeClass('d-none');
        } else {
            $inputCol.addClass('d-none');
        }
    });
});

function getdata() {
    setprofile()
    rooms()
    banks()
    dayrooms()
    recordincomes()
    roomlists()
    depositlists()
    houseoutsides()
    foodmenus()
}

let room = []
let bank = []
let dayroom = []
let income = []
let depositlist = []
let houseoutside = []
let foodmenu = []
let roomlistString = localStorage.getItem('roomlist');
let roomlist = roomlistString ? JSON.parse(roomlistString) : [];

function typepay(payType) {
    let container = $(".typepay");
    container.empty();

    let depositExtraContainer = `<div id="deposit-extra"></div>`;

    let html = `
        <div class="col-12 mb-1">
          <div class="form-floating">
            <input class="form-control" type="date" placeholder="วันที่รับเงิน" aria-label="วันที่รับเงิน" id="paydate">
            <label for="paydate">วันที่รับเงิน</label>
          </div>
        </div>
    `;

    if (payType === "pay_2") {
        html += `
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
             <select class="form-select" aria-label="รับเงินผ่านบัญชี" id="paylist" aria-placeholder="บัญชีรับเงิน">
                  <option value="" selected disabled>เลือกบัญชีรับเงิน</option>
             </select>
             <label for="paylist">รับเงินผ่านบัญชี</label>
          </div>
        </div>
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
              <input class="form-control" type="file" id="slip" placeholder="อัพโหลดสลิปโอนเงิน"
                  aria-label="อัพโหลดสลิปโอนเงิน" accept="image/*">
              <label for="slip">อัพโหลดสลิปโอนเงิน</label>
          </div>
        </div>
      `;
    }

    html += `
        <div class="col-12 mb-1">
          <div class="form-floating">
            <input class="form-control" type="text" placeholder="ยอดมัดจำรวม" aria-label="ยอดมัดจำรวม" id="paytotal">
            <label for="paytotal">ยอดมัดจำรวม</label>
          </div>
        </div>
        ${depositExtraContainer}
    `;

    container.append(html);

    if (payType === "pay_2") {
        bank.forEach(function (item) {
            $("#paylist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
    }

    if ($("#deposit1").is(":checked")) {
        $("#deposit-extra").html(`
            <div class="col-12 mb-1">
              <div class="form-floating">
                <input class="form-control" type="text" placeholder="ยอดมัดจำงวดที่ 1" aria-label="ยอดมัดจำงวดที่ 1" id="paytotal1">
                <label for="paytotal1">ยอดมัดจำงวดที่ 1</label>
              </div>
            </div>
            <div class="col-12 mb-1">
              <div class="form-floating">
                <input class="form-control" type="text" placeholder="ยอดมัดจำงวดที่ 2" aria-label="ยอดมัดจำงวดที่ 2" id="paytotal2">
                <label for="paytotal2">ยอดมัดจำงวดที่ 2</label>
              </div>
            </div>
        `);
    }
}

$(document).on("click", "#deposit1, #deposit2", function () {
    if (this.id === "deposit1") {
        $("#deposit-extra").html(`
            <div class="col-12 mb-1">
              <div class="form-floating">
                <input class="form-control" type="text" placeholder="ยอดมัดจำงวดที่ 1" aria-label="ยอดมัดจำงวดที่ 1" id="paytotal1">
                <label for="paytotal1">ยอดมัดจำงวดที่ 1</label>
              </div>
            </div>
            <div class="col-12 mb-1">
              <div class="form-floating">
                <input class="form-control" type="text" placeholder="ยอดมัดจำงวดที่ 2" aria-label="ยอดมัดจำงวดที่ 2" id="paytotal2">
                <label for="paytotal2">ยอดมัดจำงวดที่ 2</label>
              </div>
            </div>
        `);
    } else if (this.id === "deposit2") {
        $("#deposit-extra").empty();
    }
});

$("#pay_11, #pay_22").on("click", function () {
    if (this.id === "pay_11") {
        typepay2("pay_11");
    }
    else if (this.id === "pay_22") {
        typepay2("pay_22");
    }
});

function typepay2(payType) {
    let container = $(".typepay2");
    container.empty();

    let html = `
        <div class="col-12 mb-1">
          <div class="form-floating">
            <input class="form-control" type="date" placeholder="วันที่รับเงิน" aria-label="วันที่รับเงิน" id="paydate">
            <label for="paydate">วันที่รับเงิน</label>
          </div>
        </div>
    `;

    if (payType === "pay_22") {
        html += `
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
             <select class="form-select" aria-label="รับเงินผ่านบัญชี" id="paylist" aria-placeholder="บัญชีรับเงิน">
                  <option value="" selected disabled>เลือกบัญชีรับเงิน</option>
             </select>
             <label for="paylist">รับเงินผ่านบัญชี</label>
          </div>
        </div>
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
              <input class="form-control" type="file" id="slip" placeholder="อัพโหลดสลิปโอนเงิน"
                  aria-label="อัพโหลดสลิปโอนเงิน" accept="image/*">
              <label for="slip">อัพโหลดสลิปโอนเงิน</label>
          </div>
        </div>
      `;
    }
    container.append(html);

    if (payType === "pay_22") {
        bank.forEach(function (item) {
            $("#paylist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
    }
}

let totalDeposit

function sumtotalalls() {
    let totalallVal = $("#totalall").val() || "";
    let totalall = parseFloat(totalallVal.replace(/,/g, "")) || 0;
    let paytotalInput = $("#paytotal").val() || "";
    paytotalInput = paytotalInput.replace(/,/g, "");
    let paytotal = parseFloat(paytotalInput);
    if (isNaN(paytotal)) {
        paytotal = (typeof totalDeposit !== 'undefined') ? parseFloat(totalDeposit) : 0;
    }
    let sum = totalall - paytotal;
    $("#overdue").val(
        sum.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
    );
}


function sumtotalall() {
    let roomVal = parseFloat($("#totalroom").val().replace(/,/g, "")) || 0;
    let bedVal = parseFloat($("#totalbed").val().replace(/,/g, "")) || 0;
    let qbedVal = parseFloat($("#qbed").val().replace(/,/g, "")) || 0;
    let aniVal = parseFloat($("#totalanimal").val().replace(/,/g, "")) || 0;
    let qaniVal = parseFloat($("#qanimal").val().replace(/,/g, "")) || 0;
    let foodVal = parseFloat($("#totalfood").val().replace(/,/g, "")) || 0;
    let qfoodVal = parseFloat($("#qfood").val().replace(/,/g, "")) || 0;
    let totalhouse = parseFloat($("#totalhouse").val().replace(/,/g, "")) || 0;

    let freefoodVal = parseFloat($("#free_price_4").val().replace(/,/g, "")) || 0;
    let freebedVal = parseFloat($("#free_price_5").val().replace(/,/g, "")) || 0;
    let freeaniVal = parseFloat($("#free_price_6").val().replace(/,/g, "")) || 0;

    let totalFoodCost = foodVal * (qfoodVal - freefoodVal);
    let totalbetCost = bedVal * (qbedVal - freebedVal);
    let totalaniCost = aniVal * (qaniVal - freeaniVal);

    let sum = roomVal + bedVal + aniVal + foodVal + totalhouse;
    $("#totalall").val(
        sum.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')
    );
}


function createNightInputs(num) {
    let oldData = {};
    $(".nights .night-input").each(function () {
        oldData[this.id] = $(this).val();
    });
    let container = $(".nights");
    container.empty();
    for (let i = 1; i <= num; i++) {
        let newElement = $(`
        <div class="col-12 col-md-3 mb-1">
          <div class="form-floating">
            <input
              class="form-control night-input"
              type="text"
              placeholder="คืนที่ ${i}"
              aria-label="คืนที่ ${i}"
              id="night_${i}"
            >
            <label for="night_${i}">คืนที่ ${i}</label>
          </div>
        </div>
      `);

        container.append(newElement);
    }
    for (let i = 1; i <= num; i++) {
        if (oldData[`night_${i}`] !== undefined) {
            $(`#night_${i}`).val(oldData[`night_${i}`]);
        }
    }
    sumtotal()
}

function createNightInputs2(num) {
    let oldData = {};
    $(".nightse .night-inputs").each(function () {
        oldData[this.id] = $(this).val();
    });
    let container = $(".nightse");
    container.empty();
    for (let i = 1; i <= num; i++) {
        let newElement = $(`
        <div class="col-12 col-md-3 mb-1">
          <div class="form-floating">
            <input
              class="form-control night-inputs"
              type="text"
              placeholder="คืนที่ ${i}"
              aria-label="คืนที่ ${i}"
              id="night_${i}"
            >
            <label for="night_${i}">คืนที่ ${i}</label>
          </div>
        </div>
      `);

        container.append(newElement);
    }
    for (let i = 1; i <= num; i++) {
        if (oldData[`night_${i}`] !== undefined) {
            $(`#night_${i}`).val(oldData[`night_${i}`]);
        }
    }
    // sumtotal()
}

function sumtotal() {
    let total = 0;
    $(".night-input").each(function () {
        let val = $(this).val().replace(/,/g, "");
        total += parseFloat(val) || 0;
    });
    $("#totalroom").val(total.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,'));
}

function formatNumberRealTime(element) {
    let raw = element.val().replace(/,/g, "");
    let num = parseFloat(raw);
    if (!isNaN(num)) {
        let formatted = num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        element.val(formatted);
    } else {
        element.val("");
    }
}

function setprofile() {
    let name = localStorage.getItem('name')
    let profile = localStorage.getItem('profile')
    let values = localStorage.getItem('values')
    $('#profile').attr('src', profile);
    $('#profilename').text(name)
    $('#profileposition').text(values)
}

function rooms() {
    let ket = "rooms";
    let val = "data1";
    let keyset = ""
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        room = updatedData;
        crehouse(updatedData)
    }, false, extraValue)
        .then(value => {
            room = value;
            crehouse(value)
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function banks() {
    let ket = "bank";
    let val = "data2";
    let keyset = ""
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        bank = updatedData;
    }, false, extraValue)
        .then(value => {
            bank = value;
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function dayrooms() {
    let ket = "dayroom";
    let val = "data3";
    let keyset = ""
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        dayroom = updatedData;
    }, false, extraValue)
        .then(value => {
            dayroom = value;
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function roomlists() {
    let ket = "roomlist";
    let val = "data4";
    let keyset = localStorage.getItem('name')
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        roomlist = updatedData;
        populateTable2(updatedData)
        populateTable22(updatedData)
    }, false, extraValue)
        .then(value => {
            roomlist = value;
            populateTable2(value)
            populateTable22(value)
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function recordincomes() {
    let ket = "recordincome";
    let val = "data5";
    let keyset = localStorage.getItem('name')
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        income = updatedData;
        populateTable(updatedData)
    }, false, extraValue)
        .then(value => {
            income = value;
            populateTable(value)
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function depositlists() {
    let ket = "depositlist";
    let val = "data6";
    let keyset = ""
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        depositlist = updatedData;
    }, false, extraValue)
        .then(value => {
            depositlist = value;
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function houseoutsides() {
    let ket = "houseoutside";
    let val = "data7";
    let keyset = localStorage.getItem('name')
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        houseoutside = updatedData;
        populateTablehouseoutside(updatedData)
    }, false, extraValue)
        .then(value => {
            houseoutside = value;
            populateTablehouseoutside(value)
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

function foodmenus() {
    let ket = "foodmenu";
    let val = "data8";
    let keyset = ""
    let extraValue = "";
    return getdatatable(ket, val, keyset, (updatedData) => {
        foodmenu = updatedData;
        listmenu(updatedData)
    }, false, extraValue)
        .then(value => {
            foodmenu = value;
            listmenu(value)
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

$('.logout').click(function (e) {
    e.preventDefault();
    showhidepage('.login');
    clearLocalStorageExceptDarkMode();
    localStorage.clear()
});

function clearLocalStorageExceptDarkMode() {
    let darkMode = localStorage.getItem('darkMode');
    localStorage.clear();
    if (darkMode !== null) {
        localStorage.setItem('darkMode', darkMode);
    }
}

$('.logins').click(async function (e) {
    e.preventDefault()
    let idform = "login-form"
    let itemData = await getFormData(idform);
    if (!checkvalue(itemData, [])) {
    } else {
        setstatuslogin(itemData)
    }
})

$('.savepool').click(async function (e) {
    e.preventDefault()
    let idform = "formpoolvilla"
    let itemData = await getFormData(idform);
    let house = itemData.houseedit || ""
    let checkval
    if (house) {
        checkval = ['free_price_1', 'free_price_2', 'free_price_3', 'free_price_4', 'free_price_5', 'free_price_6', 'facebook', 'line', 'bookingnote', 'note', 'note2', 'free_1', 'free_2', 'free_3', 'free_4', 'free_5', 'free_6', 'starttime', 'endtime', 'pay_1', 'pay_2', 'deposit1', 'deposit2']
    } else {
        checkval = ['free_price_1', 'free_price_2', 'free_price_3', 'free_price_4', 'free_price_5', 'free_price_6', 'facebook', 'line', 'bookingnote', 'note', 'note2', 'free_1', 'free_2', 'free_3', 'free_4', 'free_5', 'free_6', 'starttime', 'endtime',]
    }
    if (!checkvalue(itemData, checkval)) {
    } else {
        savepool(itemData)
    }
})

$('.savehouseoutside').click(async function (e) {
    e.preventDefault()
    let idform = "houseoutside"
    let itemData = await getFormData(idform);
    let form = $('#formtype').text()
    let checkup
    if (form === 'ลงทะเบียนบ้านพักนอกเครือ') {
        checkup = ['booking_free_price_1', 'booking_free_price_2', 'booking_free_price_3', 'booking_free_price_4', 'booking_free_price_5', 'booking_free_price_6', 'booking_free_1', 'booking_free_2', 'booking_free_3', 'booking_free_4', 'booking_free_5', 'booking_free_6', 'booking_note_summary', 'booking_facebook', 'booking_line', 'booking_note']
    } else {
        checkup = ['booking_free_price_1', 'booking_free_price_2', 'booking_free_price_3', 'booking_free_price_4', 'booking_free_price_5', 'booking_free_price_6', 'booking_free_1', 'booking_free_2', 'booking_free_3', 'booking_free_4', 'booking_free_5', 'booking_free_6', 'booking_note_summary', 'booking_facebook', 'booking_line', 'booking_note', 'booking_pay_1', 'booking_pay_2']
    }
    if (!checkvalue(itemData, checkup)) {
    } else {
        savehouseoutside(itemData)
    }
})

$('.savehouseoutsidedeposit').click(async function (e) {
    e.preventDefault()
    let idform = "houseoutsidedeposit"
    let itemData = await getFormData(idform);
    if (!checkvalue(itemData, [])) {
    } else {
        savehouseoutsidedeposit(itemData)
    }
})

$('.savepaydeposit').click(async function (e) {
    e.preventDefault()
    let idform = "paydeposit"
    let itemData = await getFormData(idform);
    if (!checkvalue(itemData, [])) {
    } else {
        savepaydeposit(itemData)
    }
})

$('.savedeposit').click(async function (e) {
    e.preventDefault()
    let idform = "addsdeposit"
    let itemData = await getFormData(idform);
    if (!checkvalue(itemData, ['minusdeposit', 'totalguides1', 'totalguides2', 'totalguides3'])) {
    } else {
        savedeposit(itemData)
    }
})

$('.savewithdrawal').click(async function (e) {
    e.preventDefault()
    let idform = "withdrawal"
    let itemData = await getFormData(idform);
    if (!checkvalue(itemData, ['note'])) {
    } else {
        savewithdrawal(itemData)
    }
})

$('.saveaddmenus').click(async function (e) {
    e.preventDefault()
    let idform = "addmenus"
    let itemData = await getFormData(idform);
    if (!checkvalue(itemData, [])) {
    } else {
        saveaddmenus(itemData)
    }
})

function setstatuslogin(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'loginform',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.listpoolvilla,nav')
                    localStorage.setItem('profile', res.profile)
                    localStorage.setItem('name', res.name)
                    localStorage.setItem('values', res.values)
                    getdata()
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.login')
                    localStorage.clesr()
                });
            }
        })
        .catch(err => {
            showhidepage('.login')
            localStorage.clesr()
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function savepool(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'savepool',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.listpoolvilla,nav')
                    getdata()
                    clearForm('formpoolvilla')
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.formpoolvilla,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.formpoolvilla,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function savehouseoutside(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'savehouseoutside',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.houseoutside,nav')
                    getdata()
                    clearForm('houseoutside')
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.houseoutside,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.houseoutside,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function savehouseoutsidedeposit(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'savehouseoutsidedeposit',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.houseoutsidelist,nav')
                    getdata()
                    clearForm('houseoutsidedeposit')
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.houseoutsidedeposit,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.houseoutsidedeposit,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function savepaydeposit(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'savepaydeposit',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.revenuelist,nav')
                    getdata()
                    clearForm('paydeposit')
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.paydeposit,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.paydeposit,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function savedeposit(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'savedeposit',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.checkout,nav')
                    getdata()
                    clearForm('addsdeposit')
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.addsdeposit,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.addsdeposit,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function savewithdrawal(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'savewithdrawal',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.checkin,nav')
                    getdata()
                    clearForm('withdrawal')
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.withdrawal,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.withdrawal,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function saveaddmenus(itemData) {
    showhidepage('header');
    let setstatus = {
        opt: 'saveaddmenu',
        ...itemData
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.checkin,nav')
                    getdata()
                    clearForm('withdrawal')
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.withdrawal,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.withdrawal,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function crehouse(dataArray) {
    let $container = $('.cardContainer');
    $container.empty();

    dataArray.forEach((row, index) => {
        let namefull = row[0] || "";
        let name = row[1] || "";
        let image = row[2] || "";

        let newCard = `
        <div class="col-12 col-md-4">
          <div class="card mb-1 shadow position-relative">
            <div class="card-body text-center card-row" data-index="${index}">
              <img src="${image}" alt="house" class="img-fluid mb-0 rounded" style="width: 350px; height: 200px; object-fit: cover;">
              <h5 class="card-title fw-bold d-none d-md-inline">${namefull}</h5>
              <h5 class="card-title fw-bold d-inline d-md-none">${name}</h5>
            </div>
          </div>
        </div>
      `;
        $container.append(newCard);
    });

    $('.card-row').on('click', function () {
        $('#houseedit').text('')
        let addpaytotal = $(".addpaytotal");
        addpaytotal.empty();
        $('.backhome').data('target', '.listpoolvilla');
        totalDeposit = 0;
        const index = $(this).data('index');
        const selectedData = dataArray[index];
        $('.textedit').text(selectedData[0]);
        let starttime = "14:00";
        let endtime = "11:00";
        $("#starttime").val(starttime);
        $("#endtime").val(endtime);

        let disabledRanges = dayroom.filter(function (row) {
            return row[0] === selectedData[0];
        }).map(function (row) {
            return {
                start: new Date(row[1]),
                end: new Date(row[2])
            };
        });

        function getDateWithoutTime(date) {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }

        function isDateDisabled(selectedDate, isEndDate = false) {
            const sDate = getDateWithoutTime(selectedDate);
            return disabledRanges.some(function (range) {
                const startDate = getDateWithoutTime(range.start);
                const endDate = getDateWithoutTime(range.end);
                if (isEndDate) {
                    return sDate > startDate && sDate < endDate;
                }
                return sDate >= startDate && sDate < endDate;
            });
        }

        $("#timestart").off("change").on("change", function () {
            let selectedValue = new Date($(this).val());
            if (isDateDisabled(selectedValue)) {
                Swal.fire('วันที่ที่คุณเลือกอยู่ในช่วงที่ถูกจองไว้แล้ว กรุณาเลือกวันที่อื่น', '', 'error');
                $(".nights").empty();
                $(this).val("");
                $('#timevalue').val("");
            }
        });

        $("#timeend").off("change").on("change", function () {
            let selectedValue = new Date($(this).val());
            if (isDateDisabled(selectedValue, true)) {
                Swal.fire('วันที่ที่คุณเลือกอยู่ในช่วงที่ถูกจองไว้แล้ว กรุณาเลือกวันที่อื่น', '', 'error');
                $(".nights").empty();
                $(this).val("");
                $('#timevalue').val("");
            }
        });

        showhidepage('.formpoolvilla,nav');
        $(".payment").show();
        $('#pdfedti1').val('16');
        $('#pdfedti2').val('700');
    });
}


function getThaiDate(dateStr) {
    let date = new Date(dateStr);
    let utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    let thaiTime = new Date(utcTime + (7 * 60 * 60000));
    return thaiTime;
}


$(document).on("click", '.navigate-button', function (e) {
    e.preventDefault()
    let target = $(this).data('target') + ', nav'
    showhidepage(target)
    getdata()
    removeinvalid()
    if ($(this).data('target') === '.listpoolvilla') {
        clearForm('formpoolvilla')
        let container = $(".typepay");
        container.empty();
        let containers = $(".nights");
        containers.empty();
        $('#pdfedti1').val('16')
        $('#pdfedti2').val('700')
    } else if ($(this).data('target') === '.houseoutside') {
        clearForm('houseoutside')
        let starttime = "14:00";
        let endtime = "11:00";
        $("#booking_starttime").val(starttime);
        $("#booking_endtime").val(endtime);
        $('.formtype').text('ลงทะเบียนบ้านพักนอกเครือ')
        $('.payment').show()
        $('#booking_pdfedti1').val('16')
        $('#booking_pdfedti2').val('700')
        formtypes('ลงทะเบียนบ้านพักนอกเครือ')
    } else if ($(this).data('target') === '.quotation') {
        clearForm('houseoutside')
        let starttime = "14:00";
        let endtime = "11:00";
        $("#booking_starttime").val(starttime);
        $("#booking_endtime").val(endtime);
        $('.formtype').text('ออกใบเสนอราคา')
        $('.payment').hide()
        $('#booking_pdfedti1').val('16')
        $('#booking_pdfedti2').val('700')
        formtypes('ออกใบเสนอราคา')
    }
})

$('#searchuser').on('input', function () {
    currentPage = 1;
    populateTable(income);
});

$('#userlistSelect').on('change', function () {
    let selectedValue = $(this).val();
    totalPages = selectedValue === 'All' ? income.length : parseInt(selectedValue);
    currentPage = 1;
    populateTable(income);
});

$(window).on("resize", function () {
    populateTable(income);
    populateTablehouseoutside(houseoutside);
});

function populateTable(data) {
    let depositData = data.filter(row => row[8] === "แบ่งมัดจำ");

    let idCounts = {};
    depositData.forEach(row => {
        let id = row[1];
        idCounts[id] = (idCounts[id] || 0) + 1;
    });
    let finalData = depositData.filter(row => idCounts[row[1]] === 1);

    let columns = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let cardContainer = $('#usertables');
    cardContainer.empty();

    let searchuserValue = $('#searchuser').val().toLowerCase().trim();
    let filteredData = finalData.filter(row => {
        let dataMatches = row.some(cell => cell && cell.toString().toLowerCase().includes(searchuserValue));
        let matchingRoom = roomlist.find(room => room[0] === row[0]);
        let roomMatches = matchingRoom ? matchingRoom.some(cell => cell && cell.toString().toLowerCase().includes(searchuserValue)) : false;
        return dataMatches || roomMatches;
    });

    let startIndex = (currentPage - 1) * totalPages;
    let endIndex = startIndex + totalPages;
    let pageData = filteredData.slice(startIndex, endIndex);

    pageData.forEach(function (row, idx) {
        let actualIndex = startIndex + idx;
        let newCard = createCardHtml(row, actualIndex, columns);
        cardContainer.append(newCard);
    });

    $('.clickable-card').on('click', function (e) {
        e.preventDefault();
        clearForm('info');
        const rowIndex = $(this).data('row');
        const rowData = finalData[rowIndex];
        let roomDataStr = $(this).attr('data-room');
        let roomData = null;
        if (roomDataStr) {
            try {
                roomData = JSON.parse(roomDataStr);
            } catch (err) {
                console.error("Error parsing roomData JSON:", err);
            }
        }
        showhidepage('.paydeposit,nav')
        $('.idlist').text(roomData[0])
        $('#paydepositadd').val(rowData[10])
    });

    $('.edits').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        clearForm('info');
        const rowIndex = $(this).data('row');
        const rowData = finalData[rowIndex];
        let roomDataStr = $(this).attr('data-room');
        let roomData = null;
        if (roomDataStr) {
            try {
                roomData = JSON.parse(roomDataStr);
            } catch (err) {
                console.error("Error parsing roomData JSON:", err);
            }
        }
        $('.idlist').text(roomData[0])
        $('#paydepositadd').val(rowData[10])
        showhidepage('.paydeposit,nav')
    });


    createPagination('#userlistpage', Math.ceil(filteredData.length / totalPages), currentPage, function (newPage) {
        currentPage = newPage;
        populateTable(data);
    });
}


function createCardHtml(row, rowIndex, columns) {
    let col0Data = row[0] || '';
    let col1Data = row[1] || '';
    let col2Data = row[2] || '';
    let col3Data = row[3] || '';
    let col4Data = row[4] || '';
    let col5Data = row[5] || '';
    let col6Data = row[6] || '';
    let col7Data = row[7] || '';
    let col8Data = row[8] || '';
    let col9Data = row[9] || '';
    let col10Data = row[10] || '';

    let matchingRoom = roomlist.find(room => room[0] === row[1]);
    let roomDataJson = matchingRoom ? JSON.stringify(matchingRoom) : '';

    let imageHTML = '';
    if (typeof col6Data === 'string' && col6Data.startsWith('https://lh3.googleusercontent.com/d/')) {
        imageHTML = `
            <img
                src="${col6Data}"
                alt="Image"
                onerror="this.onerror=null;this.src='';this.closest('.card-content').innerHTML='ไม่ได้ระบุภาพ';"
                class="img-thumbnail"
                style="max-width: 25px; height: auto;"
                onclick="openImagePopup('${col6Data}')"
            />
        `;
    }

    let cardHTML = `
      <div class="card mb-1 shadow-sm clickable-card" data-row="${rowIndex}" data-room='${roomDataJson}'>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            
            <div class="card-content">
              <h5 class="card-title">บ้าน: ${matchingRoom[1] ? matchingRoom[1] : ''}</h5>
              <p class="card-text">ชื่อผู้จอง: ${matchingRoom[2]}</p>
              <p class="card-text">วันที่เข้าพัก: ${checkAndFormatDate(matchingRoom[8])}</p>
              <hr>
              <p class="card-text">ชำระงวดที่ 1</p>
              <p class="card-text">วันที่ชำระ: ${checkAndFormatDate(col3Data)}</p>
              <p class="card-text">ยอดชำระ: ${col9Data} บาท</p>
              <hr>
              <p class="card-text">งวดที่ 2 ค้างชำระอีก : ${col10Data} บาท</p>
            </div>
            
            <div class="d-flex gap-2 align-items-center">
              ${imageHTML ? `<div>${imageHTML}</div>` : ''}
              <button class="btn btn-outline-primary btn-sm edits" data-row="${rowIndex}" data-room='${roomDataJson}'>
                <i class="bi bi-pencil-square"></i> เพิ่มการชำระงวดที่ 2
              </button>
             
            </div>

          </div>
        </div>
      </div>
    `;
    return cardHTML;
}


function checkAndFormatDate(cellData) {
    if (typeof cellData === 'string') {
        if ((cellData.includes('T') && cellData.includes('Z')) || cellData.includes('GMT')) {
            return formatDate(cellData);
        }
    }
    return cellData;
}

function openImagePopup(imageUrl) {
    Swal.fire({
        title: '<strong>สลิปโอนเงิน</strong>',
        html: `<img src="${imageUrl}" alt="Image" style="max-width: 100%; border-radius: 10px;"/>`,
        background: '#f7f9fc',
        showCloseButton: true,
        focusConfirm: false,
        confirmButtonColor: '#007bff',
        confirmButtonText: 'ปิดหน้าต่าง'
    });
}

$('#searchhouse').on('input', function () {
    populateTable2(roomlist);
});

function populateTable2(data) {
    let columns = [0, 1, 2, 8, 9, 10, 30, 31, 32, 33, 34];
    let cardContainer = $('#housetable');
    cardContainer.empty();

    let depositData = data
        .map((row, index) => ({ row, originalIndex: index }))
        .filter(item => item.row[30] === "ครบแล้ว" && item.row[32] === "" && item.row[36] === "");
    let searchuserValue = $('#searchhouse').val().toLowerCase().trim();
    let filteredData = depositData.filter(item => {
        return item.row.some(cell => cell && cell.toString().toLowerCase().includes(searchuserValue));
    });

    filteredData.forEach(function (item) {
        let newCardHtml = createCardHtml2(item.row, item.originalIndex, columns);
        let $newCard = $(newCardHtml);

        $newCard.find('.genpdf1, .genpdf2, .checkinstatus, .editinfo, .completework, .adddeposit, .foodmenubutton, .checkoutstatus')
            .attr('data-row', item.originalIndex);

        $newCard.find('.checkins, .checkouts, .pdfcheckin, .pdfcheckout, .complete').hide();
        if (item.row[32] === "checkin" && item.row[33] === "") {
            $newCard.find('.checkins').hide();
            $newCard.find('.checkouts').show();
        } else if (item.row[32] === "" && item.row[33] === "") {
            $newCard.find('.checkins').show();
            $newCard.find('.checkouts').hide();
        } else if (item.row[32] !== "" && item.row[33] !== "") {
            $newCard.find('.checkins, .checkouts').hide();
            $newCard.find('.complete').show();
        }
        if (item.row[34] == "") {
            $newCard.find('.pdfcheckin').hide();
        } else {
            $newCard.find('.pdfcheckin').show();
        }
        if (item.row[35] == "") {
            $newCard.find('.pdfcheckout').hide();
        } else {
            $newCard.find('.pdfcheckout').show();
        }
        cardContainer.append($newCard);
    });

    $('.completework').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        Swal.fire({
            title: 'ยืนยันจบงานใช่ไหม ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#009900',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, จบงาน!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                showhidepage('header');
                let setstatus = {
                    opt: 'completework',
                    id: rowData[0],
                };
                fetch(scriptUrl, {
                    method: "POST",
                    body: new URLSearchParams(setstatus),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
                    .then(response => response.json())
                    .then(res => {
                        if (res.status === 'success') {
                            Swal.fire({
                                title: res.message,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                showhidepage('.checkin,nav');
                                getdata();
                            });
                        } else if (res.status === "error") {
                            Swal.fire({
                                icon: 'error',
                                title: res.message,
                                allowOutsideClick: false,
                                confirmButtonText: 'ตกลง',
                            }).then(() => {
                                showhidepage('.checkin,nav');
                            });
                        }
                    })
                    .catch(err => {
                        showhidepage('.checkin,nav');
                        console.error(err);
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                            allowOutsideClick: false,
                            confirmButtonText: 'ตกลง',
                        });
                    });
            }
        });
    });

    $('.editinfo').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        let container = $(".typepay");
        container.empty();
        $('.backhome').data('target', '.checkin');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        let matchingRoom = income.filter(room => room[1] === rowData[0]);
        totalDeposit = matchingRoom
            .filter(room => room[7].includes("มัดจำงวดที่"))
            .reduce((sum, room) => sum + Number(room[4]), 0);

        $(".payment").hide();
        $('.houseedit').text(rowData[0]);
        showhidepage('.formpoolvilla, nav');
        $(".textedit").text(rowData[1]);
        $("#name").val(rowData[2]);
        $("#tel").val(rowData[3]);
        $("#facebook").val(rowData[4]);
        $("#line").val(rowData[5]);
        $("#bookinguser").val(rowData[6]);
        $("#bookingnote").val(rowData[7]);
        $("#timestart").val(new Date(rowData[8]).toISOString().split('T')[0]);
        $("#starttime").val(new Date(rowData[8]).toLocaleTimeString('en-GB', {hour: '2-digit',minute: '2-digit',hour12: false}));
        $("#timeend").val(new Date(rowData[9]).toISOString().split('T')[0]);
        $("#endtime").val(new Date(rowData[9]).toLocaleTimeString('en-GB', {hour: '2-digit',minute: '2-digit',hour12: false}));
        $("#timevalue").val(rowData[10]);
        createNightInputs(rowData[10]);
        let valroom = rowData[11].split('|');
        $(".night-input").each(function (index) {
            if (valroom[index] !== undefined) {
                $(this).val(valroom[index]);
            }
        });
        $("#quser").val(rowData[12]);
        $("#qroom").val(rowData[13]);
        $("#qbed").val(rowData[14]);
        $("#tfood").val(rowData[15]);
        $("#qfood").val(rowData[16]);
        $("#tanimal").val(rowData[17]);
        $("#qanimal").val(rowData[18]);
        $("#totalroom").val(rowData[19]);
        $("#totalfood").val(rowData[20]);
        $("#totalbed").val(rowData[21]);
        $("#totalanimal").val(rowData[22]);
        let freeItems = rowData[23].split('|');
        $(".btn-check").prop("checked", false);
        $(".form-floating.d-none").addClass("d-none");
        freeItems.forEach(item => {
            let parts = item.split(" ");
            let name = parts[0];
            let amount = parts[1] || "";
            switch (name) {
                case "น้ำแข็ง":
                    $("#free_1").prop("checked", true);
                    $("#free_price_1").val(amount).parent().removeClass("d-none");
                    break;
                case "น้ำดื่ม":
                    $("#free_2").prop("checked", true);
                    $("#free_price_2").val(amount).parent().removeClass("d-none");
                    break;
                case "ถ่านปิ่งย่าง":
                    $("#free_3").prop("checked", true);
                    $("#free_price_3").val(amount).parent().removeClass("d-none");
                    break;
                case "อาหารเช้า":
                    $("#free_4").prop("checked", true);
                    $("#free_price_4").val(amount).parent().removeClass("d-none");
                    break;
                case "ที่นอนเสริม":
                    $("#free_5").prop("checked", true);
                    $("#free_price_5").val(amount).parent().removeClass("d-none");
                    break;
                case "สัตว์เลี้ยง":
                    $("#free_6").prop("checked", true);
                    $("#free_price_6").val(amount).parent().removeClass("d-none");
                    break;
            }
        });
        $("#totalhouse").val(rowData[24]);
        $("#totalall").val(rowData[25]);
        $("#overdue").val(rowData[26]);
        $("#note").val(rowData[27]);
        $("#pdfedti1").val(rowData[28]);
        $("#pdfedti2").val(rowData[29]);
        let addpaytotal = $(".addpaytotal");
          addpaytotal.empty();
          let newElement = $(`<div class="col-12 mb-1">
            <div class="form-floating">
              <input class="form-control" type="text" placeholder="ยอดมัดจำรวม" aria-label="ยอดมัดจำรวม" id="paytotal" disabled>
              <label for="paytotal">ยอดมัดจำรวม</label>
            </div>
          </div>
          `)
          addpaytotal.append(newElement);
      let money = parseFloat(rowData[25]) - parseFloat(rowData[26])
        $('#paytotal').val(money)
    });

    $('.checkinstatus').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlists').text(rowData[0]);
        showhidepage('.addsdeposit,nav');
        $("#depositlist").find("option:not([data-default])").remove();
        depositlist.forEach(function (item) {
            $("#depositlist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
        $(".typepay3").empty();
        $('#depositlist').val('checkin');
        let guide = parseFloat(rowData[24])
        let guide2 = parseFloat(rowData[26])
        let value = guide2 - guide
        $('#totalguides1').val(value)
        $('#totalguides2').val(rowData[24])
        $('#totalguides3').val(rowData[26])
    });

    $('.adddeposit').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.backhome').data('target', '.checkin');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlists').text(rowData[0]);
        showhidepage('.addsdeposit,nav');
        $("#depositlist").find("option:not([data-default])").remove();
        depositlist.forEach(function (item) {
            $("#depositlist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
        $(".typepay3").empty();
    });

    $('.foodmenubutton').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.backhome').data('target', '.checkin');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlist').text(rowData[0]);
        $('.namehouse').text(rowData[1]);
        showhidepage('.foodmenu,nav');
    });

    $('.checkoutstatus').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.backhome').data('target', '.checkout');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlists').text(rowData[0]);
        $('#disval').val(rowData[24]);
        showhidepage('.withdrawal,nav');
        $(".typepay4").empty();
    });

    $('.viewpdf1').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        const pdfUrl = rowData[34];
        const fileId = pdfUrl.split('id=')[1];
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        const downloadUrl = `https://drive.google.com/file/d/${fileId}/view`;
        $('#linkpdf').attr('src', embedUrl);
        $('#previewModal').modal('show');
        const modal = $('#previewModal');
        modal.find('.openPdfInNewWindow').off('click').on('click', function () {
            window.open(downloadUrl, '_blank');
        });
    });

    $('.viewpdf2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        const pdfUrl = rowData[35];
        const fileId = pdfUrl.split('id=')[1];
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        const downloadUrl = `https://drive.google.com/file/d/${fileId}/view`;
        $('#linkpdf').attr('src', embedUrl);
        $('#previewModal').modal('show');
        const modal = $('#previewModal');
        modal.find('.openPdfInNewWindow').off('click').on('click', function () {
            window.open(downloadUrl, '_blank');
        });
    });

    $('.genpdf1').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        Swal.fire({
            title: 'สร้าง PDF Check In ใหม่ใช่ไหม?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#009900',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, สร้างใหม่!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                showhidepage('header');
                let setstatus = {
                    opt: 'genpdfcheckin',
                    id: rowData[0],
                    house: rowData[1],
                    status: rowData[31],
                };
                fetch(scriptUrl, {
                    method: "POST",
                    body: new URLSearchParams(setstatus),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
                    .then(response => response.json())
                    .then(res => {
                        if (res.status === 'success') {
                            Swal.fire({
                                title: res.message,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                showhidepage('.checkin,nav');
                                getdata();
                            });
                        } else if (res.status === "error") {
                            Swal.fire({
                                icon: 'error',
                                title: res.message,
                                allowOutsideClick: false,
                                confirmButtonText: 'ตกลง',
                            }).then(() => {
                                showhidepage('.checkin,nav');
                            });
                        }
                    })
                    .catch(err => {
                        showhidepage('.checkin,nav');
                        console.error(err);
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                            allowOutsideClick: false,
                            confirmButtonText: 'ตกลง',
                        });
                    });
            }
        });
    });

    $('.genpdf2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        Swal.fire({
            title: 'สร้าง PDF Check Out ใหม่ใช่ไหม?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#009900',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, สร้างใหม่!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                showhidepage('header');
                let setstatus = {
                    opt: 'genpdfcheckout',
                    id: rowData[0],
                    house: "PDF Checkout",
                    status: rowData[31],
                };
                fetch(scriptUrl, {
                    method: "POST",
                    body: new URLSearchParams(setstatus),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
                    .then(response => response.json())
                    .then(res => {
                        if (res.status === 'success') {
                            Swal.fire({
                                title: res.message,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                showhidepage('.checkin,nav');
                                getdata();
                            });
                        } else if (res.status === "error") {
                            Swal.fire({
                                icon: 'error',
                                title: res.message,
                                allowOutsideClick: false,
                                confirmButtonText: 'ตกลง',
                            }).then(() => {
                                showhidepage('.checkin,nav');
                            });
                        }
                    })
                    .catch(err => {
                        showhidepage('.checkin,nav');
                        console.error(err);
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                            allowOutsideClick: false,
                            confirmButtonText: 'ตกลง',
                        });
                    });
            }
        });
    });
}


function createCardHtml2(row, rowIndex, columns) {
    let cardHTML = `
     <div class="col-md-4 col-12 mb-1">
        <div class="card mb-1 shadow-sm">
            <div class="card-body">
                <div class="row">
                    <div class="col-6 mb-1 checkins">
                        <button class="btn btn-outline-warning btn-sm editinfo w-100" data-row="${rowIndex}">
                            <i class="bi bi-pencil-square"></i> แก้ไขข้อมูล
                        </button>
                    </div>
                    <div class="col-6 mb-1 checkins">
                        <button class="btn btn-outline-success btn-sm checkinstatus w-100" data-row="${rowIndex}">
                            <i class="bi bi-check-circle-fill"></i> Check In
                        </button>
                    </div>
                    <div class="col-4 mb-1 checkouts">
                        <button class="btn btn-outline-warning btn-sm adddeposit w-100" data-row="${rowIndex}">
                            <i class="bi bi-cash-coin"></i> เพิ่มรายรับ
                        </button>
                    </div>
                    <div class="col-4 mb-1 checkouts">
                        <button class="btn btn-outline-primary btn-sm foodmenubutton w-100" data-row="${rowIndex}">
                            <i class="bi bi-cash-coin"></i> สั่งอาหาร
                        </button>
                    </div>
                   <div class="col-4 mb-1 checkouts">
                        <button class="btn btn-outline-danger btn-sm checkoutstatus w-100" data-row="${rowIndex}">
                            <i class="bi bi-cash-coin"></i> Check Out
                        </button>
                    </div>
                    <div class="col-12 mb-1 complete">
                        <button class="btn btn-outline-info btn-sm completework w-100" data-row="${rowIndex}">
                            <i class="bi bi-bookmark-check-fill"></i> Complete
                        </button>
                    </div>
                </div>
                <hr>
                <div class="card-content">
                    <h5 class="card-title">บ้าน: ${row[1]}</h5>
                    <p class="card-text">ชื่อผู้จอง: ${row[2]}</p>
                    <hr>
                    <p class="card-text">วันที่ Check in: ${checkAndFormatDate(row[8])}</p>
                    <p class="card-text">วันที่ Check Out: ${checkAndFormatDate(row[9])}</p>
                </div>
                <hr>
                <div class="row">
                    <div class="col mb-1 pdfcheckin">
                        <button class="btn btn-outline-info btn-sm w-100 h-100 viewpdf1" data-row="${rowIndex}">
                            <i class="bi bi-filetype-pdf"></i> View PDF Check In
                        </button>
                    </div>
                    <div class="col mb-1 pdfcheckout">
                        <button class="btn btn-outline-info btn-sm w-100 h-100 viewpdf2" data-row="${rowIndex}">
                            <i class="bi bi-filetype-pdf"></i> View PDF Check Out
                        </button>
                    </div>
                </div>
                <hr>
                <div class="row">
                    <div class="col mb-1">
                        <button class="btn btn-outline-success btn-sm w-100 h-100 genpdf1" data-row="${rowIndex}">
                            <i class="bi bi-file-earmark-plus-fill"></i> New PDF Check In
                        </button>
                    </div>
                    <div class="col mb-1">
                        <button class="btn btn-outline-danger btn-sm w-100 h-100 genpdf2" data-row="${rowIndex}">
                            <i class="bi bi-file-earmark-plus-fill"></i> New PDF Check Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    return cardHTML;
}

$('#searchhouse2').on('input', function () {
    populateTable22(roomlist);
});

function populateTable22(data) {
    let columns = [0, 1, 2, 8, 9, 10, 30, 31, 32, 33, 34];
    let cardContainer = $('#housetable2');
    cardContainer.empty();

    let depositData = data
        .map((row, index) => ({ row, originalIndex: index }))
        .filter(item => item.row[30] === "ครบแล้ว" && item.row[32] !== "" && item.row[36] === "");

    let searchuserValue = $('#searchhouse2').val().toLowerCase().trim();
    let filteredData = depositData.filter(item => {
        return item.row.some(cell => cell && cell.toString().toLowerCase().includes(searchuserValue));
    });

    filteredData.forEach(function (item) {
        let newCardHtml = createCardHtml22(item.row, item.originalIndex, columns);
        let $newCard = $(newCardHtml);

        $newCard.find('.genpdf1, .genpdf2, .checkinstatus, .editinfo, .completework, .adddeposit, .foodmenubutton, .checkoutstatus')
            .attr('data-row', item.originalIndex);

        $newCard.find('.checkins, .checkouts, .pdfcheckin, .pdfcheckout, .complete').hide();
        if (item.row[32] === "checkin" && item.row[33] === "") {
            $newCard.find('.checkins').hide();
            $newCard.find('.checkouts').show();
        } else if (item.row[32] === "" && item.row[33] === "") {
            $newCard.find('.checkins').show();
            $newCard.find('.checkouts').hide();
        } else if (item.row[32] !== "" && item.row[33] !== "") {
            $newCard.find('.checkins, .checkouts').hide();
            $newCard.find('.complete').show();
        }
        if (item.row[34] == "") {
            $newCard.find('.pdfcheckin').hide();
        } else {
            $newCard.find('.pdfcheckin').show();
        }
        if (item.row[35] == "") {
            $newCard.find('.pdfcheckout').hide();
        } else {
            $newCard.find('.pdfcheckout').show();
        }
        cardContainer.append($newCard);
    });

    $('.completework2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        Swal.fire({
            title: 'ยืนยันจบงานใช่ไหม ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#009900',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, จบงาน!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                showhidepage('header');
                let setstatus = {
                    opt: 'completework',
                    id: rowData[0],
                };
                fetch(scriptUrl, {
                    method: "POST",
                    body: new URLSearchParams(setstatus),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
                    .then(response => response.json())
                    .then(res => {
                        if (res.status === 'success') {
                            Swal.fire({
                                title: res.message,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                showhidepage('.checkin,nav');
                                getdata();
                            });
                        } else if (res.status === "error") {
                            Swal.fire({
                                icon: 'error',
                                title: res.message,
                                allowOutsideClick: false,
                                confirmButtonText: 'ตกลง',
                            }).then(() => {
                                showhidepage('.checkin,nav');
                            });
                        }
                    })
                    .catch(err => {
                        showhidepage('.checkin,nav');
                        console.error(err);
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                            allowOutsideClick: false,
                            confirmButtonText: 'ตกลง',
                        });
                    });
            }
        });
    });

    $('.editinfo2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        let container = $(".typepay");
        container.empty();
        $('.backhome').data('target', '.checkin');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        let matchingRoom = income.filter(room => room[1] === rowData[0]);
        totalDeposit = matchingRoom
            .filter(room => room[7].includes("มัดจำงวดที่"))
            .reduce((sum, room) => sum + Number(room[4]), 0);

        $(".payment").hide();
        $('.houseedit').text(rowData[0]);
        showhidepage('.formpoolvilla, nav');
        $(".textedit").text(rowData[1]);
        $("#name").val(rowData[2]);
        $("#tel").val(rowData[3]);
        $("#facebook").val(rowData[4]);
        $("#line").val(rowData[5]);
        $("#bookinguser").val(rowData[6]);
        $("#bookingnote").val(rowData[7]);
        $("#timestart").val(new Date(rowData[8]).toISOString().split('T')[0]);
        $("#starttime").val(new Date(rowData[8]).toISOString().split('T')[1].substring(0, 5));
        $("#timeend").val(new Date(rowData[9]).toISOString().split('T')[0]);
        $("#endtime").val(new Date(rowData[9]).toISOString().split('T')[1].substring(0, 5));
        $("#timevalue").val(rowData[10]);
        createNightInputs(rowData[10]);
        let valroom = rowData[11].split('|');
        $(".night-input").each(function (index) {
            if (valroom[index] !== undefined) {
                $(this).val(valroom[index]);
            }
        });
        $("#quser").val(rowData[12]);
        $("#qroom").val(rowData[13]);
        $("#qbed").val(rowData[14]);
        $("#tfood").val(rowData[15]);
        $("#qfood").val(rowData[16]);
        $("#tanimal").val(rowData[17]);
        $("#qanimal").val(rowData[18]);
        $("#totalroom").val(rowData[19]);
        $("#totalfood").val(rowData[20]);
        $("#totalbed").val(rowData[21]);
        $("#totalanimal").val(rowData[22]);
        let freeItems = rowData[23].split('|');
        $(".btn-check").prop("checked", false);
        $(".form-floating.d-none").addClass("d-none");
        freeItems.forEach(item => {
            let parts = item.split(" ");
            let name = parts[0];
            let amount = parts[1] || "";
            switch (name) {
                case "น้ำแข็ง":
                    $("#free_1").prop("checked", true);
                    $("#free_price_1").val(amount).parent().removeClass("d-none");
                    break;
                case "น้ำดื่ม":
                    $("#free_2").prop("checked", true);
                    $("#free_price_2").val(amount).parent().removeClass("d-none");
                    break;
                case "ถ่านปิ่งย่าง":
                    $("#free_3").prop("checked", true);
                    $("#free_price_3").val(amount).parent().removeClass("d-none");
                    break;
                case "อาหารเช้า":
                    $("#free_4").prop("checked", true);
                    $("#free_price_4").val(amount).parent().removeClass("d-none");
                    break;
                case "ที่นอนเสริม":
                    $("#free_5").prop("checked", true);
                    $("#free_price_5").val(amount).parent().removeClass("d-none");
                    break;
                case "สัตว์เลี้ยง":
                    $("#free_6").prop("checked", true);
                    $("#free_price_6").val(amount).parent().removeClass("d-none");
                    break;
            }
        });
        $("#totalhouse").val(rowData[24]);
        $("#totalall").val(rowData[25]);
        $("#overdue").val(rowData[26]);
        $("#note").val(rowData[27]);
        $("#pdfedti1").val(rowData[28]);
        $("#pdfedti2").val(rowData[29]);
      let addpaytotal = $(".addpaytotal");
        addpaytotal.empty();
        let newElement = $(`<div class="col-12 mb-1">
          <div class="form-floating">
            <input class="form-control" type="text" placeholder="ยอดมัดจำรวม" aria-label="ยอดมัดจำรวม" id="paytotal" disabled>
            <label for="paytotal">ยอดมัดจำรวม</label>
          </div>
        </div>
        `)
        addpaytotal.append(newElement);
        let money = parseFloat(rowData[25]) - parseFloat(rowData[26])
        $('#paytotal').val(money)
    });

    $('.checkinstatus2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlists').text(rowData[0]);
        showhidepage('.addsdeposit,nav');
        $("#depositlist").find("option:not([data-default])").remove();
        depositlist.forEach(function (item) {
            $("#depositlist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
        $(".typepay3").empty();
        $('#depositlist').val('checkin');
        $('#totalguides1').val(rowData[24])
        let guide = parseFloat(rowData[24])
        let guide2 = parseFloat(rowData[26])
        let value = guide2 - guide
        $('#totalguides2').val(value)
        $('#totalguides3').val(rowData[26])
    });

    $('.adddeposit2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.backhome').data('target', '.checkout');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlists').text(rowData[0]);
        showhidepage('.addsdeposit,nav');
        $("#depositlist").find("option:not([data-default])").remove();
        depositlist.forEach(function (item) {
            $("#depositlist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
        $(".typepay3").empty();
        $('.totalguide').hide()
    });

    $('.foodmenubutton2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.backhome').data('target', '.checkout');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlist').text(rowData[0]);
        $('.namehouse').text(rowData[1]);
        showhidepage('.foodmenu,nav');
    });

    $('.checkoutstatus2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.backhome').data('target', '.checkout');
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        $('.idlists').text(rowData[0]);
        $('#disval').val(rowData[24]);
        showhidepage('.withdrawal,nav');
        $(".typepay4").empty();
    });

    $('.viewpdf1').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        const pdfUrl = rowData[34];
        const fileId = pdfUrl.split('id=')[1];
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        const downloadUrl = `https://drive.google.com/file/d/${fileId}/view`;
        $('#linkpdf').attr('src', embedUrl);
        $('#previewModal').modal('show');
        const modal = $('#previewModal');
        modal.find('.openPdfInNewWindow').off('click').on('click', function () {
            window.open(downloadUrl, '_blank');
        });
    });

    $('.viewpdf2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        const pdfUrl = rowData[35];
        const fileId = pdfUrl.split('id=')[1];
        const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        const downloadUrl = `https://drive.google.com/file/d/${fileId}/view`;
        $('#linkpdf').attr('src', embedUrl);
        $('#previewModal').modal('show');
        const modal = $('#previewModal');
        modal.find('.openPdfInNewWindow').off('click').on('click', function () {
            window.open(downloadUrl, '_blank');
        });
    });

    $('.genpdf1').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        Swal.fire({
            title: 'สร้าง PDF Check In ใหม่ใช่ไหม?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#009900',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, สร้างใหม่!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                showhidepage('header');
                let setstatus = {
                    opt: 'genpdfcheckin',
                    id: rowData[0],
                    house: rowData[1],
                    status: rowData[31],
                };
                fetch(scriptUrl, {
                    method: "POST",
                    body: new URLSearchParams(setstatus),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
                    .then(response => response.json())
                    .then(res => {
                        if (res.status === 'success') {
                            Swal.fire({
                                title: res.message,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                showhidepage('.checkin,nav');
                                getdata();
                            });
                        } else if (res.status === "error") {
                            Swal.fire({
                                icon: 'error',
                                title: res.message,
                                allowOutsideClick: false,
                                confirmButtonText: 'ตกลง',
                            }).then(() => {
                                showhidepage('.checkin,nav');
                            });
                        }
                    })
                    .catch(err => {
                        showhidepage('.checkin,nav');
                        console.error(err);
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                            allowOutsideClick: false,
                            confirmButtonText: 'ตกลง',
                        });
                    });
            }
        });
    });

    $('.genpdf2').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = data[rowIndex];
        Swal.fire({
            title: 'สร้าง PDF Check Out ใหม่ใช่ไหม?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#009900',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ใช่, สร้างใหม่!',
            cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                showhidepage('header');
                let setstatus = {
                    opt: 'genpdfcheckout',
                    id: rowData[0],
                    house: "PDF Checkout",
                    status: rowData[31],
                };
                fetch(scriptUrl, {
                    method: "POST",
                    body: new URLSearchParams(setstatus),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
                    .then(response => response.json())
                    .then(res => {
                        if (res.status === 'success') {
                            Swal.fire({
                                title: res.message,
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                showhidepage('.checkin,nav');
                                getdata();
                            });
                        } else if (res.status === "error") {
                            Swal.fire({
                                icon: 'error',
                                title: res.message,
                                allowOutsideClick: false,
                                confirmButtonText: 'ตกลง',
                            }).then(() => {
                                showhidepage('.checkin,nav');
                            });
                        }
                    })
                    .catch(err => {
                        showhidepage('.checkin,nav');
                        console.error(err);
                        Swal.fire({
                            icon: 'error',
                            title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                            allowOutsideClick: false,
                            confirmButtonText: 'ตกลง',
                        });
                    });
            }
        });
    });
}


function createCardHtml22(row, rowIndex, columns) {
    let cardHTML = `
     <div class="col-md-4 col-12 mb-1">
        <div class="card mb-1 shadow-sm">
            <div class="card-body">
                <div class="row">
                    <div class="col-6 mb-1 checkins">
                        <button class="btn btn-outline-warning btn-sm editinfo2 w-100" data-row="${rowIndex}">
                            <i class="bi bi-pencil-square"></i> แก้ไขข้อมูล
                        </button>
                    </div>
                    <div class="col-6 mb-1 checkins">
                        <button class="btn btn-outline-success btn-sm checkinstatus2 w-100" data-row="${rowIndex}">
                            <i class="bi bi-check-circle-fill"></i> Check In
                        </button>
                    </div>
                    <div class="col-4 mb-1 checkouts">
                        <button class="btn btn-outline-warning btn-sm adddeposit2 w-100" data-row="${rowIndex}">
                            <i class="bi bi-cash-coin"></i> เพิ่มรายรับ
                        </button>
                    </div>
                    <div class="col-4 mb-1 checkouts">
                        <button class="btn btn-outline-primary btn-sm foodmenubutton2 w-100" data-row="${rowIndex}">
                            <i class="bi bi-cash-coin"></i> สั่งอาหาร
                        </button>
                    </div>
                    <div class="col-4 mb-1 checkouts">
                        <button class="btn btn-outline-danger btn-sm checkoutstatus2 w-100" data-row="${rowIndex}">
                            <i class="bi bi-cash-coin"></i> Check Out
                        </button>
                    </div>
                    <div class="col-12 mb-1 complete">
                        <button class="btn btn-outline-info btn-sm completework2 w-100" data-row="${rowIndex}">
                            <i class="bi bi-bookmark-check-fill"></i> Complete
                        </button>
                    </div>
                </div>
                <hr>
                <div class="card-content">
                    <h5 class="card-title">บ้าน: ${row[1]}</h5>
                    <p class="card-text">ชื่อผู้จอง: ${row[2]}</p>
                    <hr>
                    <p class="card-text">วันที่ Check in: ${checkAndFormatDate(row[8])}</p>
                    <p class="card-text">วันที่ Check Out: ${checkAndFormatDate(row[9])}</p>
                </div>
                <hr>
                <div class="row">
                    <div class="col mb-1 pdfcheckin">
                        <button class="btn btn-outline-info btn-sm w-100 h-100 viewpdf1" data-row="${rowIndex}">
                            <i class="bi bi-filetype-pdf"></i> View PDF Check In
                        </button>
                    </div>
                    <div class="col mb-1 pdfcheckout">
                        <button class="btn btn-outline-info btn-sm w-100 h-100 viewpdf2" data-row="${rowIndex}">
                            <i class="bi bi-filetype-pdf"></i> View PDF Check Out
                        </button>
                    </div>
                </div>
                <hr>
                <div class="row">
                    <div class="col mb-1">
                        <button class="btn btn-outline-success btn-sm w-100 h-100 genpdf1" data-row="${rowIndex}">
                            <i class="bi bi-file-earmark-plus-fill"></i> New PDF Check In
                        </button>
                    </div>
                    <div class="col mb-1">
                        <button class="btn btn-outline-danger btn-sm w-100 h-100 genpdf2" data-row="${rowIndex}">
                            <i class="bi bi-file-earmark-plus-fill"></i> New PDF Check Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
    return cardHTML;
}


$("#pay_111, #pay_222").on("click", function () {
    if (this.id === "pay_111") {
        typepay3("pay_111");
    } else if (this.id === "pay_222") {
        typepay3("pay_222");
    }
});


function typepay3(payType) {
    let container = $(".typepay3");
    container.empty();
    let checkin = $('#depositlist').val();
    let deposits = `<div id="deposits"></div>`;
    let html = `
        <div class="col-12 mb-1">
          <div class="form-floating">
            <input class="form-control" type="date" placeholder="วันที่รับเงิน" aria-label="วันที่รับเงิน" id="paydate">
            <label for="paydate">วันที่รับเงิน</label>
          </div>
        </div>
    `;

    if (payType === "pay_222") {
        html += `
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
             <select class="form-select" aria-label="รับเงินผ่านบัญชี" id="paylist" aria-placeholder="บัญชีรับเงิน">
                  <option value="" selected disabled>เลือกบัญชีรับเงิน</option>
             </select>
             <label for="paylist">รับเงินผ่านบัญชี</label>
          </div>
        </div>
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
              <input class="form-control" type="file" id="slip" placeholder="อัพโหลดสลิปโอนเงิน"
                  aria-label="อัพโหลดสลิปโอนเงิน" accept="image/*">
              <label for="slip">อัพโหลดสลิปโอนเงิน</label>
          </div>
        </div>
      `;
    }
    html += `
    ${deposits}
    <div class="col-12 col-md-12 mb-1">
        <div class="form-floating">
            <input class="form-control" type="text" placeholder="ยอดเงิน" aria-label="ยอดเงิน"
                id="money" inputmode="numeric">
            <label for="money"> ยอดเงิน</label>
        </div>
    </div>
    <div class="col-12 col-md-12 mb-2 minusdeposit">
            <input type="checkbox" class="btn-check" id="minusdeposit" autocomplete="off" value="หัก" placeholder="หักจากค่าประกัน">
            <label class="btn btn-outline-success w-100" for="minusdeposit">หักจากค่าประกัน</label>
    </div>
    `;
    container.append(html);
    if (checkin === "checkin") {
        $('.minusdeposit').hide()
        $('.totalguide').show()
    } else {
        $('.totalguide').hide()
        $('.minusdeposit').show()
    }
    if (payType === "pay_222") {
        bank.forEach(function (item) {
            $("#paylist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
    }
}

$(document).on("click", "#pay_111,#pay_222,#depositlist", function () {
    let vals = $('#depositlist').val()
    if (vals === "ต่อเวลาพัก") {
        $("#deposits").html(`
            <div class="col-12 mb-1">
              <div class="form-floating">
                <input class="form-control" type="text" placeholder="ต่อเวลาพัก" aria-label="ต่อเวลาพัก" id="addday">
                <label for="addday">ต่อเวลาพัก(ชั่วโมง)</label>
              </div>
            </div>
        `);
    } else if (vals === "เงินอื่นๆ") {
        $("#deposits").html(`
            <div class="col-12 mb-1">
              <div class="form-floating">
                <input class="form-control" type="text" placeholder="หมายเหตุ" aria-label="หมายเหตุ" id="othermoney">
                <label for="othermoney">หมายเหตุ</label>
              </div>
            </div>
        `);
    } else {
        $("#deposits").empty();
    }
});

$("#pay_1111, #pay_2222").on("click", function () {
    if (this.id === "pay_1111") {
        typepay4("pay_1111");
    }
    else if (this.id === "pay_2222") {
        typepay4("pay_2222");
    }
});

function typepay4(payType) {
    let container = $(".typepay4");
    container.empty();
    let html = `
        <div class="col-12 mb-1">
          <div class="form-floating">
            <input class="form-control" type="date" placeholder="วันที่คืนเงิน" aria-label="วันที่คืนเงิน" id="paydate">
            <label for="paydate">วันที่คืนเงิน</label>
          </div>
        </div>
    `;

    if (payType === "pay_2222") {
        html += `
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
             <select class="form-select" aria-label="คืนเงินผ่านบัญชี" id="paylist" aria-placeholder="บัญชีคืนเงิน">
                  <option value="" selected disabled>เลือกบัญชีคืนเงิน</option>
             </select>
             <label for="paylist">คืนเงินผ่านบัญชี</label>
          </div>
        </div>
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
              <input class="form-control" type="file" id="slip" placeholder="อัพโหลดสลิปโอนเงิน"
                  aria-label="อัพโหลดสลิปโอนเงิน" accept="image/*">
              <label for="slip">อัพโหลดสลิปโอนเงิน</label>
          </div>
        </div>
      `;
    }
    html += `
    <div class="col-12 col-md-12 mb-1">
        <div class="form-floating">
            <input class="form-control" type="text" placeholder="ยอดคืนประกัน" aria-label="ยอดคืนประกัน"
                id="money" inputmode="numeric">
            <label for="money"> ยอดคืนประกัน</label>
        </div>
    </div>
    <div class="col-12 col-md-12 mb-1">
        <div class="form-floating">
            <input class="form-control" type="text" placeholder="หมายเหตุ(หากมี)" aria-label="หมายเหตุ(หากมี)"
                id="note">
            <label for="money"> หมายเหตุ(หากมี)</label>
        </div>
    </div>
    `;
    container.append(html);

    if (payType === "pay_2222") {
        bank.forEach(function (item) {
            $("#paylist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
    }
}

$("#booking_pay_1, #booking_pay_2").on("click", function () {
    if (this.id === "booking_pay_1") {
        typepays("booking_pay_1");
    }
    else if (this.id === "booking_pay_2") {
        typepays("booking_pay_2");
    }
});
function typepays(payType) {
    let container = $(".booking_typepay");
    container.empty();

    let html = `
    <div class="col-12 mb-1">
      <div class="form-floating">
        <input class="form-control" type="date" placeholder="วันที่รับเงิน" aria-label="วันที่รับเงิน" id="paydate">
        <label for="paydate">วันที่รับเงิน</label>
      </div>
    </div>
`;

    if (payType === "booking_pay_2") {
        html += `
    <div class="col-12 col-md-12 mb-1">
      <div class="form-floating">
         <select class="form-select" aria-label="รับเงินผ่านบัญชี" id="paylist" aria-placeholder="บัญชีรับเงิน">
              <option value="" selected disabled>เลือกบัญชีรับเงิน</option>
         </select>
         <label for="paylist">รับเงินผ่านบัญชี</label>
      </div>
    </div>
    <div class="col-12 col-md-12 mb-1">
      <div class="form-floating">
          <input class="form-control" type="file" id="slip" placeholder="อัพโหลดสลิปโอนเงิน"
              aria-label="อัพโหลดสลิปโอนเงิน" accept="image/*">
          <label for="slip">อัพโหลดสลิปโอนเงิน</label>
      </div>
    </div>
  `;
    }

    html += `
    <div class="col-12 mb-1">
      <div class="form-floating">
        <input class="form-control" type="text" placeholder="ยอดมัดจำรวม" aria-label="ยอดมัดจำรวม" id="booking_paytotal">
        <label for="booking_paytotal">ยอดมัดจำรวม</label>
      </div>
    </div>
`;

    container.append(html);

    if (payType === "booking_pay_2") {
        bank.forEach(function (item) {
            $("#paylist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
    }
}

$('#searchusers').on('input', function () {
    currentPage = 1;
    populateTablehouseoutside(houseoutside);
});

$('#houseoutsidelistSelect').on('change', function () {
    let selectedValue = $(this).val();
    totalPages = selectedValue === 'All' ? houseoutside.length : parseInt(selectedValue);
    currentPage = 1;
    populateTablehouseoutside(houseoutside);
});

function populateTablehouseoutside(data) {
    let depositData = data.filter(row => row[31] === "");

    let idCounts = {};
    income.forEach(row => {
        let id = row[1];
        idCounts[id] = (idCounts[id] || 0) + 1;
    });
    let finalData = depositData.filter(row => idCounts[row[0]] === 1);

    let cardContainer = $('#houseoutsidetables');
    cardContainer.empty();

    let searchusersValue = $('#searchusers').val().toLowerCase().trim();
    let filteredData = finalData.filter(row => {
        let dataMatches = row.some(cell => cell && cell.toString().toLowerCase().includes(searchusersValue));
        let matchingRoom = roomlist.find(room => room[0] === row[0]);
        let roomMatches = matchingRoom ? matchingRoom.some(cell => cell && cell.toString().toLowerCase().includes(searchusersValue)) : false;
        return dataMatches || roomMatches;
    });

    let startIndex = (currentPage - 1) * totalPages;
    let endIndex = startIndex + totalPages;
    let pageData = filteredData.slice(startIndex, endIndex);

    pageData.forEach(function (row, idx) {
        let actualIndex = startIndex + idx;
        let newCard = createCardHtmlhouse(row, actualIndex);
        cardContainer.append(newCard);
    });

    $('.clickable-cardhouse,.editshouse').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const rowIndex = $(this).data('row');
        const rowData = finalData[rowIndex];
        let container = $(".typepay5");
        container.empty();
        showhidepage('.houseoutsidedeposit,nav');
        $('.idlist').text(rowData[0]);
        $('#houseoutsidedepositadd').val(rowData[26]);
    });

    createPagination('#houseoutsidelistpage', Math.ceil(filteredData.length / totalPages), currentPage, function (newPage) {
        currentPage = newPage;
        populateTablehouseoutside(data);
    });
}


function createCardHtmlhouse(row, rowIndex) {
    let incomes = income.find(room => room[1] === row[0]);
    let imageHTML = '';
    if (typeof incomes[6] === 'string' && incomes[6].startsWith('https://lh3.googleusercontent.com/d/')) {
        imageHTML = `
            <img
                src="${incomes[6]}"
                alt="Image"
                onerror="this.onerror=null;this.src='';this.closest('.card-content').innerHTML='ไม่ได้ระบุภาพ';"
                class="img-thumbnail"
                style="max-width: 25px; height: auto;"
                onclick="openImagePopup('${incomes[6]}')"
            />
        `;
    }

    let cardHTML = `
        <div class="col-md-4 col-12 mb-1">
            <div class="card mb-1 shadow-sm clickable-cardhouse" data-row="${rowIndex}">
                <div class="card-body">
                    <div class="card-content">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">บ้าน: ${row[1] ? row[1] : ''}</h5>
                            <div class="d-flex gap-2 align-items-center">
                                ${imageHTML ? `<div>${imageHTML}</div>` : ''}
                                <button class="btn btn-outline-primary btn-sm editshouse" data-row="${rowIndex}">
                                    <i class="bi bi-pencil-square"></i> เพิ่มการชำระยอดคงเหลือ
                                </button>
                            </div>
                        </div>
                        <p class="card-text">ชื่อผู้จอง: ${row[2]}</p>
                        <p class="card-text">วันที่เข้าพัก: ${checkAndFormatDate(row[8])}</p>
                        <hr>
                        <p class="card-text">วันที่ชำระ: ${checkAndFormatDate(incomes[3])}</p>
                        <p class="card-text">ยอดชำระ: ${incomes[4]} บาท</p>
                        <hr>
                        <p class="card-text">ค้างชำระอีก : ${row[26]} บาท</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    return cardHTML;
}

$("#payhouse1, #payhouse2").on("click", function () {
    if (this.id === "payhouse1") {
        typepay5("payhouse1");
    }
    else if (this.id === "payhouse2") {
        typepay5("payhouse2");
    }
});

function typepay5(payType) {
    let container = $(".typepay5");
    container.empty();
    let html = `
        <div class="col-12 mb-1">
          <div class="form-floating">
            <input class="form-control" type="date" placeholder="วันที่รับเงิน" aria-label="วันที่รับเงิน" id="paydate">
            <label for="paydate">วันที่รับเงิน</label>
          </div>
        </div>
    `;

    if (payType === "payhouse2") {
        html += `
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
             <select class="form-select" aria-label="รับเงินผ่านบัญชี" id="paylist" aria-placeholder="บัญชีรับเงิน">
                  <option value="" selected disabled>เลือกบัญชีรับเงิน</option>
             </select>
             <label for="paylist">รับเงินผ่านบัญชี</label>
          </div>
        </div>
        <div class="col-12 col-md-12 mb-1">
          <div class="form-floating">
              <input class="form-control" type="file" id="slip" placeholder="อัพโหลดสลิปโอนเงิน"
                  aria-label="อัพโหลดสลิปโอนเงิน" accept="image/*">
              <label for="slip">อัพโหลดสลิปโอนเงิน</label>
          </div>
        </div>
      `;
    }
    html += `
    <div class="col-12 col-md-12 mb-1">
        <div class="form-floating">
            <input class="form-control" type="text" placeholder="ยอดเงิน" aria-label="ยอดเงิน"
                id="money" inputmode="numeric">
            <label for="money"> ยอดเงิน</label>
        </div>
    </div>
    `;
    container.append(html);

    if (payType === "payhouse2") {
        bank.forEach(function (item) {
            $("#paylist").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
    }
}

let cart = [];

function updateCartCount() {
    let totalCount = cart.length;
    $('#cartCount').text(totalCount);
}

function listmenu(foodmenus) {
    let categories = {};
    $.each(foodmenus, function (index, item) {
        let [name, price, size, category] = item;
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push({ name, price, size });
    });

    $('#listmenu').empty();

    $.each(categories, function (categoryName, items) {
        let categoryGroup = $(`
          <div class="category-group" data-category="${categoryName}">
                <fieldset class="border rounded p-4 mb-4 me-1 ms-1 shadow-sm">
                        <legend class="float-none w-auto px-3">${categoryName}</legend>
                    <div class="row">
                        <div class="col-12 mb-3 category-header">
                        </div>
                    </div>
                </fieldset>
          </div>
        `);

        $.each(items, function (i, food) {
            let cardHtml = $(`
            <div class="col-12 col-sm-6 col-md-4 col-lg-3 mb-4 menu-card" data-card-name="${food.name.toLowerCase()}">
              <div class="card h-100" data-name="${food.name}" data-price="${food.price}" data-size="${food.size}">
                <div class="card-body d-flex flex-column">
                  <h5 class="card-title text-primary menu-item" style="cursor:pointer;">
                    ${food.name} (${food.size})
                  </h5>
                  <p class="card-text">ราคา: ${food.price}</p>
                  <div class="mt-auto">
                    <small class="text-muted">คลิ๊กที่การ์ดเพื่อเพิ่มจำนวน</small>
                  </div>
                </div>
              </div>
            </div>
          `);
            categoryGroup.find('.row').append(cardHtml);
        });

        $('#listmenu').append(categoryGroup);
    });


    $('#listmenu').on('click', '.menu-card .card', function () {
        $('#searchInput').val('').trigger('keyup');

        let $card = $(this);
        let name = $card.data('name');
        let price = $card.data('price');
        let size = $card.data('size');

        let priceVal = (price === '-' || price === 'ถามราคา' || isNaN(parseFloat(price))) ? '' : price;
        Swal.fire({
            title: `${name} (${size})`,
            html: `
              <div class="form-floating">
                <input type="text" inputmode="numeric" id="swalPrice" class="form-control" placeholder="ราคา" value="${priceVal}" min="1">
                <label for="swalPrice">ราคา</label>
              </div>
              <div class="form-floating mt-1">
                <input type="text" inputmode="numeric" id="swalQty" class="form-control" placeholder="จำนวน" value="1" min="1">
                <label for="swalQty">จำนวน</label>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'เพิ่มลงตะกร้า',
            preConfirm: () => {
                const qty = Swal.getPopup().querySelector('#swalQty').value;
                if (!qty || qty <= 0) {
                    Swal.showValidationMessage('กรุณาระบุจำนวนที่มากกว่า 0');
                }
                const swalPrice = Swal.getPopup().querySelector('#swalPrice').value;
                if (!swalPrice || swalPrice <= 0) {
                    Swal.showValidationMessage('กรุณาระบุราคาที่ถูกต้อง');
                }
                return { qty: parseInt(qty), price: parseFloat(swalPrice) };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                addToCart({ name, price: result.value.price, size, qty: result.value.qty });
                Swal.fire({
                    icon: 'success',
                    title: 'เพิ่มสินค้าแล้ว!',
                    text: `${name} จำนวน ${result.value.qty} ชิ้น ถูกเพิ่มลงตะกร้า`
                });
            }
        });

    });
}

function addToCart(item) {
    let existing = cart.find(cartItem => cartItem.name === item.name && cartItem.size === item.size);
    if (existing) {
        existing.qty += item.qty;
    } else {
        cart.push(item);
    }
    updateCartCount();
}

function showCart() {
    if (cart.length === 0) {
        Swal.fire('ตะกร้าว่างเปล่า', 'กรุณาเพิ่มสินค้า', 'info');
        return;
    }

    let cartHtml = `
    <div class="container-fluid">
      <table class="table table-bordered table-hover table-sm text-start">
        <thead class="table-dark">
          <tr>
            <th>ชื่อ</th>
            <th>ขนาด</th>
            <th class="text-end">ราคา</th>
            <th class="text-center">จำนวน</th>
            <th class="text-end">รวม</th>
            <th class="text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>`;
    let total = 0;
    cart.forEach((item, index) => {
        let itemTotal = item.price * item.qty;
        total += itemTotal;
        cartHtml += `
          <tr>
            <td>${item.name}</td>
            <td>${item.size}</td>
            <td class="text-end">${item.price}</td>
            <td class="text-center">
              <input type="number" class="form-control form-control-sm qty-input" data-index="${index}" value="${item.qty}" min="1" style="width:70px; margin:auto;">
            </td>
            <td class="text-end item-total" data-index="${index}">${itemTotal}</td>
            <td class="text-center">
              <button class="btn btn-danger btn-sm btn-delete" data-index="${index}">ลบ</button>
            </td>
          </tr>`;
    });
    cartHtml += `
        </tbody>
      </table>
      <div class="mb-3">
        <div class="form-floating">
             <select class="form-select" aria-label="รับเงินผ่านบัญชี" id="paylist" aria-placeholder="บัญชีรับเงิน">
                  <option value="" selected disabled>เลือกบัญชีรับเงิน</option>
             </select>
             <label for="paylist">รับเงินผ่านบัญชี</label>
          </div>
      </div>
      <div class="d-flex justify-content-end">
        <h5>รวมทั้งสิ้น: <span id="cartTotal">${total}</span> บาท</h5>
      </div>
    </div>`;

    Swal.fire({
        title: '<strong>ตะกร้าสินค้า</strong>',
        html: cartHtml,
        width: '800px',
        showCancelButton: true,
        confirmButtonText: 'สั่งซื้อ',
        cancelButtonText: 'ปิด',
        didOpen: () => {
            const swalPopup = Swal.getPopup();

            swalPopup.querySelectorAll('.qty-input').forEach(input => {
                input.addEventListener('change', function () {
                    let idx = parseInt(this.getAttribute('data-index'));
                    let newQty = parseInt(this.value);
                    cart[idx].qty = newQty;
                    const newItemTotal = cart[idx].price * cart[idx].qty;
                    swalPopup.querySelector(`.item-total[data-index="${idx}"]`).innerText = newItemTotal;
                    updateCartCount();
                    let newTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
                    swalPopup.querySelector('#cartTotal').innerText = newTotal;
                });
            });

            swalPopup.querySelectorAll('.btn-delete').forEach(btn => {
                btn.addEventListener('click', function () {
                    let idx = parseInt(this.getAttribute('data-index'));
                    cart.splice(idx, 1);
                    updateCartCount();
                    Swal.close();
                    showCart();
                });
            });

            bank.forEach(function (item) {
                swalPopup.querySelector("#paylist").insertAdjacentHTML('beforeend', `<option value="${item[0]}">${item[0]}</option>`);
            });
        },
        preConfirm: () => {
            const selectedBank = Swal.getPopup().querySelector("#paylist").value;
            if (!selectedBank) {
                Swal.showValidationMessage("กรุณาเลือกบัญชีรับเงิน");
            }
            return selectedBank;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            cart.forEach(item => {
                item.total = item.price * item.qty;
            });

            let selectedBank = result.value;

            saveorder(cart, selectedBank);
        }
    });
}

$('#searchInput').on('keyup', function () {
    let query = $(this).val().toLowerCase().trim();

    if (query === '') {
        $('.category-group').show();
        $('.menu-card').show();
    } else {
        $('.category-group').each(function () {
            let group = $(this);
            let hasMatch = false;
            group.find('.menu-card').each(function () {
                let card = $(this);
                let cardName = card.data('card-name');
                if (cardName.indexOf(query) > -1) {
                    card.show();
                    hasMatch = true;
                } else {
                    card.hide();
                }
            });
            if (hasMatch) {
                group.show();
            } else {
                group.hide();
            }
        });
    }
});

$('.viewCart').on('click', function () {
    showCart();
});

function saveorder(itemData, banks) {
    showhidepage('header');
    let setstatus = {
        opt: 'saveorder',
        idlist: $('#idlist').text(),
        namehouse: $('#namehouse').text(),
        bank: banks,
        order: JSON.stringify(itemData)
    };
    fetch(scriptUrl, {
        method: "POST",
        body: new URLSearchParams(setstatus),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                Swal.fire({
                    title: res.message,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    showhidepage('.foodmenu,nav')
                    getdata()
                    cart = [];
                    updateCartCount();
                });
            } else if (res.status === "error") {
                Swal.fire({
                    icon: 'error',
                    title: res.message,
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง',
                }).then(() => {
                    showhidepage('.foodmenu,nav')
                });
            }
        })
        .catch(err => {
            showhidepage('.foodmenu,nav')
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
                allowOutsideClick: false,
                confirmButtonText: 'ตกลง',
            });
        });
}

function formtypes(val) {
    let type = $('.formtypes');
    type.empty();
    let paytotale = $('.paytotals');
    paytotale.empty();
    let html;
    if (val === 'ลงทะเบียนบ้านพักนอกเครือ') {
        $('.paytotale').hide();
        html = `
        <div class="col-12 mb-1">
            <div class="form-floating">
                <input class="form-control" type="text" placeholder="ชื่อบ้านพัก" aria-label="ชื่อบ้านพัก" id="booking_namehouses" autocomplete="booking_namehouses">
                <label for="booking_namehouses">ชื่อบ้านพัก</label>
            </div>
        </div>
        `;
        type.append(html);
    } else {
        $('.paytotale').show();
        html = `
        <div class="col-12 mb-1">
            <div class="form-floating">
                <select class="form-select" aria-label="ชื่อบ้านพัก" id="booking_namehouses" aria-placeholder="เลือกชื่อบ้านพัก">
                    <option data-default="true" value="" selected disabled>เลือกชื่อบ้านพัก</option>
                </select>
                <label for="booking_namehouses">ชื่อบ้านพัก</label>
            </div>
        </div>
         <div class="col-12 mb-1">
            <div class="form-floating">
                <input class="form-control" type="text" placeholder="ผู้ออกใบเสนอราคา" aria-label="ผู้ออกใบเสนอราคา" id="nquotation" autocomplete="nquotation">
                <label for="nquotation">ผู้ออกใบเสนอราคา</label>
            </div>
        </div>
        `;
        let html2 = `
        <div class="form-floating">
            <input class="form-control" type="text" placeholder="ยอดมัดจำรวม" aria-label="ยอดมัดจำรวม" id="booking_paytotal">
            <label for="booking_paytotal">ยอดมัดจำรวม</label>
          </div>
          `
        paytotale.append(html2);
        type.append(html);
        room.forEach(function (item) {
            $("#booking_namehouses").append(`<option value="${item[0]}">${item[0]}</option>`);
        });
    }
}
