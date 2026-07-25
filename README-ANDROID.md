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
5. راجعت فعلياً `local_lib.rs`, `crash_report.rs`, `process.rs`, `song_id.rs`,
   `settings_store.rs`, `streams.rs`, `stremio_auth.rs`, `binary_lookup.rs`,
   `fonts.rs`, `web_server.rs`, `http_fetch.rs`, `download.rs` — ما فيها كود
   خاص بسطح المكتب يمنع البناء على أندرويد (`song_id.rs` أصلاً Windows-only
   مع fallback نظيف، `process.rs` يستخدم `pgrep`/`pkill` بمسار unix عادي —
   ممكن تفشل وقت التشغيل إذا مو موجودة بجهاز أندرويد لكن ما توقف البناء).
   `browser.rs` و`fullscreen.rs` و`stream_proxy.rs`/`transcode.rs` تم
   إصلاحها بإصلاح ٤ فوق.

## سجل الإصلاحات (يتحدّث كل ما نصلح خطأ من CI)

### ✅ إصلاح ١: `openssl-sys` فشل عند `aarch64-linux-android`
**الخطأ:** `cargo check --target aarch64-linux-android` فشل بمرحلة بناء `openssl-sys`
لأن `reqwest` كان مضبوط على ميزة `native-tls` (تعتمد على OpenSSL حقيقية
مبنية للمعمارية، غير متوفرة بـ CI).

**الحل:** فصلت `reqwest` بـ `Cargo.toml`:
- سطح المكتب (`not(target_os = "android")`): يبقى `native-tls` زي ما هو.
- أندرويد (`target_os = "android"`): يستخدم `rustls-tls-webpki-roots` بدل —
  مكتبة TLS مكتوبة بالكامل بـ Rust، ما تحتاج OpenSSL نظام ولا كومبايلر C
  منفصل. المشروع أصلاً يستخدم `rustls` بمكان ثاني، فهذا ينسجم مع الإعداد
  الموجود.

**⚠️ احتمال يطلع خطأ مشابه بعده:** بعض مكتبات TLS البديلة (`ring` أو
`aws-lc-rs`، تبعيات غير مباشرة لـ `rustls`) تحتاج compiler C حقيقي (مو بس
Rust) وقت البناء حتى بخطوة `cargo check`. إذا صار الخطأ التالي شبيه (يذكر
`ring`, `aws-lc-rs`, `cc`, أو `clang` مع رسالة "not found" أو "linker")،
الحل المتوقع هو إضافة متغيرات البيئة `CC_aarch64_linux_android` /
`AR_aarch64_linux_android` بالـ workflow تشير لـ clang الموجود جوا NDK.

### ✅ إصلاح ٢: `ring` فشل — ما يلقى `aarch64-linux-android-clang`
**الخطأ:** بالضبط اللي توقعناه بإصلاح ١ — `ring` (تبعية لـ `rustls`) تحتاج
compiler C حقيقي وقت البناء (تجميع كود Assembly)، والـ NDK فيه هذا
الكومبايلر لكن ماكو شي يخبر `cc-rs` وين يلقاه.

**الحل:** أضفت خطوة جديدة بالـ workflow اسمها **"Configure NDK toolchain env"**
مباشرة بعد تثبيت الـ NDK — تحدد مسار `clang` لكل معماريات أندرويد الأربعة
(aarch64, armv7, i686, x86_64) وتصدرها كمتغيرات بيئة (`CC_*`, `AR_*`,
`CARGO_TARGET_*_LINKER`) تبقى فعالة لبقية الخطوات كلها بنفس الـ job.

### ✅ إصلاح ٣: `Permission updater:default not found`
**تقدم كبير:** هذا الخطأ صار **بعد** ما `ring`/`aws-lc-rs` بنت بنجاح — يعني
إصلاح ٢ نجح 100%. الخطأ الجديد صار بمرحلة تانية تماماً (`build.rs` تبع
Tauri نفسه، بعد ما بدأ يجمّع كود `harbor` وليس تبعياته).

**السبب:** ملف `capabilities/default.json` يذكر الصلاحية `"updater:default"`
(وبرضو `shell:allow-execute` لتشغيل `yt-dlp` كـ sidecar). بما إن
`tauri-plugin-updater` مو مُجمّع على أندرويد (حذفناه بإصلاح سابق)، ولا
الـ yt-dlp sidecar موجود (حذفناه من `externalBin` بـ`tauri.android.conf.json`)،
فـ Tauri ما يعرف يتحقق من هالصلاحيات وقت البناء لأندرويد ويرفض كامل الملف.

**الحل:** Tauri يدعم تقييد ملف capability بمنصات معينة عبر حقل `"platforms"`.
سويت:
- `capabilities/default.json`: أضفت `"platforms": ["linux", "windows", "macOS"]`
  — يعني هذا الملف يُطبّق بسطح المكتب بس (زي ما كان بالضبط).
- `capabilities/android.json` (ملف جديد): نفس صلاحيات `default.json` تماماً
  **بدون** `updater:default` و**بدون** `shell:allow-execute` (sidecar
  yt-dlp)، مع `"platforms": ["android"]`.

### ✅ إصلاح ٤: أخطاء compile فعلية بكود Harbor (٩ أخطاء)
**تقدم كبير:** أول مرة الخطأ يصير بكود `harbor` نفسه (مو تبعية خارجية) —
يعني وصلنا لآخر طبقة تقريباً. ٩ أخطاء، بمجموعتين:

**١. `stream_proxy.rs` (موديول أساسي، يبقى بكل مكان) كان متشابك فعلياً مع
موديولين محذوفين:**
- يستورد `HlsState` من `cast_hls` (سيرفر بث الكاست عبر HLS) ويحتفظ فيه
  كحقل دائم بـ `ProxyState`.
- يستورد `TranscodeProfile`/`handle_transcode` من `transcode` (تحويل عبر
  ffmpeg) ويستخدمها بجلسات البروكسي.

هذا البروكسي (تمرير الهيدرز المخصصة، مثلاً توكن Real-Debrid) أساسي ولازم
يشتغل على أندرويد، فما كان صح نحذف الموديول كامل. الحل: نقلت
`TranscodeProfile` (نوع بيانات بسيط بلا أي كود تنفيذي) مباشرة لداخل
`stream_proxy.rs` بحيث يبقى متوفر بكل مكان، وخليت `transcode.rs` يعيد
تصديرها بدل ما يعرّفها من جديد. بعدين قيّدت (`#[cfg(not(target_os =
"android"))]`) بس الأجزاء اللي فعلاً تحتاج `cast_hls`/`transcode` (حقل
`hls`، مسار الكاست المتقدم، مسار تحويل ffmpeg) — على أندرويد هذي المسارات
تتجاوز بهدوء وتسقط على التمرير المباشر العادي (بدون تحويل/كاست HLS).

**٢. `browser.rs` و`fullscreen.rs` تستخدمان دوال نافذة سطح مكتب بحتة**
(`decorations()`, `unmaximize()`, `set_fullscreen()`, `center()`) — مو
موجودة أصلاً بواجهة النوافذ الخاصة بـ Tauri للموبايل (نافذة الموبايل
مُدارة من النظام، مالها معنى "ملء الشاشة/توسيط" بنفس مفهوم سطح المكتب).
- `browser_open` (نافذة منبثقة لعرض روابط خارجية/تثبيت إضافات): على
  أندرويد صارت تفتح الرابط مباشرة بمتصفح النظام الافتراضي (عبر
  `tauri-plugin-opener`) بدل نافذة مخصصة — هذا أصلاً السلوك الطبيعي المتوقع
  بالموبايل.
- `window_fullscreen_enter/exit`: على أندرويد صارت no-op (بس تصدر نفس
  الحدث JS حتى تبقى واجهة المستخدم متزامنة)، بدون أي تلاعب بهندسة النافذة.

### ✅ إصلاح ٥: تشغيل فعلي على الجهاز — "Plugin window not initialized"
**هذا أول إصلاح بالواجهة الأمامية (TypeScript) مو بالـ Rust.** بعد ما
البناء نجح والتطبيق اشتغل فعلياً على الجهاز، ظهر خطأ Promise rejection
قاتل ("Plugin window not initialized") يوقف التطبيق كامل، بالإضافة لفشل
تثبيت الإضافات.

**السبب:** ملفات زي `lib/window.ts` و`lib/fullscreen-state.ts` و
`lib/settings.tsx` تستدعي `@tauri-apps/api/window` (`getCurrentWindow()`
ودوالها: `isFullscreen`, `isMaximized`, `onResized`, `setDecorations`...)
مباشرة عند إقلاع التطبيق، بفحص `isTauri()` بس (يعني "هل هذا تطبيق Tauri؟")
بدون تمييز سطح مكتب عن أندرويد. هذي الدوال أصلاً **غير مدعومة على
أندرويد** بواجهة Tauri (موثّق رسمياً: "Linux/iOS/Android: Unsupported"
لمعظم دوال WebviewWindow)، فأي استدعاء لها يفشل بخطأ زي هذا.

**الحل:** أضفت دالة `isDesktopTauri()` بملف `lib/platform.ts` (تستخدم
`@tauri-apps/plugin-os` المتزامنة أصلاً بالمشروع) تميّز سطح المكتب الفعلي
عن أندرويد/iOS. استبدلت بيها كل مكان كان يعتمد على `isTauri()` وحدها قبل
استدعاء أي دالة نافذة:
- `lib/window.ts`: مرجع النافذة (`win`) صار `null` على أندرويد من الأساس
  — يخلي كل الدوال الثانية بالملف (اللي أصلاً فيها `win?.`/`if (!win)
  return`) تتجاوز بأمان تلقائياً.
- `lib/fullscreen-state.ts`: استعلامات حالة ملء الشاشة عبر نظام التشغيل
  (`osWindowFullscreen`, `exitAnyFullscreen`) صارت تتجاوز على أندرويد
  (تعتمد بس على الحالة الداخلية اللي أصلاً موجودة بالملف).
- `lib/settings.tsx`: استدعاء `setDecorations` (تفعيل/تعطيل شريط العنوان
  المخصص — مفهوم سطح مكتب بحت) صار يتجاوز على أندرويد + أضفت طبقة `catch`
  ثانية للأمان.
- `chrome/window-controls.tsx` و`chrome/window-resize-edges.tsx`: أزرار
  تصغير/تكبير/إغلاق النافذة وحواف تغيير الحجم بالسحب — ما لها معنى بجوال
  (النظام نفسه يوفر رجوع/الرئيسية/التطبيقات الأخيرة) — صارت لا تظهر إطلاقاً
  على أندرويد.

**ملاحظة مهمة:** فشل تثبيت الإضافات اللي ظهر بالصور قد يكون نتيجة مباشرة
لهذا الخطأ (لو صار وقت الإقلاع قبل ما تجهز باقي أجزاء التطبيق)، أو قد يكون
مشكلة منفصلة بمسار جلب الإضافات نفسه. **جرّب تبني وتشغّل النسخة الجديدة
وشوف هل المشكلة انحلت، أو طلعت أخطاء جديدة/مختلفة.**

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
