$(document).ready(function () {
    removeinvalid()
});

function showhidepage(selector) {
    $('header,main,nav').hide()
    $(selector).show()
}

function showhidepage2(selector) {
    $('.cashin,.cashout').hide()
    $(selector).show()
}

function getdatatable(cacheKey, dataval, keyset, onDataUpdate, ignoreCache = false, extraParam = null) {
    return new Promise((resolve, reject) => {
        let cachedData = ignoreCache ? null : getCachedData(cacheKey);

        if (cachedData) {
            resolve(cachedData);

            fetchDataFromServer(cacheKey, dataval, keyset, extraParam).then((newData) => {
                if (!isDataSimilar(newData, cachedData, 0)) {
                    setCachedData(cacheKey, newData);
                    setCachedData(cacheKey + "_timestamp", Date.now());

                    if (typeof onDataUpdate === 'function') {
                        onDataUpdate(newData);
                    }
                }
            }).catch(error => {
                console.error("Error fetching data:", error);
            });
        } else {
            fetchDataFromServer(cacheKey, dataval, keyset, extraParam).then(data => {
                setCachedData(cacheKey, data);
                setCachedData(cacheKey + "_timestamp", Date.now());
                resolve(data);
            }).catch(error => {
                reject(error);
            });
        }
    });
}

function fetchDataFromServer(cacheKey, dataval, keyset, extraParam = null) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: scriptUrl,
            method: 'GET',
            dataType: 'text',
            data: {
                ket: cacheKey,
                val: dataval,
                ...(keyset ? { keyword: keyset } : {}),
                ...(extraParam ? { extra: extraParam } : {})
            }
            ,

            success: function (response) {
                let compressedData = atob(response);
                let compressedBytes = Uint8Array.from(compressedData, c => c.charCodeAt(0));
                let decompressedData = pako.ungzip(compressedBytes, { to: 'string' });
                let data = JSON.parse(decompressedData);

                let val = data[dataval];
                resolve(val);
            },
            error: function (jqxhr, textStatus, error) {
                let err = textStatus + ", " + error;
                console.error("Request Failed: " + err);
                reject(err);
            }
        });
    });
}


function getCachedData(key) {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
}

function setCachedData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function isDataSimilar(data1, data2, threshold = 0.1) {
    if (!data1 || !data2) return false;
    if (data1.length !== data2.length) return false;

    let differences = 0;
    let totalCells = 0;

    data1.forEach((row, i) => {
        row.forEach((cell, j) => {
            totalCells++;
            if (cell !== data2[i][j]) {
                differences++;
            }
        });
    });

    let differenceRatio = differences / totalCells;

    return differenceRatio <= threshold;
}

function getFormData(formId) {
    let formData = {};
    let filePromises = [];
    let radioGroups = {};

    $(`#${formId}`).find('input, select, textarea, span').each(function () {
        let input = $(this);
        let id = input.attr('id');
        if (!id) return;
        let value = input.val();

        if (input.is('span') && (id === 'textedit' || id === 'idlist' || id === 'idlists' || id === 'houseedit' || id === 'formtype' || id === 'namehouse')) {
            value = input.text().trim();
            if (value) {
                formData[id] = value;
            }
            return;
        }

        if (input.is(':radio')) {
            let groupName = input.attr('name');
            if (!radioGroups[groupName]) {
                radioGroups[groupName] = [];
            }
            radioGroups[groupName].push({
                id: id,
                value: value,
                checked: input.is(':checked')
            });
            return;
        }

        if (input.attr('type') === 'file') {
            let files = input[0].files;
            if (files.length > 0) {
                Array.from(files).forEach((file) => {
                    let filePromise = new Promise((resolve, reject) => {
                        let reader = new FileReader();
                        reader.onload = function (e) {
                            if (!formData[id]) {
                                formData[id] = [];
                            }
                            formData[id].push(e.target.result);
                            resolve();
                        };
                        reader.onerror = function (e) {
                            reject(e);
                        };
                        reader.readAsDataURL(file);
                    });
                    filePromises.push(filePromise);
                });
            }
            return;
        }

        if (input.is(':checkbox')) {
            formData[id] = input.is(':checked') ? value : "";
        } else {
            formData[id] = value;
        }
    });

    return Promise.all(filePromises).then(() => {
        for (let groupName in radioGroups) {
            let radios = radioGroups[groupName];
            let anyChecked = radios.some(radio => radio.checked);
            if (anyChecked) {
                radios.forEach(radio => {
                    if (radio.checked) {
                        formData[radio.id] = radio.value;
                    }
                });
            } else {
                radios.forEach(radio => {
                    formData[radio.id] = "";
                });
            }
        }

        return formData;
    });
}


function clearForm(id) {
    $(`#${id}`).find('input, select, textarea').each(function () {
        if ($(this).is('input[type="text"], input[type="date"],input[type="time"], input[type="password"], input[type="datetime-local"], input[type="file"], input[type="number"], input[type="email"], input[type="url"], input[type="tel"]')) {
            $(this).val('')
        } else if ($(this).is('input[type="checkbox"], input[type="radio"]')) {
            $(this).prop('checked', false).trigger('change')
        } else if ($(this).is('select')) {
            $(this).prop('selectedIndex', 0)
        } else if ($(this).is('textarea')) {
            $(this).val('')
        }
    })
}

function checkvalue(formData, excludeFields = []) {
    let missingFields = Object.entries(formData)
        .filter(([key, value]) => !excludeFields.includes(key))
        .filter(([key, value]) => {
            let element = $(`#${key}`);
            if (element.is(':checkbox') || element.is(':radio')) {
                return !element.is(':checked');
            } else if (element.is('select')) {
                return (
                    value === '' ||
                    value === null ||
                    value === undefined ||
                    value === element.find('option:first').val()
                );
            }
            return value === '' || value === null || value === undefined;
        })
        .map(([key, value]) => {
            let element = $(`#${key}`);
            if (element.is('select')) {
                return element.attr('aria-placeholder') || key;
            } else {
                return element.attr('placeholder') || key;
            }
        });

    missingFields = [...new Set(missingFields)];

    if (missingFields.length > 0) {
        Object.entries(formData).forEach(([key, value]) => {
            if (!excludeFields.includes(key)) {
                let element = $(`#${key}`);
                if (element.is(':checkbox') || element.is(':radio')) {
                    if (!element.is(':checked')) {
                        element.addClass('is-invalid');
                        $(`label[for=${key}]`)
                            .removeClass('btn-outline-success btn-outline-primary')
                            .addClass('btn-outline-danger');
                    }
                } else if (element.is('select')) {
                    if (
                        value === '' ||
                        value === null ||
                        value === undefined ||
                        value === element.find('option:first').val()
                    ) {
                        element.addClass('is-invalid');
                    }
                } else if (value === '' || value === null || value === undefined) {
                    element.addClass('is-invalid');
                }
            }
        });

        Swal.fire({
            icon: 'error',
            title: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            html: `${missingFields.join('<br>')}`
        });

        return false;
    }

    return true;
}

function removeinvalid() {
    // ล้างค่าของฟิลด์ทั้งหมดและเอา class is-invalid ออก
    $("input, select, textarea").each(function () {
        if ($(this).is(":radio") || $(this).is(":checkbox")) {
            $(this).prop("checked", false);
        } else {
            $(this).val("");
        }
        $(this).removeClass("is-invalid");
    });

    $("input:radio").each(function () {
        let groupName = $(this).attr("name");
        $(`input[name='${groupName}']`).each(function () {
            let labelId = $(this).attr("id");
            $(`label[for='${labelId}']`)
                .removeClass("btn-outline-danger is-invalid")
                .addClass("btn-outline-primary");
        });
    });

    $("input, select, textarea").on("input change", function () {
        let isEmpty = false;
        if ($(this).is(":radio") || $(this).is(":checkbox")) {
            isEmpty = !$(this).is(":checked");
        } else {
            isEmpty = ($(this).val().trim() === "");
        }
        if (!isEmpty) {
            $(this).removeClass("is-invalid");
            if ($(this).is(":radio")) {
                let groupName = $(this).attr("name");
                $(`input[name='${groupName}']`).each(function () {
                    let labelId = $(this).attr("id");
                    $(`label[for='${labelId}']`)
                        .removeClass("btn-outline-danger is-invalid")
                        .addClass("btn-outline-primary");
                });
            }
        }
    });
}


function createlist(selector, pageOptions) {
    let dropdown = $(selector);
    dropdown.empty();

    pageOptions.forEach(function (option) {
        let value = option === 'All' ? 'All' : option;
        let text = option === 'All' ? 'ทั้งหมด' : option;
        dropdown.append(`<option value="${value}">${text}</option>`);
    });
}

function createPagination(selector, totalPages, currentPage, onPageChange) {
    let pagination = $(selector);
    pagination.empty();

    if (totalPages > 5 && currentPage > 1) {
        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="javascript:void(0);" data-page="1">&laquo;&laquo;</a>
            </li>
        `);
    }

    let prevDisabled = (currentPage === 1) ? 'disabled' : '';
    pagination.append(`
        <li class="page-item ${prevDisabled}">
            <a class="page-link" href="javascript:void(0);" data-page="${currentPage - 1}">&laquo;</a>
        </li>
    `);

    let startPage = 1;
    let endPage = 5;

    if (totalPages > 5) {
        if (currentPage > 3) {
            startPage = Math.max(1, currentPage - 2);
            endPage = Math.min(totalPages, currentPage + 2);
        }

        if (currentPage + 2 > totalPages) {
            startPage = Math.max(1, totalPages - 4);
        }
    } else {
        endPage = totalPages;
    }

    for (let i = startPage; i <= endPage; i++) {
        let active = (i === currentPage) ? 'active' : '';
        pagination.append(`
            <li class="page-item ${active}">
                <a class="page-link" href="javascript:void(0);" data-page="${i}">${i}</a>
            </li>
        `);
    }

    let nextDisabled = (currentPage === totalPages) ? 'disabled' : '';
    pagination.append(`
        <li class="page-item ${nextDisabled}">
            <a class="page-link" href="javascript:void(0);" data-page="${currentPage + 1}">&raquo;</a>
        </li>
    `);

    if (totalPages > 5 && currentPage < totalPages) {
        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="javascript:void(0);" data-page="${totalPages}">&raquo;&raquo;</a>
            </li>
        `);
    }

    $(document).off('click', `${selector} .page-link`);
    $(document).on('click', `${selector} .page-link`, function (e) {
        e.preventDefault();
        let page = $(this).data('page');
        if (page > 0 && page <= totalPages) {
            onPageChange(page);
        }
    });
}

let darkModeEnabled = localStorage.getItem('darkMode') === 'true';

if (darkModeEnabled) {
    enableDarkMode();
} else {
    disableDarkMode();
}

$('#darkModeIcon').on('click', function () {
    if ($('body').attr('data-bs-theme') === 'dark') {
        disableDarkMode();
        localStorage.setItem('darkMode', 'false');
    } else {
        enableDarkMode();
        localStorage.setItem('darkMode', 'true');
    }
});

function enableDarkMode() {
    $('body').attr('data-bs-theme', 'dark');
    $('.navbar').removeClass('bg-light navbar-light').addClass('bg-dark navbar-dark');
    $('.theme-dependent').removeClass('bg-light text-dark').addClass('bg-dark text-light');
    $('#darkModeIcon').removeClass('bi-sun').addClass('bi-moon');
}

function disableDarkMode() {
    $('body').attr('data-bs-theme', 'light');
    $('.navbar').removeClass('bg-dark navbar-dark').addClass('bg-light navbar-light');
    $('.theme-dependent').removeClass('bg-dark text-light').addClass('bg-light text-dark');
    $('#darkModeIcon').removeClass('bi-moon').addClass('bi-sun');
}

function formatDate(dateString) {
    let date = new Date(dateString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset() + 420);
    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let year = date.getFullYear();
    return `${day}/${month}/${year}`;
}