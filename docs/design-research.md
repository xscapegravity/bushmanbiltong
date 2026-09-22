# Design Research — Bushman Biltong

Sources reviewed (patterns only — no copying of design, branding, text or assets):
artisan biltong/jerky D2C brands (local AU + South African heritage brands),
premium independent butcher/deli sites, small-batch food brand storefronts.

## Patterns worth borrowing

| Pattern | Use in build |
| --- | --- |
| Full-bleed food hero with a single promise + one CTA | Home hero: charcoal backdrop, real product photo, "Order Now" |
| Editorial serif headings + generous whitespace | Georgia serif, large section spacing (already in globals.css) |
| Product cards led by photography, price secondary | Product preview + order cards: image first, "from $X" |
| Weight/size selection as pill/segmented control | Variant picker in OrderForm |
| Sticky or persistent order summary on mobile | Order summary always visible above the fold on /order |
| Explicit "how it works" for pickup/delivery | Fulfilment section + order form explanations |
| Trust signals: story, provenance, small-batch language | Our Story + Why sections (placeholder copy, owner to supply) |
| Instagram grid as social proof | Photography section with real supplied photos + @bushman_biltong link |
| Confirmation page as reassurance, not dead end | Order confirmation: number, next steps, no-payment note |
| Discreet admin entry | Footer "Admin" link only |

## Anti-patterns to avoid (observed on generic ecommerce)

- Cookie-cutter Shopify layouts, carousel heroes, auto-playing video
- Cluttered mega-menus and filter drawers for a 3-product catalogue
- Multi-step checkout for pickup/delivery local orders (friction without benefit)
- Discount popups / urgency timers (wrong tone for premium artisan)
- Stock-photo people; cliché western/cowboy motifs

## Resulting decisions

1. Mobile-first single-page order flow (select → details → confirm) rather than cart pages.
2. Charcoal + cream + terracotta palette; food photography is the only ornament.
3. No invented claims: every selling point/story block is visibly marked placeholder
   until the owner supplies real copy.
4. Photos: use the owner's real photos (assets/), never stock.
5. Accessibility-first: WCAG 2.2 AA targets — semantic HTML, labels, focus-visible,
   contrast checked for charcoal-on-cream and cream-on-charcoal pairs.
