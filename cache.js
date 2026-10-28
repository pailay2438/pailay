/* กันแอปค้างเมื่อพื้นที่เก็บข้อมูลในเครื่อง (localStorage ~5MB) เต็ม
 *
 * getdatatable() ใน functionlist.js เก็บข้อมูลทุกชุดที่ดึงจากหลังบ้านไว้ในเครื่อง (ใบจองทั้งหมด, รายรับ ...)
 * ถ้าเต็ม setCachedData() จะ error → ตอนเปิดครั้งแรกข้อมูลไม่ขึ้นเลย และล็อกอินใหม่ก็บันทึกชื่อผู้ใช้ไม่ได้
 * แทนที่ setCachedData (ประกาศเป็นฟังก์ชัน global) ด้วยตัวที่: ลองเก็บ → ถ้าเต็ม ลบแคชชุดอื่นแล้วลองใหม่ → ยังไม่ได้ก็ข้าม
 * แคชเป็นแค่ตัวช่วยให้เปิดเร็ว ข้ามได้ไม่เสียข้อมูล (ดึงจากหลังบ้านใหม่ทุกครั้งอยู่แล้ว)
 */
(function () {
    // ค่าที่ต้องเก็บไว้เสมอ (สถานะล็อกอิน/ธีม) — ห้ามลบตอนเคลียร์ที่
    var KEEP = ['name', 'profile', 'values', 'darkMode'];

    function trySet(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            return false;
        }
    }

    function evictOtherCaches(exceptKey) {
        for (var i = localStorage.length - 1; i >= 0; i--) {
            var k = localStorage.key(i);
            if (KEEP.indexOf(k) === -1 && k !== exceptKey && k !== exceptKey + '_timestamp') {
                localStorage.removeItem(k);
            }
        }
    }

    window.setCachedData = function (key, data) {
        var value = JSON.stringify(data);
        if (trySet(key, value)) return;
        evictOtherCaches(key);
        if (trySet(key, value)) return;
        // ใหญ่เกินเก็บได้แม้ที่ว่าง → ไม่เก็บชุดนี้ (ลบของเก่าที่อาจค้างอยู่ด้วย จะได้ไม่ใช้ข้อมูลเก่าผิดๆ)
        try { localStorage.removeItem(key); } catch (e) { }
        console.warn('ไม่เก็บแคช "' + key + '" (' + Math.round(value.length / 1024) + ' KB) — พื้นที่ในเครื่องไม่พอ');
    };
})();
