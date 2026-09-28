/* Footer running-text (click). Not part of the pasted Weight Hover source — a separate addition
   requested for the footer only: clicking a footer menu link or a footer-contacts label/value
   sends its own text sliding across itself once, like a news ticker, entering from the right edge
   and exiting past the left edge of its own box, then the element returns to its normal state
   (still hoverable via weight-hover.js, which must run first — this file reads the `.wh-wrap`
   structure it builds).

   Scope, deliberately:
   - Only `.footer-nav a` and `.footer-contacts .fc-label/.fc-value` — the burger-menu links
     (`.nav-links a`) keep hover-only, no click effect, since the pasted request was specifically
     about the footer block.
   - The one value with a `<br>` (the workshop address) is skipped: weight-hover.js flags it
     `data-wh-no-marquee` because a two-line ticker reads poorly and the address is the one place
     a moving line would actually hurt legibility; hover-thicken still works on it as normal.
   - `.footer-nav a` are real links. A plain left-click (no modifier key, not opened in a new tab)
     is intercepted so the ticker has time to play before the browser navigates; middle-click,
     ctrl/cmd/shift-click and similar "open elsewhere" gestures are left completely alone so they
     keep working exactly as the browser normally handles them.
   - `prefers-reduced-motion: reduce` skips the animation outright — links navigate immediately,
     contacts items do nothing extra on click.
*/
(function () {
  const SELECTOR = '.footer-nav a, .footer-contacts .fc-label, .footer-contacts .fc-value';
  const SPEED = 260; // px/s — constant ticker speed regardless of label length
  const MIN_MS = 700;
  const MAX_MS = 1800;

  function reducedMotion() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function playMarquee(el, done) {
    const wrapEl = el.querySelector('.wh-wrap');
    const label = el.getAttribute('aria-label');
    if (!wrapEl || !label || el.dataset.whNoMarquee || el.dataset.whMarqueeBusy) {
      done();
      return;
    }
    if (reducedMotion()) {
      done();
      return;
    }

    const rect = wrapEl.getBoundingClientRect();
    const width = rect.width, height = rect.height;
    el.dataset.whMarqueeBusy = '1';
    wrapEl.style.display = 'none';

    const holder = document.createElement('span');
    holder.className = 'wh-marquee-holder';
    holder.style.width = width + 'px';
    holder.style.height = height + 'px';

    const track = document.createElement('span');
    track.className = 'wh-marquee-track';
    track.textContent = label;
    holder.appendChild(track);
    el.appendChild(holder);

    const trackWidth = track.getBoundingClientRect().width;
    const dist = width + trackWidth;
    const dur = Math.min(MAX_MS, Math.max(MIN_MS, (dist / SPEED) * 1000));

    track.style.setProperty('--wh-start', width + 'px');
    track.style.setProperty('--wh-end', (-trackWidth) + 'px');
    track.style.animationDuration = dur + 'ms';

    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      holder.remove();
      wrapEl.style.display = '';
      delete el.dataset.whMarqueeBusy;
      done();
    };
    track.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, dur + 300); // safety net if animationend doesn't fire

    requestAnimationFrame(() => track.classList.add('run'));
  }

  function bind(el) {
    if (el.dataset.whMarqueeBound) return;
    el.dataset.whMarqueeBound = '1';

    const isLink = el.tagName === 'A';
    if (!isLink) el.setAttribute('tabindex', '0');

    const trigger = (e, andThen) => {
      if (reducedMotion() || el.dataset.whNoMarquee) { andThen && andThen(); return; }
      if (e) e.preventDefault();
      playMarquee(el, () => { andThen && andThen(); });
    };

    if (isLink) {
      el.addEventListener('click', (e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // open-elsewhere gestures: don't touch
        if (el.target === '_blank') return;
        if (el.dataset.whMarqueeBusy) { e.preventDefault(); return; } // already running, ignore re-trigger
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
