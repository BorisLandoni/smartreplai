// Localisation, applied to the markup rather than baked into it.
//
// WebExtensions ship translations in _locales/<lang>/messages.json and Thunderbird picks the
// catalogue matching the user's language, falling back to default_locale. What the platform does
// NOT do is touch the DOM: browser.i18n.getMessage returns a string and nothing else. So the HTML
// carries data-i18n attributes naming a key, and this file swaps the text in on load.
//
// Keeping the mapping in attributes rather than in code means a new language is one more JSON
// file and no code change at all.

/**
 * Look up a translated string. Falls back to the key itself, which is deliberately visible: a
 * missing translation should look wrong during development rather than silently render as an
 * empty label in front of a user.
 */
function t(key, substitutions) {
  const message = browser.i18n.getMessage(key, substitutions);
  return message || key;
}

function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(element => {
    const message = t(element.dataset.i18n);

    // Only the element's own text is replaced. Writing textContent would blow away child nodes,
    // and several headings here wrap an icon or a "(optional)" badge that must survive.
    const textNode = Array.from(element.childNodes).find(
      node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
    );

    if (textNode) {
      textNode.textContent = message;
    } else {
      element.insertBefore(document.createTextNode(message), element.firstChild);
    }
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });

  root.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.title = t(element.dataset.i18nTitle);
  });

  root.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
}

// Runs before the page's own scripts get to read any label, so nothing captures the untranslated
// text and reuses it later.
document.addEventListener('DOMContentLoaded', () => applyTranslations());
