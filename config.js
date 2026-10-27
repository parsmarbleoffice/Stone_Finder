/**
 * ================= تنظیمات اتصال به Google Sheet =================
 *
 * راهنمای انتشار گوگل شیت به صورت CSV:
 * 1) فایل گوگل شیت خود را باز کنید (ستون‌ها دقیقاً مطابق README_FA.md باشند).
 * 2) منوی File (File) -> Share -> Publish to web (انتشار در وب) را بزنید.
 * 3) در بخش Link گزینه‌ها را روی این تنظیمات بگذارید:
 *      - Document: نام شیت موردنظر (مثلاً Sheet1)
 *      - Format: Comma-separated values (.csv)
 * 4) دکمه Publish را بزنید و لینک تولیدشده را کپی کنید.
 * 5) لینک باید چیزی شبیه این باشد:
 *    https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?output=csv
 * 6) همان لینک را عیناً در مقدار زیر جایگزین کنید و فایل را ذخیره کنید.
 */
const CONFIG = {
  PUBLIC_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUzJ0TI54qN9L-wg5inIPt66yi7hB64q7WLvCJG6-B-NuVF4L75J8Aj5qI77NJVtAPokb9QexIwYjp/pub?output=csv'
};
