/* Footer click-underline. Not part of the pasted Weight Hover source — a separate addition for
   the footer only: clicking a footer menu link or a footer-contacts label/value draws a thin
   underline beneath it, growing left-to-right, which then stays fully drawn. The text itself
   never moves (this replaces an earlier running-text/marquee version of the same click effect,
   per a later request — the text was found to be the wrong thing to animate, the line under it
   is what should move).

   Reads the `.wh-wrap`/`.wh-underline` structure weight-hover.js builds, which must run first.

   Scope, deliberately:
   - Only `.footer-nav a` and `.footer-contacts .fc-label/.fc-value` — the burger-menu links
     (`.nav-links a`) keep hover-only, no click effect, matching the original footer-only request.
   - The one value with a `<br>` (the workshop address) is skipped: weight-hover.js flags it
     `data-wh-no-underline` since it spans two lines and a single-line underline under it would
     sit oddly; hover-thicken still works on it as normal.
   - `.footer-nav a` are real links. A plain left-click (no modifier key, not opened in a new tab)
     is intercepted just long enough for the underline to finish drawing before the browser
     navigates; middle-click, ctrl/cmd/shift-click and similar "open elsewhere" gestures are left
     completely alone so they keep working exactly as the browser normally handles them.
   - Clicking an element again re-triggers the draw from zero width, so the flourish repeats each
     time rather than only playing once.
   - `prefers-reduced-motion: reduce` skips the animation outright: the underline simply appears
     (or links navigate immediately without the artificial delay).
*/
(function () {
  const SELECTOR = '.footer-nav a, .footer-contacts .fc-label, .footer-contacts .fc-value';
  const DRAW_MS = 900; // must match the CSS .wh-underline.run transition-duration

  function reducedMotion() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function drawUnderline(el, done) {
    const line = el.querySelector('.wh-underline');
    if (!line || el.dataset.whNoUnderline) {
      done();
      return;
    }
    if (reducedMotion()) {
      line.classList.add('run');
      done();
      return;
    }

    line.classList.remove('run');
    void line.offsetWidth; // force reflow so a repeat click restarts the draw from 0, not mid-way
    requestAnimationFrame(() => line.classList.add('run'));
    setTimeout(done, DRAW_MS);
  }

  function bind(el) {
    if (el.dataset.whUnderlineBound) return;
    el.dataset.whUnderlineBound = '1';

    const isLink = el.tagName === 'A';
    if (!isLink) el.setAttribute('tabindex', '0');

    const trigger = (e, andThen) => {
      if (reducedMotion() || el.dataset.whNoUnderline) {
        andThen && andThen();
        return;
      }
      if (e) e.preventDefault();
      drawUnderline(el, () => { andThen && andThen(); });
    };

    if (isLink) {
      el.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // open-elsewhere gestures: don't touch
        if (el.target === '_blank') return;
        trigger(e, () => { window.location.href = el.href; });
      });
    } else {
      el.addEventListener('click', (e) => trigger(e));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') trigger(e);
      });
    }
  }

  function start() {
    document.querySelectorAll(SELECTOR).forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
