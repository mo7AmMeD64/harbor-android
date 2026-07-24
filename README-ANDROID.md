# Harbor — Android Fork Notes

هذا الملف يوثّق التعديلات اللي سويتها لجعل باك اند Harbor (Rust/Tauri) قابل
للـ compile على أندرويد، وأهم شيء: **يوثّق اللي لسه ناقص**. هذا مو تطبيق
جاهز 100% — هذا أساس صلب تكمل عليه عن طريق GitHub Actions.

⚠️ **لم أقدر أختبر أي بناء فعلي لأندرويد** (ما عندي Android SDK/NDK ولا صلاحية
شبكة لتحميلها بالبيئة اللي أشتغل فيها). كل تعديل هنا مبني على قراءة دقيقة
للكود، لكن أول تشغيل حقيقي لـ `android-build.yml` بيكشف أي تفاصيل فاتتني.

## اللي تم تعديله

### 1. `src-tauri/Cargo.toml`
نقلت هذي التبعيات إلى `[target.'cfg(not(target_os = "android"))'.dependencies]`
لأنها كلها ديسكتوب فقط: `libmpv2`, `libmpv2-sys` (المشغل الأصلي), `discord-rich-presence`,
`tauri-plugin-window-state`, `tauri-plugin-updater`, `tauri-plugin-single-instance`,
ميزة `tray-icon` بمكتبة tauri، `rust_cast`/`mdns-sd` (كاست)، `realfft` (مزامنة ترجمة).

### 2. `src-tauri/src/lib.rs`
- قسّمت الموديولات لمجموعتين: **core** (تبقى بكل مكان) و**desktop-only**
  (تُبنى فقط إذا `not(target_os = "android"))`.
- **محذوفة على أندرويد**: `mpv`, `mpv_render_linux/mac`, `pip`, `pip_mac`,
  `tray`, `webview_helpers`, `multiview`, `modal_overlay`, `hdr_overlay`,
  `anime4k`, `svp`, `discord_rp`, `dlna`, `roku`, `airplay`, `cast`,
  `cast_hls`, `cast_server`, `cast_subs`, `cf_relay`, `dvr`, `thumbs`,
  `sub_extract`, `subsync`, `transcode`, `proc_mem`, `power`.
- عدّلت `run()` بحيث الـ states والـ plugins الخاصة بهاي الموديولات ما تُدار
  (managed) إلا على غير أندرويد.
- عدّلت `trailer.rs` سطر واحد كان يعتمد على `transcode::locate_ffmpeg()`
  (موديول محذوف) — الآن يرجع `None` على أندرويد.

### 3. `src-tauri/tauri.android.conf.json` (ملف جديد)
Tauri يدمجه تلقائياً مع `tauri.conf.json` عند البناء لأندرويد (بدون أي إعداد
إضافي). حذفت منه `externalBin` (sidecars يت-دي-إل-بي/إف إم بيغ ما راح
تشتغل بنفس الطريقة على أندرويد) و`fileAssociations`.

### 4. `.github/workflows/android-build.yml` (ملف جديد)
Workflow جديد (يدوي التشغيل عبر `workflow_dispatch`) يسوي:
`cargo check` سريع لـ `aarch64-linux-android` (يعطيك أخطاء الكومبايل خلال
دقايق بدل ما تنتظر بناء APK كامل) ثم `tauri android init` ثم بناء APK ديبَغ.

## اللي **لسه ناقص** (بالترتيب حسب الأولوية)

1. **مشغّل الفيديو**: الواجهة (`src/lib/player`, `src/components/player`)
   لسه تستدعي أوامر `mpv_*` عبر `invoke()`. على أندرويد هذي الأوامر مو
   موجودة، فالتشغيل حالياً ما راح يشتغل. الحل الأسرع: مشغّل ويب بديل
   باستخدام `hls.js`/`mpegts.js` (موجودين أصلاً بـ `package.json`) مع
   `<video>` tag عادي — يحتاج مسار كود جديد بالواجهة يُفعّل بس على أندرويد
   (عبر `@tauri-apps/plugin-os` للتحقق من المنصة). هذا أكبر مهمة متبقية.
2. **إخفاء عناصر الواجهة** للميزات المحذوفة (الكاست، DVR، PiP، Multiview،
   Discord RP، الفلاتر المرتبطة بـ SVP/Anime4K) — حالياً لو ضغط المستخدم
   عليها بالتطبيق راح تفشل بصمت (invoke لأمر غير مسجّل).
3. **التحميلات**: `download.rs` تم إبقاؤه لكن يحتاج فحص هل يعتمد سلوك
   ديسكتوب (مسارات ملفات، إلخ) — على أندرويد يفضّل استخدام
   `Android DownloadManager` أو `tauri-plugin-fs` مع مسارات Scoped Storage.
4. **التريلرز** (`trailer.rs`): يعتمد على sidecar بينري (`yt-dlp`)، وتنفيذ
   sidecar على الموبايل بمعمارية Tauri مختلف عن الديسكتوب — راح يحتاج
   تحقق/تعديل، وإلا الميزة تفشل بهدوء (ليست معطّلة بالكود، بس على الأغلب
   تفشل وقت التشغيل).
5. موديولات وضعتها بمجموعة "core" بدون تعديل لكن ما تأكدت من كل سطر فيها
   (خصوصاً `song_id.rs`, `local_lib.rs`, `crash_report.rs`, `fullscreen.rs`,
   `process.rs`) — لو أول `cargo check` فشل فيها، غالباً تحتاج نفس أسلوب
   الـ `#[cfg(not(target_os = "android"))]`.

## كيف تشتغل عليه من ترميكس

```bash
# داخل نسخة مشروعك المرفوعة على GitHub، طبّق نفس التعديلات
# (أو استبدل هذي الملفات الثلاثة: Cargo.toml، lib.rs، وأضف الملفين الجديدين)
git add -A
git commit -m "android: strip desktop-only backend for android build"
git push
```

بعدها من تبويب **Actions** بحسابك، شغّل workflow باسم **Android Build (fork)**
يدوياً. أول تشغيل غالباً بيفشل بخطوة `cargo check` — انسخ لي رسالة الخطأ
وأكمل معك تصحيحها خطوة خطوة، هذا هو المسار الواقعي للتكرار لأني ما أقدر
أختبر البناء من عندي.
