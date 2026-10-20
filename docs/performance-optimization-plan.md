# Performance Optimization Plan — FOX Fashion Homepage

> **Status:** Re-audit after the first implementation pass; mobile remains the priority  
> **Scope:** Homepage of `https://tyt-kid.myharavan.com/`  
> **Latest mobile source report:** [PageSpeed Insights — 2026-10-08 17:06 GMT+7, Lighthouse 13.5.0](https://pagespeed.web.dev/analysis/https-tyt-kid-myharavan-com/sh3plflhx9?form_factor=mobile)  
> **Repository area:** `FOX Fashion/`  
> **Deployment:** Internal planning document. This file is not uploaded to Haravan.

## 1. Goal

Raise the mobile Lighthouse Performance score from the latest single sample of 61 toward a median of 80, with a stretch goal of 90. Desktop's latest available result is 91; protect it and target 93–97 only after mobile work. The first estimate of 80–89 mobile was not supported by subsequent measurements, so estimates below are recalibrated and conditional.

The work will target measured render delay, blocking assets, large images, and avoidable third-party work. Lighthouse scores are lab measurements; the current PageSpeed report shows **No Data** for real-user field metrics, so this plan does not claim a Core Web Vitals field improvement.

## 2. Baseline

| Profile | Performance | FCP | LCP | TBT | CLS | Speed Index |
|---|---:|---:|---:|---:|---:|---:|
| Mobile baseline — 16:17 | 62 | 4.5 s | 5.6 s | 260 ms | 0 | 5.0 s |
| Mobile after implementation — 16:42 | **63** | 4.5 s | **6.0 s** | **230 ms** | 0 | **4.5 s** |
| Mobile latest sample — 17:06 | **61** | **4.5 s** | **5.6 s** | **310 ms** (calculator 307 ms) | **0** | **4.5 s** |
| Desktop baseline — 16:17 | 83 | 0.9 s | 1.2 s | 290 ms | 0 | 1.3 s |
| Desktop after implementation — 16:42 | **91** | 1.0 s | 1.3 s | **160 ms** | 0 | **1.2 s** |

Report context: Lighthouse 13.5.0, HeadlessChromium 153.0.8010.36, one initial page load, Slow 4G on emulated Moto G Power for mobile and custom throttling for desktop. The 17:06 report updates the mobile profile only; desktop values remain from 16:42. PSI reports **No Data** for field metrics. These are individual samples, not medians.

Change in measured outcomes: the 16:42 mobile sample scored +1 versus baseline, with unchanged FCP, LCP +0.4 s worse, TBT −30 ms, and Speed Index −0.5 s. The 17:06 sample then scored 61 (−2 versus baseline, −2 versus 16:42): FCP stayed 4.5 s, LCP returned to 5.6 s, TBT rose to 310 ms (+50 ms versus baseline, +80 ms versus 16:42), CLS stayed 0, and Speed Index matched 16:42 at 4.5 s. Desktop score rose +8 by 16:42, with TBT −130 ms. Image-audit savings and total payload recorded in prior runs are historical; they do not prove a mobile score gain. The latest mobile report shows **908 KiB** estimated image savings, **428 KiB** unused JavaScript, **46 KiB** unused CSS, **1.5 s** JavaScript execution, **3.6 s** main-thread work, **12 long tasks**, and **21,766 KiB** total payload. Render-blocking audit savings are estimated at **150 ms**. Treat the 61 result as a regression/variance signal to investigate, not a stable new baseline, until five comparable runs are available.

Other baseline evidence from the 16:17 PSI report:

- Total transferred payload: about **22.4 MiB mobile** and **22.6 MiB desktop**.
- Image delivery estimates savings of **1,696 KiB mobile** and **2,498 KiB desktop**.
- Mobile render-blocking requests estimate **1,500 ms** savings.
- Unused JavaScript estimates **428 KiB**; unused CSS estimates **46 KiB**.
- The `recaptcha__en.js` resource used about **1,125 ms CPU** (821 ms evaluation, 239 ms parse) and transferred about **347 KiB** in the unused-JS audit.
- The LCP breakdown identifies the desktop LCP element as the “FOX Sportwear” menu link. It reports about **210 ms TTFB** and **790 ms element render delay**. This makes critical CSS/JS sequencing especially relevant to desktop LCP; below-the-fold image savings should not be presented as direct LCP savings without a new trace.
- CLS is already 0 in this run; retain that result while deferring noncritical CSS and media.

The report is one Lighthouse run per device profile. Results can vary between runs, and PSI lab scores are not real-user field data.

## 3. Findings mapped to current evidence

### 3.1 Current measured outcome: image work helped bytes, not mobile LCP

The first implementation reduced image-delivery savings substantially, and PSI now sees responsive product-card images served as `grande`; the remaining card example has only 13.5 KiB estimated savings. The 16:42 mobile image audit concentrated savings in the lookbook thumbnail (1500×1500 source rendered at 84×84; 94.6 KiB estimated savings), three product-gallery sources served as `master` (about 85–87 KiB each), the homepage story poster group (441 KiB from `athora-theme.myshopify.com`, 104.4 KiB estimated savings), and a homepage story image (20.2 KiB estimated savings). The gallery source has since been changed locally to responsive display renditions with `master` reserved for zoom intent; this change has not been included in a new PSI run. These are worthwhile payload targets, but PSI does not identify them as the mobile LCP resource. Do not expect image-audit savings alone to lift the mobile score materially.

Live DOM inspection found 12 product-story card elements for six unique story items, with repeated poster URLs, and `preload="none"` on the videos. The Liquid source has six story-card items plus six modal items and enables a looping slider; the loop produces repeated cards. Browser caching may avoid a second transfer for identical URLs, so verify actual requests before claiming duplicate network bytes. The current poster images still point to demo Shopify-hosted media. Keep this as a content/ownership issue until merchant-approved replacements exist.

### 3.2 Mobile LCP attribution needs a trace before implementation

The 16:42 mobile report showed LCP 5.96 s but its breakdown totaled 790 ms. The 17:06 report shows LCP 5.635 s, TTFB 210 ms, and element render delay 720 ms (930 ms combined); it again names a text node inside `.topbar-item` (“Miễn phí vận chuyển…”). About 4.7 s of the reported LCP remains unexplained by these subparts. The topbar slider changes every 4.5 s. Do not treat 720 ms as explaining the full LCP or change autoplay based on this one report. Capture raw Lighthouse JSON/trace, LCP screenshots and event timestamps, then compare cold runs to identify whether the final candidate is topbar, hero, or another element.

### 3.3 Render-blocking JavaScript remains

[`master-include.liquid`](../FOX%20Fashion/snippets/master-include.liquid) loads `jquery-3.5.1.min.js` synchronously in the head. The latest mobile Lighthouse reports it at 31.7 KiB and 1,650 ms render-blocking duration; total render-blocking savings are only estimated at 150 ms. [`plugins-js.liquid`](../FOX%20Fashion/snippets/plugins-js.liquid) also loads Haravan's `api.jquery.js` deferred, and inline plugin code plus the legacy monolith may depend on jQuery. These are separate caller/load points: verify both URLs and initiators and inventory `$`/`jQuery` usage before changing order. Request duration is not a guaranteed LCP reduction. Do not use `async` while dependencies remain.

### 3.4 Render-blocking CSS

[`head_styles.liquid`](../FOX%20Fashion/snippets/head_styles.liquid) emits a broad blocking stylesheet set. The latest 17:06 mobile diagnostic names `utilities.min.css` (14.8 KiB / 1,500 ms), `link-effect.css` (1.2 KiB / 750 ms), `accordion.css` (0.9 KiB / 450 ms), `style-index.css` (1.6 KiB / 450 ms), and `home-media-banner.css` (1.6 KiB / 450 ms). The 1,500/750/450 ms figures are overlapping request-path durations, not additive savings; Lighthouse estimates only 150 ms savings for the whole render-blocking audit. Prioritize separating critical home/header styles from global/page-only styles, but only after confirming which rows precede the final LCP event. Preserve first paint and prevent FOUC/layout shifts.

The existing [`link-css-preload.liquid`](../FOX%20Fashion/snippets/link-css-preload.liquid) already has a nonblocking preload/onload branch. Reuse and validate the existing pattern before introducing another loader.

### 3.5 Existing afterload path and third-party media

[`shop-config.liquid`](../FOX%20Fashion/snippets/shop-config.liquid) places `cart-api.js`, `cart-action.js`, and `cart-drawer.js` in `window.main.scriptcallafter`; it also lists search, marquee, and `style-callafter.css` in `csscallafter`.

[`shop-optimize.liquid`](../FOX%20Fashion/snippets/shop-optimize.liquid) reads the afterload arrays at `DOMContentLoaded`. It preloads the listed CSS and then changes each link to a stylesheet. It appends commerce scripts sequentially, advancing on `load` or `error`. The marquee script now has a separate homepage-only idle queue: it waits 1.5 seconds after `DOMContentLoaded`, then uses `requestIdleCallback` with a 1.5-second timeout (or loads immediately after the delay when unsupported). A separate 3-second timeout calls reCAPTCHA detection and the currently empty `loadThirtyParty()` function.

This means the cart/search afterload lists are not delayed by that 3-second timer; they start at `DOMContentLoaded`. The plan should improve when and where each item loads, not simply add a longer timeout. The live page confirms these scripts and the page-specific FOX modules are present. Record `DOMContentLoaded`, first paint, LCP, and each resource's request/response start in a DevTools trace. Verify the first keyboard or touch activation while the queue is pending; a delayed script must not drop an add-to-cart action or leave its control inert.

The 17:06 report captured `marquee-scroll.min.js` at 2.49 KiB, about 572 ms dependency-path latency, and 91 ms CPU. The source now queues it after a 1.5-second post-DOMContentLoaded delay and an idle callback where supported. Verify the request start and marquee upgrade in a clean preview trace; the report predates this source change. The 17:06 3rd-party audit reports Google CDN about **734 KiB / 565 ms main-thread time**, `hstatic.net` **2,045 KiB / 296 ms**, and `athora-theme.myshopify.com` **18,206 KiB / 0 ms**. A single demo-host MP4 accounts for **17,723 KiB**, with six preview thumbnails also listed. Source inspection showed that the IntersectionObserver could start a preview when a story card approached the viewport. The change removed this automatic proximity load for desktop and reduced-motion users, but mobile auto-preview remains enabled by `fox_product_story_mobile_preview` in the current theme data and still calls the video loader when a card intersects. Hover/focus and modal playback also load video. The PSI report predates this change; use a clean Network trace to verify which video request occurs and whether it starts before LCP. Do not claim all video bytes transfer on every visit. Keep demo media ownership/merchant approval separate from an optimization patch.

### 3.6 Image delivery and remote story media

The 17:06 mobile PSI identifies **908 KiB** estimated image savings. The detailed image rows recorded from the prior 16:42 report included the 84×84 lookbook thumbnail, three gallery zoom sources, and demo-host story posters; refresh those row-level details before implementing more image changes. Product cards now use responsive renditions. Do not reuse the older 1,696/2,498 KiB estimates as current opportunities.

Relevant source includes [`product-loop.liquid`](../FOX%20Fashion/snippets/product-loop.liquid), [`home-lookbook.liquid`](../FOX%20Fashion/snippets/home-lookbook.liquid), [`home-media-banner.liquid`](../FOX%20Fashion/snippets/home-media-banner.liquid), [`home-product-story.liquid`](../FOX%20Fashion/snippets/home-product-story.liquid), [`product-story-item.liquid`](../FOX%20Fashion/snippets/product-story-item.liquid), and [`render-img.liquid`](../FOX%20Fashion/snippets/render-img.liquid).

The product-card source has already been changed to responsive renditions and PSI confirms it now serves `grande`; do not repeat that task. `home-lookbook.liquid` now requests the `compact` rendition for its 120×120 thumbnail through the same `img_url`/`asset_url` pipeline already used by the theme. A live HTML fetch returned the expected `hcs_1_image_compact.png` URL, and the CDN byte sizes are recorded in the file record. The pre-edit local source and live HTML differed, so verify this mapping in the intended preview theme before treating the change as a live improvement. The 16:42 PSI report captured product gallery images at `master`; the working tree now requests responsive display renditions and keeps the full source for desktop zoom intent. Product-story fallback posters and videos point at a Shopify demo host; replace them only after confirming the intended merchant content and a suitable Haravan-hosted replacement. Keep uploaded-setting keys stable unless a migration is explicitly designed.

The media banner is lazy-loaded and reports a large transfer, but it is not the measured desktop LCP element in this report. Keep the first actual hero/LCP image eager/high priority; do not preload every slide or make above-the-fold content lazy.

### 3.7 JavaScript execution and layout work

The 17:06 mobile run reports **1.5 s JavaScript execution**, **3.6 s main-thread work**, and **12 long tasks**. Lighthouse attributes approximately **1,024 ms** JavaScript CPU to first-party `myharavan.com`, **562 ms** to `hstatic.net`, and **1,166 ms** to Google reCAPTCHA. Named FOX/theme assets include slider **209 ms** (138 ms evaluation), scroll viewport **132 ms**, marquee **91 ms**, product card **77 ms**, and header **53 ms**. The unused-JS audit totals **428 KiB estimated savings**: the same reCAPTCHA URL appears twice at 346.8 KiB transferred per row with 188.7/185.2 KiB savings; first-party code is 53.1 KiB / 32.7 KiB savings; jQuery is 31.1 KiB / 21.0 KiB savings. The duplicate reCAPTCHA rows are grouped to 693.7 KiB transfer and 373.9 KiB total estimated savings by the audit; do not assume two separate downloads. Verify request count in Network and source bytes in Treemap/Coverage. Preserve CAPTCHA protection.

The same 3rd-party insight reports the demo Shopify video at **17,723 KiB**, six Shopify preview thumbnails totaling about **482 KiB**, and Google fonts at about **244 KiB**. The huge MP4 row has 0 ms main-thread time but remains a substantial mobile transfer candidate. Desktop and reduced-motion users no longer load video just because a card intersects; mobile auto-preview is enabled in the current settings data and loads the active card video when it intersects. The PSI report predates this change, so verify actual requests, cache behavior, and timing against LCP before claiming a transfer or LCP reduction.

### 3.8 Lighthouse evidence mapped to plugin callers

The rows below map the latest PSI URLs and named CPU costs to repository load points and likely markup callers. Lighthouse's domain-level CPU grouping does not prove which function consumed each millisecond; confirm with request initiators, Coverage, and a Performance trace before changing a caller.

| Lighthouse asset / evidence (mobile, 17:06) | Liquid load point and scope | Markup/plugin caller to check | Diagnostic and safe direction |
|---|---|---|---|
| `utilities.min.css` — 14.8 KiB; 1,500 ms blocking-path duration | [`head_styles.liquid`](../FOX%20Fashion/snippets/head_styles.liquid), blocking across templates | Global `.container`/grid/layout consumers throughout page snippets; many callers, not a single plugin | Use Coverage for first-viewport selectors and map used rules to the final LCP element. Split only with a visual/CLS check; treat 1,500 ms as path duration, not expected gain. |
| `jquery-3.5.1.min.js` — 31.7 KiB; 1,650 ms blocking-path duration; 31.1 KiB unused estimate | [`master-include.liquid`](../FOX%20Fashion/snippets/master-include.liquid), synchronous head load; `plugins-js.liquid` separately emits deferred Haravan `api.jquery.js` | Legacy `components.js`, inline plugin scripts, and jQuery-based `shop-optimize.liquid` CAPTCHA scan; exact consumers still need an inventory | Search all `$`/`jQuery` callers and test order in preview. Record request count/initiators for both jQuery URLs; do not async/defer blindly. |
| `link-effect.css` — 1.2 KiB; 750 ms blocking-path duration | [`head_styles.liquid`](../FOX%20Fashion/snippets/head_styles.liquid), global blocking | Link-effect anchors in `product-form.liquid`, `component-header-mega-type-1.liquid`, `home-product-tabs.liquid`, and `home-testimonial-product.liquid` | Coverage and first-screen screenshot: determine whether header/hero needs it before paint. If noncritical callers are below fold, split/defer by template only after checking FOUC and keyboard focus styles. |
| `accordion.css` — 0.9 KiB; 450 ms blocking-path duration | [`head_styles.liquid`](../FOX%20Fashion/snippets/head_styles.liquid), global blocking; accordion behavior script in `footer-scripts.liquid` | Footer accordions and any account/help accordion; confirm template markup inventory | Verify whether above-fold accordion exists on homepage. Candidate for template-scoped/deferred skin if not, with open/closed and focus states checked. |
| `style-index.css` — 1.6 KiB; 450 ms blocking-path duration | [`head_styles.liquid`](../FOX%20Fashion/snippets/head_styles.liquid), homepage-only | Homepage section skins loaded alongside `home-*.liquid` snippets | Inspect Coverage plus waterfall against hero LCP. Keep only rules needed to render initial hero/header in the critical set. |
| `home-media-banner.css` — 1.6 KiB; 450 ms blocking-path duration | [`head_styles.liquid`](../FOX%20Fashion/snippets/head_styles.liquid), homepage-only | [`home-media-banner.liquid`](../FOX%20Fashion/snippets/home-media-banner.liquid) and its first/other media panels | Confirm whether this section or image is the actual LCP. Compare LCP screenshot/timestamp and one-file Request Blocking diagnostic; do not lazy-load actual hero content. |
| `core-component-slider.js` — 209 ms CPU | [`footer-scripts.liquid`](../FOX%20Fashion/snippets/footer-scripts.liquid), sitewide | Homepage `home-slider`, `topbar`, product-story, lookbook, testimonials, latest-stories, product-tabs; also mega-menu, product gallery and mini-search sliders | Treemap/Coverage by page and trace init tasks. This is a shared engine with real home and commerce callers; first test whether initialization can be scoped to existing markup without delaying first-screen controls. |
| `scroll-viewport.js` — 132 ms CPU | [`footer-scripts.liquid`](../FOX%20Fashion/snippets/footer-scripts.liquid), sitewide, low fetch priority | Homepage category, lookbook, media banner, scroll-media-text, countdown elements using `data-fox-scroll-viewport` | Compare DOM instances and function call stacks on home vs non-home pages. Scope the module only if non-home pages do not contain hooks; keep reveal content usable without JS. |
| `marquee-scroll.min.js` — 91 ms CPU; about 572 ms dependency-path latency in the 17:06 report | [`shop-config.liquid`](../FOX%20Fashion/snippets/shop-config.liquid) adds it to a homepage-only idle queue; [`shop-optimize.liquid`](../FOX%20Fashion/snippets/shop-optimize.liquid) schedules it after the initial DOMContentLoaded work | `<fox-marquee>` in `home-marquee.liquid` and `home-scroll-media-text.liquid`; the product-story slider's `data-marquee` is handled by the core slider, not this script | The 17:06 run predates the idle change. In preview, confirm a delayed request, custom-element upgrade, readable static markup before upgrade, and motion behavior after upgrade. |
| `product-card.js` — 77 ms CPU | [`footer-scripts.liquid`](../FOX%20Fashion/snippets/footer-scripts.liquid), sitewide | Homepage product tabs/lookbook/testimonial cards, mega-menu, collection and search product cards | Coverage and caller map by template. Test conditional loading only where product-card hooks exist; verify swatches, quick view and add-to-cart first-use. |
| `core-component-header.js` — 53 ms CPU | [`footer-scripts.liquid`](../FOX%20Fashion/snippets/footer-scripts.liquid), sitewide | Header, mobile menu drilldown, account/search/cart entry points | Trace custom-element init cost and confirm this is not required to unblock initial header. Preserve mobile menu, focus, search and cart behavior. |
| First-party JS — 53.1 KiB transferred / 32.7 KiB estimated unused; origin CPU total 1,024 ms | [`footer-scripts.liquid`](../FOX%20Fashion/snippets/footer-scripts.liquid), broad shared module list on every template plus conditional home modules | Overlay/modal/popover, header, slider/media, product/quick-view, footer, legacy `components.js`, scroll viewport, tabs/accordion; homepage adds lookbook/story/testimonial modules | Request-level CPU includes all modules and inline code; do not assign the origin's full 1,024 ms to FOX scripts. Use Treemap/Coverage on exact URL, compare homepage to product/collection pages, and test one module/caller family per ablation. |
| Google reCAPTCHA — 1,166 ms CPU; unused audit about 346.8 KiB shown twice | Haravan/provider script plus delayed scan in [`shop-optimize.liquid`](../FOX%20Fashion/snippets/shop-optimize.liquid); phone/customer form callers also in customer snippets | Customer activation/reset/register/login forms and any rendered Google-protected form; identify the exact homepage initiator in Network | Capture initiator chain, request count, form presence, and first execution timestamp. Test form-scoped or interaction-triggered load only if Haravan permits; retain token validation and spam protection. |
| `athora-theme.myshopify.com` — 18,206 KiB transfer; one MP4 is 17,723 KiB; six preview thumbnails ~482 KiB | Media URLs rendered from homepage story item/modal markup in [`home-product-story.liquid`](../FOX%20Fashion/snippets/home-product-story.liquid) and [`product-story-item.liquid`](../FOX%20Fashion/snippets/product-story-item.liquid) | Homepage product-story cards and modal videos; previous DOM check saw `preload="none"` | On a clean mobile load, inspect Network request start, initiator, range/complete bytes, autoplay/muted state, and whether video fetch begins before LCP. Compare one-video Request Blocking ablation and first story interaction. Preserve poster preview and user playback; do not swap/remove merchant media without approval. |
| `style-callafter.css`, `search-drawer.css`, cart API/action/drawer scripts | [`shop-config.liquid`](../FOX%20Fashion/snippets/shop-config.liquid) → [`shop-optimize.liquid`](../FOX%20Fashion/snippets/shop-optimize.liquid), start at `DOMContentLoaded` | Search drawer, mini cart, product/cart controls | These are afterload queue items, not the same as the blocking rows above. In Network, record initiator/start time versus FCP/LCP and first touch/keyboard action; test queue-pending actions and failure recovery. |

`plugins-js.liquid` is not a single plugin bundle: it contains a large inline Bootstrap/jQuery UI script plus a homepage-scoped marquee asset and other plugin calls. Use Lighthouse Treemap and DevTools Coverage against specific URLs, then one-at-a-time Request Blocking only as a diagnostic. Do not count hypothetical bytes or score points as realized until a behavior-preserving change is measured.

The forced-reflow listing has not been expanded in the current PSI report and no repeated trace attribution is available. Prioritize a Performance trace and long-task call stacks over speculative refactors.

## 4. Revised score targets

These are **planning ranges**, not measured outcomes. The earlier estimate of 80–89 mobile was too optimistic for the observed next run: mobile rose only one point and LCP regressed. Recalibrate conservatively and gate projections on a valid LCP trace, repeated comparable runs, and successful afterload interaction checks.

| Scenario | Mobile estimate | Desktop estimate | Conditions |
|---|---:|---:|---|
| One evidence-led critical-path iteration | **65–73** | **91–94** | Provisional estimate from 61 current single sample; LCP attribution is verified, a confirmed blocker is reduced safely, and no CLS/interaction regression occurs |
| Full plan, first stable pass | **74–84** | **93–97** | Multiple high-impact causes are confirmed and addressed; five-run median validates improvement in FCP/LCP/TBT; Haravan/third-party costs remain bounded |
| Stretch target | **90+** | **95+** | Mobile LCP reaches its target gates and platform/backend work is no longer dominant; confirm only with repeated PSI runs |

Do not add projected points from individual tasks: Lighthouse uses nonlinear metric scoring, and improvements overlap. The 65–73 and 74–84 ranges are planning estimates, not measured outcomes or confidence intervals. The latest score of 61 is one sample, the three mobile samples have ranged 61–63, and current LCP/TBT are far from the stretch gates; the estimates must be recalibrated after five same-profile cold runs and a verified LCP trace. A 90+ mobile score is a stretch goal, not a forecast guarantee.

### Stretch metric gates for mobile

Use these as target gates for the same Moto G Power / Slow 4G profile:

- FCP at or below **1.8 s**.
- LCP at or below **2.5 s**.
- TBT at or below **200 ms**, with an internal stretch goal of **150 ms**.
- Speed Index at or below **3.4 s**.
- CLS remains **0** or as close to 0 as possible.

If the homepage cannot reach these gates because of platform-owned scripts or backend latency, document the remaining source and report the achieved score rather than weakening storefront behavior to chase a number.

## 5. Work plan

### Phase 0 — Validate the report and capture a repeatable trace

1. Save the current PSI report link and record the before/after table above.
2. Run the same URL and device profile at least five times before comparing small changes; use the median score and median metrics, and retain the report links.
3. Keep browser version, Lighthouse version, URL, form factor, throttling, cache state, and consent state consistent.
4. Capture Lighthouse JSON/trace and inspect LCP screenshots/events, Network priority/waterfall, LCP breakdown, and request initiators. Resolve the 5.96 s versus 790 ms LCP-breakdown mismatch before selecting an LCP fix.
5. Use Lighthouse Treemap and Coverage to map the 428 KiB unused-JS estimate. Check raw Network requests to determine whether the repeated reCAPTCHA row is a duplicate transfer or overlapping audit accounting.
6. Run diagnostic-only ablation tests using DevTools Request Blocking or Lighthouse settings for one origin/module at a time (reCAPTCHA, marquee, selected first-party bundle). Compare LCP/TBT and screenshots to estimate each dependency's influence. Never ship the blocked version or remove security/commerce behavior based on this comparison.
7. Record whether reCAPTCHA, Haravan app scripts, afterload assets, and story media are loaded in each run. Keep consent, cache, and interaction state identical.

**Exit gate:** A stable baseline exists for desktop and mobile; sources for the largest render-blocking and execution costs are identified.

**Priority order after the audit:** (1) resolve LCP candidate/timing, (2) prove whether render-blocking CSS/jQuery and marquee JS delay that candidate, (3) make afterload page-selective and safe, (4) scope reCAPTCHA only if Haravan permits it while retaining form security, (5) reduce remaining below-the-fold image bytes. This order follows score impact evidence; it is not a sum of audit savings.

### Phase 1 — Fix the confirmed critical path first

1. First identify the actual LCP element and its final timing. If text in the topbar is confirmed, test a static first announcement versus the current 4.5 s slider in a preview and compare five runs. If another element is confirmed, optimize its resource/render path instead.
2. Inventory all `$`/jQuery callers and code executed before deferred scripts. Check `master-include.liquid`, inline layout/snippet scripts, `plugins-js.liquid`, and `footer-scripts.liquid`.
3. Change jQuery loading strategy only after preserving dependency order. Compare blocking/defer variants in a preview and inspect the trace; PSI only estimates 150 ms savings, so do not assume this alone yields a large score jump. Avoid `async` for dependent scripts.
4. Keep only header, topbar, base typography/layout, and actual first-screen styles blocking. Classify the rest of `head_styles.liquid` by template/section and use the existing preload/onload pattern with a noscript fallback where supported.
5. Check the first viewport before and after CSS arrival for FOUC, font/layout shifts, hidden focusable controls, and CLS.

**Expected effect:** Potential improvement to FCP/LCP only if trace confirms these assets block the actual candidate. The latest PSI render-blocking insight estimates 150 ms savings; the 1,650 ms jQuery request duration is not a projected score gain.

### Phase 2 — Make afterload selective and safe

1. Split the current `window.main` afterload arrays into page-specific/noncritical groups where supported by existing Haravan template contracts.
2. Treat cart APIs and controls as functional dependencies. They may load after initial paint, but first pointer or keyboard activation must either wait safely for readiness or complete after a visible loading state. Never silently drop a first cart action.
3. Keep sequential loading only for actual dependency chains. Independent scripts can load independently only after verifying there is no ordering contract.
4. For noncritical scripts, prefer an idle callback with a bounded timeout and a `setTimeout` fallback; do not rely on `requestIdleCallback` alone. Use interaction intent only when keyboard and touch behavior are included.
5. Homepage-only marquee CSS/JS scoping is in place. The JS is now delayed through the bounded idle queue; confirm request timing, static content readability, and enhancement behavior in a preview trace.
6. Keep script errors observable and recoverable. The current queue advances after both `load` and `error`; ensure dependent commerce behavior reports failure and does not present a false-ready state.
7. Evaluate the 3-second delayed reCAPTCHA separately. Load it only where the relevant Haravan form exists or when that form is used, while preserving a valid token before submission. Confirm Haravan app/platform requirements before changing it.
8. Record each afterload asset's request start relative to FCP/LCP, required page/template, first input path, keyboard/touch behavior, and failure behavior. Success means measurable critical-path reduction with no lost first interaction, not just a later request timestamp.

**Exit gate:** Cart add/update/remove, search, login/register, and any CAPTCHA-protected flow work on first use with mouse, touch, and keyboard. No duplicate asset loads.

### Phase 3 — Correct image candidates and media payload

1. Product-card responsive renditions are already deployed and PSI confirms `grande`; leave this closed unless a new trace identifies a specific oversized first-screen card. Remaining savings in the example are 13.5 KiB.
2. The lookbook thumbnail source now uses the existing `img_url: 'compact' | asset_url` pattern. Validate the transformed URL and actual transfer savings in a live render before counting this item as complete.
3. The product-gallery source change is implemented in the working tree: use responsive display renditions and load `master` only when desktop zoom opens. Verify zoom behavior and the full-resolution fallback on product pages before deployment, then confirm the new request pattern in PSI/Network.
4. Audit home-category/settings images and reuse helpers only after validating Haravan output.
5. Replace/rehost demo-host story posters only with merchant-approved media; resize/compress to real card width. Consider deferring modal-copy poster markup until modal open, but inspect user flow and actual duplicated requests first.
6. Keep below-the-fold images lazy and the true hero/LCP eager/high priority. Video elements use `preload="none"`, but the enabled mobile-preview setting can still assign `src` and call `load()` when a story card intersects. Verify that request timing against LCP; preserve modal playback and do not describe this preview as user-intent-only. If it starts the measured 17,723 KiB MP4 before LCP, compare a preview-theme variant that keeps still posters on initial load and starts video on explicit interaction.
7. Follow `docs/image-guide.md`; preserve settings keys and validate output format and crop.

**Exit gate:** PSI image savings fall materially without degrading crop/quality; the first-screen image is not delayed and CLS remains stable.

### Phase 4 — Third-party CPU and measured long tasks

1. Attribute the 1.125-second reCAPTCHA CPU cost to the form and page that needs it. Do not remove spam protection.
2. Inspect Haravan `content_for_header`, app scripts, and first-party bundles in the network initiator tree. Coordinate changes to platform-owned scripts with the relevant app/provider.
3. Use the Lighthouse treemap and Coverage results to identify first-party unused code. Load page-specific code only on pages that need it; avoid broad dead-code deletion based on a homepage-only trace.
4. Capture a Performance trace after phases 1–3. Fix only repeated, attributable long tasks or reflows with measurable impact. Batch DOM reads/writes where the trace confirms forced synchronous layout.
5. Respect user interaction and animation behavior. Do not remove product-story, slider, or cursor features solely to improve the audit unless the owner approves that UX tradeoff.

**Exit gate:** TBT and main-thread work improve in repeated runs; no unexplained console errors or broken third-party flows remain.

## 6. Lighthouse and PageSpeed verification protocol

### Comparable PSI checks

For each phase, rerun the exact homepage URL in PageSpeed Insights for both device tabs. For mobile, keep the Moto G Power / Slow 4G profile, URL, Lighthouse version, consent and cache state consistent. Run at least five comparable cold samples for a baseline and again after each material change; use medians and preserve all report URLs, not the best score. Compare FCP, LCP, TBT, CLS, Speed Index, and Performance score. Do not treat 61, 63, or their average as a stable score estimate: observed single runs currently span 61–63 and the LCP/TBT differences are meaningful.

### What to inspect in Lighthouse Insights

Open these insights and diagnostics rather than relying on the top score alone:

- **LCP breakdown:** confirm the actual element and separate TTFB, resource load delay/duration, and element render delay.
- **Render-blocking requests:** confirm which stylesheet/script remains on the critical path and how its duration changes.
- **Network dependency tree:** follow chains from document to CSS, fonts, scripts, and LCP content; find late-discovered resources.
- **Improve image delivery:** verify the new candidate URL, intrinsic/displayed size, transfer size, format, and whether the image is LCP or below the fold.
- **Reduce unused JavaScript/CSS and Treemap/Coverage:** identify the responsible URL before removing or splitting a module.
- **JavaScript execution time / main-thread work / long tasks:** separate first-party, Haravan, Google, and unattributed time.
- **Forced reflow:** fix repeated named calls with meaningful total time, not isolated tiny entries.
- **Layout shift culprits and DOM size:** ensure deferred CSS/images and dynamic content preserve layout and do not inflate the page tree.
- **3rd parties:** check reCAPTCHA and app requests for CPU, bytes, and whether they run on the homepage unnecessarily.
- **Console/network:** inspect browser errors, failed assets, duplicates, and request initiators after each loading change.

### Lighthouse and afterload diagnostic techniques

- Use the report's **View Treemap** plus Chrome DevTools **Coverage** after the same page load. Map wasted bytes to specific URLs and page features before splitting or removing code; the PSI unused-JS total may include repeated rows for the same resource.
- In a local/preview DevTools session, run one controlled **Request Blocking ablation** at a time for reCAPTCHA, marquee, or one first-party bundle. Record the same LCP candidate, screenshot, LCP, and TBT. This estimates dependency contribution; it is diagnostic only and must never be deployed as a workaround.
- For plugin/caller attribution, start with the URLs and source load points in §3.8. Use Treemap for bytes, Coverage for used rules/code, Network Initiator for who requested each URL, and Performance long-task call stacks for CPU. Compare the same homepage against one or two representative caller pages (product and collection) to distinguish shared assets from home-only modules. Block one URL at a time in preview only; retain request initiator, LCP element/screenshot, LCP/TBT, and affected UI behavior. If the asset changes with blocked CSS/JS, restore it before continuing.
- In Performance, enable screenshots and Web Vitals, then inspect the LCP marker and its DOM node. Compare the node at the final LCP event against the element listed by PSI. A 5.96 s LCP with only 790 ms of reported subparts is a stop condition: capture another trace before choosing a code fix.
- For afterload, use Network **Initiator** and timing columns plus Performance marks for DOMContentLoaded, FCP, LCP, and first input. Verify that cart/search scripts start after the critical path, but before or on the first requested interaction; test keyboard, touch, and pointer while they are pending.
- Keep cold-cache Lighthouse/PSI as the score comparison. Run a separate warm-cache and post-interaction check to detect duplicate loads and delayed feature failures; never mix these runs into the cold-load median.
- If available in the installed Lighthouse version, save the report as JSON/HTML with trace and use the JSON's `lighthouseResult.audits`, `timings`, and LCP element details to compare exact fields. Do not install a new tool solely to produce the plan's estimate.
- Avoid score-gaming changes such as blocking production scripts, hiding content, or removing security checks. Ablations answer “what contributes”; only a behavior-preserving production change can count as an optimization.

### Optional local Lighthouse run

If Lighthouse CLI is already available in the development environment, a local run can make JSON/HTML artifacts and enable trace review. Use the same public URL, device profile, and throttling as closely as possible; do not compare a differently throttled local score directly to PSI.

Example command for a mobile lab run (do not install tooling just for this plan):

```powershell
lighthouse https://tyt-kid.myharavan.com/ `
  --only-categories=performance `
  --form-factor=mobile `
  --throttling-method=simulate `
  --output=html `
  --output-path=./lighthouse-mobile.html
```

Use DevTools Performance recording when you need a call stack for forced reflow, long tasks, the topbar candidate, or afterload timing. Use Network with cache disabled for cold-load diagnosis; separately check repeat navigation/warm cache if that reflects the intended shopper journey. Keep the cold/warm results labeled rather than mixing them.

## 7. Acceptance checklist

- [ ] Five comparable Lighthouse/PSI samples recorded for the final desktop and mobile run.
- [ ] Mobile median reaches at least **80**; stretch review begins at **90** only after the metric gates are approached.
- [ ] Desktop median reaches at least **92**, or the report identifies the remaining platform-owned bottleneck.
- [ ] LCP element and LCP subparts are rechecked after every critical-path change.
- [ ] CLS remains 0 or has a documented explanation and fix.
- [ ] First hero stays discoverable and receives appropriate priority; below-the-fold media remains lazy.
- [ ] No content, cart, search, account, or CAPTCHA-protected action depends on a failed afterload request.
- [ ] Keyboard, touch, and mouse can use controls during/after deferred loading.
- [ ] No duplicate script/custom-element initialization, broken asset, or new console error.
- [ ] Settings IDs and uploaded-image contracts are preserved unless a migration is separately planned.
- [ ] Findings from Lighthouse are separated into theme-controlled, Haravan-controlled, and third-party-controlled work.
- [ ] Each high-cost URL has a verified Liquid load point, page scope, markup/plugin caller, request initiator, and measured CPU/bytes before any caller is changed.

## 8. Risks and assumptions

- The PSI data is one synthetic lab snapshot dated 2026-10-08 per profile; real users currently show No Data. The mobile LCP breakdown does not account for the reported total LCP, so root-cause attribution remains provisional. Estimates will change with run variance, content, server response, and app/platform scripts.
- Haravan CDN image transformations and accepted size aliases must be verified against actual returned responses before changing Liquid URLs.
- Some markup and media settings may be merchant-owned. Replacing Shopify-hosted demo story media needs content approval and an appropriate Haravan-hosted equivalent.
- Moving CSS to afterload can improve render metrics but can cause FOUC, layout shift, or temporarily unstyled controls if critical dependencies are misclassified.
- Moving jQuery or commerce scripts can break legacy inline/plugin callers or delay the first add-to-cart interaction. Dependency inventory and first-use tests are required.
- reCAPTCHA and Haravan apps may have platform requirements outside theme source. Preserve security and commerce behavior; report constraints instead of disabling them.
- Score projections are non-additive. The 16:42 sample scored one point above baseline, but the 17:06 sample fell to 61 and TBT rose to 310 ms; the samples do not establish a stable mobile gain. Five-run medians and a verified LCP trace are still required for a reliable forecast.

## 9. File record

- Planned file: `docs/performance-optimization-plan.md`.
- Purpose: internal performance plan and repeatable validation protocol.
- Caller/load point: none; documentation only.
- Haravan deployment: **not deployed**.
- Implementation record (2026-10-08): updated product-card image delivery in `FOX Fashion/snippets/product-loop.liquid` with `compact`, `grande`, and `1024x1024` responsive candidates and a `sizes` hint. This snippet is included by homepage product tabs, lookbook/product-story hydration, collection/search results, and the header mega menu. Product-card images remain lazy-loaded.
- Compatibility update: `FOX Fashion/assets/product-card.js` now removes the default responsive candidates while a swatch image is active and restores them when the default image is restored. This preserves the existing pointer and keyboard swatch behavior.
- Selective afterload update: `FOX Fashion/snippets/shop-config.liquid` now includes `marquee-scroll.min.css` in the afterload list only on the homepage. Its CSS preload in `head_preload.liquid` and its deferred JavaScript in `plugins-js.liquid` were already homepage-scoped, so those files were not changed.
- Marquee scheduling update (2026-10-08): `plugins-js.liquid` no longer adds the high-priority deferred marquee script. `shop-config.liquid` puts it in a homepage-only idle queue, and `shop-optimize.liquid` loads it after a 1.5-second delay plus bounded idle scheduling; errors are logged with a FOX namespace. Liquid markup remains server-rendered.
- Story-video update (2026-10-08): `FOX Fashion/assets/product-story.js` no longer loads video on desktop/reduced-motion users solely because a story card intersects the viewport. **Mobile can still load video on intersection**: `fox_product_story_mobile_preview` is `true` in `config/settings_data.json`, and the observer calls `#playCard()` for an intersecting card when mobile preview is enabled. Hover/focus and modal playback also load the active video through `#loadVideo()`. Since PSI attributed a 17,723 KiB MP4 to the demo media host, capture a clean mobile Network trace before deciding whether to change the default preview behavior; preserve click-to-open modal playback.
- Product gallery update (2026-10-08): `FOX Fashion/snippets/product-gallery.liquid` now uses responsive `compact`/`grande`/`1024x1024` renditions for display and exposes `master` as an opt-in zoom source only outside quick view. `FOX Fashion/assets/core-component-image-zoom.js` loads that source when desktop zoom opens and falls back to the display image if it fails.
- Validation: prior syntax checks passed for `product-card.js`, `core-component-image-zoom.js`, `product-story.js`, and the inline script extracted from `shop-optimize.liquid`. Liquid snippets were inspected for supported Haravan tags and existing image-filter patterns; no Haravan Liquid renderer was available.
- Product gallery validation: live product-page zoom interaction is unavailable in this session. The new `master` source is opt-in at zoom open and has a fallback to the display rendition on load error.
- Lookbook thumbnail update (2026-10-08): `FOX Fashion/snippets/home-lookbook.liquid` now requests the `compact` rendition for the small tab thumbnail while preserving the existing source setting and main image URL. A read-only CDN check returned HTTP 200 for both the 154,680-byte original PNG and 5,627-byte compact derivative (96.4% fewer transferred bytes); the compact response is served as `image/jpeg` despite the `.png` alias. This validates the current CDN URL/payload, but does not measure a new Lighthouse result.
- Measurement update (2026-10-08 16:42 GMT+7): latest PSI report is linked at the top. Mobile score 62→63, FCP 4.5→4.5 s, LCP 5.6→6.0 s, TBT 260→230 ms, SI 5.0→4.5 s. Desktop 83→91, FCP 0.9→1.0 s, LCP 1.2→1.3 s, TBT 290→160 ms, SI 1.3→1.2 s. The first implementation materially lowered image savings estimates and total payload, but mobile score barely moved; do not report this as a meaningful mobile LCP improvement.
- Measurement update (2026-10-08 17:06 GMT+7): the newest mobile sample scores 61 with FCP 4.5 s, LCP 5.635 s, TBT 310 ms, CLS 0, Speed Index 4.5 s; report context is Moto G Power / Slow 4G / Lighthouse 13.5. Expanded PSI insights show 150 ms render-blocking estimated savings, 908 KiB image savings, 428 KiB unused-JS savings, 46 KiB unused-CSS savings, 1.5 s JS execution, and 3.6 s main-thread work. The LCP breakdown names a `.topbar-item` text node but only accounts for 930 ms (210 ms TTFB + 720 ms render delay). The 3rd-party audit attributes 18,206 KiB transfer to the Shopify demo host, including a 17,723 KiB MP4 and six preview thumbnails; this conflicts with prior `preload="none"` DOM observation and needs a cold Network/initiator check. Do not count either its payload or any resulting score savings as a proven change until request timing/bytes are validated.
- Live browser inspection (2026-10-08, before the current gallery source edit): confirmed the homepage serves product cards with `grande` image candidates; lookbook thumbnails used the original asset URL in that browser session; product zoom source images used `master`; 12 story-card nodes render six unique poster URLs due to the looping carousel; videos use `preload="none"`; and the home page contains a Haravan contact form with a reCAPTCHA input and Google API script. A later read-only HTML fetch returned the compact lookbook URL, which differs from the pre-edit local Liquid source. Console inspection returned no error/warning entries in the browser session. This does not replace a post-change product-page or Lighthouse cold-load check.
- Mobile preview (2026-10-08): kept the live homepage visible at a **390 × 844 CSS-pixel** viewport. Accessibility inspection confirmed mobile menu/search/account/cart controls, hero, product/story sliders, and footer content in the rendered page. This is browser responsive emulation; it does not represent a physical handset, mobile CPU, or Slow 4G network. The PSI Moto G Power / Slow 4G report remains the score baseline.
- Lighthouse caller audit (2026-10-08 17:06 GMT+7): added §3.8 mapping the latest mobile render-blocking CSS and JS CPU rows to `head_styles.liquid`, `master-include.liquid`, `plugins-js.liquid`, `footer-scripts.liquid`, `shop-config.liquid`, `shop-optimize.liquid`, and concrete markup callers. Confirmed source scope for the listed assets. Lighthouse request initiator and per-function attribution have not yet been captured in DevTools, so mappings from shared scripts to CPU are hypotheses pending trace/Coverage verification.
- Score estimate recalibration (2026-10-08): current single mobile sample is 61 with LCP 5.6 s and TBT 310 ms. Adjusted first-iteration estimate to 65–73 and full stable-pass estimate to 74–84, conditional on a valid trace and five-run medians. These are estimates, not committed gains. Retain 90+ only as a stretch target.
- Continuation check (2026-10-08): a fresh PageSpeed Insights API request was attempted for the homepage but returned HTTP 429 (rate limited); no new Lighthouse result was obtained. Browser/DevTools inspection is unavailable in this session (`cua.getState()` returned no apps or browsers). No storefront source was changed in this continuation because the remaining homepage actions require request/trace evidence or merchant-owned media approval. In particular, verify whether mobile story preview starts the 17,723 KiB video before LCP and compare an interaction-preserving preview variant in a preview theme before changing its default.
- Source/update status: render-blocking jQuery, blocking CSS classification, afterload timing/first-action readiness, reCAPTCHA initiator/scoping, live verification of lookbook/gallery renditions and story-video request timing, story poster ownership and duplicate request behavior remain open. The LCP candidate/timing discrepancy must be resolved before changing topbar behavior.
- Files modified across implementation slices: this Markdown file, `FOX Fashion/snippets/product-loop.liquid`, `FOX Fashion/assets/product-card.js`, `FOX Fashion/snippets/shop-config.liquid`, `FOX Fashion/snippets/shop-optimize.liquid`, `FOX Fashion/snippets/plugins-js.liquid`, `FOX Fashion/snippets/product-gallery.liquid`, `FOX Fashion/assets/core-component-image-zoom.js`, `FOX Fashion/snippets/home-lookbook.liquid`, and `FOX Fashion/assets/product-story.js`.
- New files: none. Storefront files are deployable theme files; the plan remains internal documentation.
