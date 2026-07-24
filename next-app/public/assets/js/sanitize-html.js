(function attachClowHtmlSanitizer(global) {
  'use strict';

  const allowedTags = new Set([
    'A', 'B', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HR', 'I', 'IFRAME', 'IMG', 'LI', 'OL', 'P', 'PRE', 'S', 'SPAN', 'STRONG', 'TABLE',
    'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'U', 'UL',
  ]);
  const removedWithContent = new Set([
    'BASE', 'BUTTON', 'EMBED', 'FORM', 'INPUT', 'LINK', 'MATH', 'META', 'OBJECT', 'OPTION',
    'SCRIPT', 'SELECT', 'STYLE', 'SVG', 'TEXTAREA',
  ]);
  const globalAttributes = new Set(['class', 'title']);
  const attributesByTag = {
    A: new Set(['href', 'target', 'rel']),
    IFRAME: new Set(['src', 'width', 'height', 'allow', 'allowfullscreen']),
    IMG: new Set(['src', 'alt', 'width', 'height', 'loading']),
    TD: new Set(['colspan', 'rowspan']),
    TH: new Set(['colspan', 'rowspan']),
  };

  function isSafeUrl(value, tagName) {
    const url = String(value || '').trim();
    if (!url) return false;
    if (tagName === 'IMG' && /^data:image\/(?:gif|jpe?g|png|webp);base64,/i.test(url)) return true;
    if (/^(?:#|\/|\.\/|\.\.\/)/.test(url)) return true;

    try {
      const parsed = new URL(url, global.location ? global.location.href : 'https://localhost/');
      if (tagName === 'IFRAME') {
        return parsed.protocol === 'https:' && /^(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)$/i.test(parsed.hostname);
      }
      return ['http:', 'https:', 'mailto:', 'tel:'].indexOf(parsed.protocol) !== -1;
    } catch (error) {
      return false;
    }
  }

  function sanitizeElement(element) {
    const tagName = element.tagName;
    if (!allowedTags.has(tagName)) {
      if (removedWithContent.has(tagName)) {
        element.remove();
      } else {
        element.replaceWith(...Array.from(element.childNodes));
      }
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const tagAttributes = attributesByTag[tagName];
      if (name.indexOf('on') === 0 || (!globalAttributes.has(name) && !(tagAttributes && tagAttributes.has(name)))) {
        element.removeAttribute(attribute.name);
        return;
      }
      if ((name === 'href' || name === 'src') && !isSafeUrl(attribute.value, tagName)) {
        element.removeAttribute(attribute.name);
      }
    });

    if (tagName === 'A' && element.getAttribute('target') === '_blank') {
      element.setAttribute('rel', 'noopener noreferrer');
    }
    if (tagName === 'IMG' && !element.getAttribute('loading')) {
      element.setAttribute('loading', 'lazy');
    }
  }

  function fallbackSanitize(raw) {
    if (!global.DOMParser) {
      const holder = global.document.createElement('div');
      holder.textContent = raw;
      return holder.innerHTML;
    }

    const document = new global.DOMParser().parseFromString('<body>' + raw + '</body>', 'text/html');
    Array.from(document.body.querySelectorAll('*')).forEach(sanitizeElement);
    return document.body.innerHTML;
  }

  global.ClowSanitizeHtml = function ClowSanitizeHtml(value) {
    const raw = String(value || '');
    if (global.DOMPurify && typeof global.DOMPurify.sanitize === 'function') {
      return global.DOMPurify.sanitize(raw);
    }
    return fallbackSanitize(raw);
  };
})(window);
