/* Weight Hover (Originkit "Variable Font Hover By Letter"), ported from the React/Framer Motion
   source to plain JS/CSS for the site's menu links: on hover each letter of the label thickens
   from its resting weight to bold in a left-to-right stagger, and un-thickens the same way on
   hover-out — the original's own mergeStagger() behaviour, where enter and leave share one delay
   pattern rather than reversing it.

   Adaptation notes (this is a deliberate, documented simplification of the original, not a
   missing feature):
   - The original drives the weight change through Framer Motion's `animate()` calling
     `fontVariationSettings: "'wght' N"` against the true Inter Variable font (loaded from
     rsms.me). This project already self-hosts Inter as a handful of static weight files
     (300/400/500/600/700 — see fonts.css) and has no other external font dependency; pulling in
     a ~200KB variable-font CDN file just for this hover would add a new network dependency the
     rest of the site doesn't have. Instead each letter transitions its ordinary CSS `font-weight`
     between two of the already-loaded static weights, staggered per letter via a plain CSS
     `transition-delay` computed once at init — visually the same "letters thicken in a wave"
     effect, without Framer Motion, without a rAF loop, and without the extra font file.
   - Hover start/end triggering is plain CSS `:hover` (not JS mouseenter/mouseleave + a debounce
     timer as in the source): a CSS transition already reverses smoothly mid-flight if the pointer
     leaves before the wave finishes, which is what the original's debounce was protecting against,
     so no JS timer bookkeeping is needed here.
   - `staggerFrom` is fixed to a left-to-right wave (the source's "first"), which reads naturally
     for short menu labels; "random"/"center"/"last" from the source aren't exposed since nothing
     here needs them.
   - Each link keeps its full label as an `aria-label` on the real `<a>`, and the per-letter
     spans are `aria-hidden` — screen readers get the plain link text, not a letter soup.
*/
(function () {
  const STAGGER_MS = 28;      // per-letter delay step (source default staggerDuration: 30ms)
  const SELECTOR = '.nav-links a, .footer-nav a';

  function wrap(link) {
    if (link.dataset.whReady) return;
    const label = link.textContent;
    if (!label || !label.trim()) return;
    link.dataset.whReady = '1';
    link.setAttribute('aria-label', label);
    link.textContent = '';

    const wrapEl = document.createElement('span');
    wrapEl.className = 'wh-wrap';
    wrapEl.setAttribute('aria-hidden', 'true');

    const chars = Array.from(label);
    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'wh-letter';
      span.style.transitionDelay = (i * STAGGER_MS) + 'ms';
      span.textContent = ch === ' ' ? ' ' : ch;
      wrapEl.appendChild(span);
    });

    link.appendChild(wrapEl);
  }

  function start() {
    document.querySelectorAll(SELECTOR).forEach(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
