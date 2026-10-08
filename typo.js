/* Russian typography for running text: a one-to-three letter preposition / conjunction / particle never ends a line
   (its space becomes a no-break space), a dash stays on the same line as the word before it, and the last two words
   of a paragraph are tied together so no single word is left alone on the last line. Works on text nodes only, so
   markup, <br> breaks and scripted splits keep working. Runs once, before the page scripts. */
(function () {
  var NB = '\u00a0';
  var WORDS = 'а в во для до за и из или к ко на над не ни но о об от по под при про с со у что как же бы ли да то так чем без'.split(' ');
  var SET = {};
  WORDS.forEach(function (w) { SET[w] = 1; });

  function bind(text) {
    var parts = text.split(/( )/);
    for (var i = 0; i < parts.length - 2; i += 2) {
      var w = parts[i].toLowerCase().replace(/^[«"„(]+/, '').replace(/[,.;:!?»")]+$/, '');
      if (SET[w] && parts[i + 1] === ' ') parts[i + 1] = NB;
    }
    return parts.join('').replace(/ —/g, NB + '—');
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, SVG: 1, TITLE: 1, VIDEO: 1 };
  function textNodes(root) {
    var out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        for (var p = n.parentNode; p && p !== root.parentNode; p = p.parentNode) { if (SKIP[p.nodeName.toUpperCase()]) return NodeFilter.FILTER_REJECT; }
        return /\S/.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }

  function run() {
    textNodes(document.body).forEach(function (n) { n.nodeValue = bind(n.nodeValue); });
    // no single word alone on the last line of a paragraph / list item / description
    document.querySelectorAll('p, li, .wc-text, .cat-desc').forEach(function (el) {
      var nodes = textNodes(el);
      if (!nodes.length) return;
      var all = el.textContent.trim().split(/\s+/);
      if (all.length < 3) return;
      var last = nodes[nodes.length - 1], v = last.nodeValue.replace(/\s+$/, '');
      var k = v.lastIndexOf(' ');
      if (k > 0) last.nodeValue = v.slice(0, k) + NB + v.slice(k + 1) + last.nodeValue.slice(v.length);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
