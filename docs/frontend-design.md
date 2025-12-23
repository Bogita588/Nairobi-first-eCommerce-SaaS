## Frontend Design Blueprint (Nairobi-first, conversion-led)

### Visual direction
- Bold, clean contrast; lean toward warm neutrals + deep accents (e.g., sand/linen background, charcoal text, deep teal highlights, amber CTA for checkout).
- Typography: Display/headers with "Manrope" or "Space Grotesk"; body with "Soehne"/"Inter Tight" fallback. Tight line-heights for mobile readability.
- Components with gentle radii (6–8px), clear elevation for actions, and micro-animations on CTA hover/press.
- Motion: purposeful (page load fade-up, staggered cards, button press feedback). Avoid gratuitous parallax.

### Storefront (electronics/fashion/watch/home)
- Navigation: sticky top bar with search, category pills (h-scroll on mobile), cart icon with badge.
- Product list: masonry/2-col grid on mobile; big images; price + promo badge; "Add to cart" prominent. Variant chips (color/size/model) surfaced without drilling.
- Product detail: gallery with zoom; trust row (delivery ETA, MPesa available, return policy); sticky add-to-cart with quantity/variant; "Pay via MPesa" primary CTA, "Chat on WhatsApp" secondary.
- Checkout page: one-page, three panels stacked on mobile:
  1) Contact & delivery (phone-first, Nairobi area selector with fee preview, address instructions).
  2) Order summary (lines, delivery fee, discounts); live update on changes.
  3) Payment: MPesa STK button (primary, amber), COD fallback, WhatsApp continuation link. Inline status toasts for STK push.
- Trust enhancers: show paybill/till, SSL/secure badge, delivery ETA by area, customer support WhatsApp link.
- SEO pages: area/category landing pages with hero (city/estate), featured products, FAQ accordion, structured data baked in.

### Owner dashboard (insight-first)
- Landing: Insight cards first ("Action to take", severity color-coded), then key KPIs (Revenue, Orders, AOV, Conversion) with day/week/month toggles.
- Sales: sparkline cards; drillable chart with segment toggles (channel: web vs WhatsApp; payment: MPesa vs COD).
- Funnel: horizontal step bar (view → cart → checkout → paid) with drop-off percentages and top reasons (delivery cost, payment failure, price sensitivity).
- Product intelligence: table + visual tags highlighting "High views, low conversion", "Cart abandoned often". Inline actions: adjust price, add photos.
- Delivery map: heat overlay by Nairobi area with ETA and fee suggestions.
- Layout: left nav, top search/quick actions, content in two-column grid; mobile collapses to single column with sticky action bar.
- Theme toggles: light-first with high contrast; optional dark mode but not default.

### Component patterns
- Buttons: primary (amber #f59e0b), secondary (charcoal outline), tertiary text; loading states with progress dots.
- Inputs: large tap targets, clear labels, helper text; phone input with country preset; area selector with search + popular estates.
- Cards: subtle shadow, header with icon, body with concise stat and plain-language recommendation.
- Toasts/banners: success (green), warn (amber), danger (red) with concise copy.
- Empty states: friendly illustrations, CTA to import products or connect WhatsApp/MPesa.

### Accessibility & performance
- WCAG AA contrast; focus states clearly visible.
- Image strategy: next/image with responsive sizes and CDN; lazy-load below the fold.
- Typography loading: use `font-display: swap`, preconnect to font host.
- Motion reduce: respect prefers-reduced-motion.

### Mobile-first interactions
- Bottom sticky bar for cart/checkout actions.
- Pull-to-refresh friendly lists; swipeable carts for remove/edit.
- Keyboard-safe spacing for phone number and notes fields.
