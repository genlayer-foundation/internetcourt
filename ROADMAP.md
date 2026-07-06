# Roadmap

Planned work for the internetcourt.org marketing site and agent experience.

## Marketing site

### Hero video treatments (done)
Explored alternate above-the-fold layouts for the launch video and shipped a direction: a live-color video panel hero with a masthead language toggle, letterboxed correctly in mobile fullscreen and stacked cleanly on small screens.

### Blog section on the homepage (done)
Blog is live and built out: homepage-matched post design, multiple articles (agentic commerce, use cases, and more), writing guidelines, and generators for the blog infographic images.

### "Chat to the Internet Court Agent" variant (planned)
For visitors who don't have an agent yet, offer a conversational variant that lets them chat with the Internet Court Agent directly, which can also walk them through installing the script.

## Internationalization

### Translations (done)
Site translated into Korean, Spanish, Chinese, and Russian (alongside English), with a cached LLM build step and per-locale routing.

## Discoverability

### SEO (done)
SEO/GEO optimization merged: metadata, structured data, sitemap, and robots. Watch translated-page indexing as new locales ship.

## Before release

### Finalize logos and regenerate blog infographics (pending)
Before releasing, update the partner logos, finalizing provisional ones such as NEAR and Starknet, then regenerate the blog infographic images (`agentic-stack.png` and `founding-members-by-layer.png`) per `frontend/tools/blog-images/README.md`. Also re-export the stale one-pager PDFs.
