/* Weight Hover (Originkit "Variable Font Hover By Letter"), ported from the React/Framer Motion
   source to plain JS/CSS for the site's menu and footer-contact labels: on hover each letter of
   the label thickens from its resting weight to bold in a left-to-right stagger, and un-thickens
   the same way on hover-out — the original's own mergeStagger() behaviour, where enter and leave
   share one delay pattern rather than reversing it.

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
     for short menu/contact labels; "random"/"center"/"last" from the source aren't exposed since
     nothing here needs them.
   - Each wrapped element keeps its full label as an `aria-label`, and the per-letter spans are
     `aria-hidden` — screen readers get the plain text, not a letter soup.
   - Elements can contain a `<br>` (the workshop-address value) — non-text child nodes are kept
     as-is between letter runs instead of being flattened into the label, so the line break still
     renders; only the text runs on either side of it get the per-letter treatment.

   This also appends a `.wh-underline` element (empty, 0-width by default) alongside `.wh-wrap` on
   every wrapped element — footer-underline.js (loaded after this file, footer elements only)
   grows it left-to-right on click. It's appended here rather than there so it always exists even
   if footer-underline.js isn't loaded on a given page (e.g. if .nav-links ever needs it later).
*/
(function () {
  const STAGGER_MS = 28;      // per-letter delay step (source default staggerDuration: 30ms)
  const SELECTOR = '.nav-links a, .footer-nav a, .footer-contacts .fc-label, .footer-contacts .fc-value';

  function wrap(el) {
    if (el.dataset.whReady) return;
    const childNodes = Array.from(el.childNodes);
    const label = childNodes
      .map(n => (n.nodeType === 3 ? n.textContent : n.nodeName === 'BR' ? ' ' : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!label) return;

    el.dataset.whReady = '1';
    el.setAttribute('aria-label', label);

    const wrapEl = document.createElement('span');
    wrapEl.className = 'wh-wrap';
    wrapEl.setAttribute('aria-hidden', 'true');

    let i = 0;
    let hasBreak = false;
    childNodes.forEach(node => {
      el.removeChild(node);
      if (node.nodeType === 3) {
        Array.from(node.textContent).forEach(ch => {
          const span = document.createElement('span');
          span.className = 'wh-letter';
          span.style.transitionDelay = (i * STAGGER_MS) + 'ms';
          span.textContent = ch === ' ' ? ' ' : ch;
          wrapEl.appendChild(span);
          i++;
        });
      } else {
        if (node.nodeName === 'BR') hasBreak = true;
        wrapEl.appendChild(node);
      }
    });

    if (hasBreak) el.dataset.whNoUnderline = '1';

    // Appended inside wrapEl (not as a sibling of it) so its position:relative + shrink-to-fit
    // width give the underline a containing block sized to the visible TEXT, not to el's own
    // box — el (an <a> or <p>) can be block-level and full-width in its own layout (e.g. the
    // footer-contacts <p> values), which would otherwise stretch the underline out past the
    // label's actual width.
    const underline = document.createElement('span');
    underline.className = 'wh-underline';
    underline.setAttribute('aria-hidden', 'true');
    wrapEl.appendChild(underline);

    el.appendChild(wrapEl);
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
