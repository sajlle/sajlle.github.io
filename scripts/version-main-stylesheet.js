'use strict';

const { createHash } = require('node:crypto');
const path = require('node:path');

async function readRoute(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

// Version the generated CSS, including NexT's injected seasonal styles. The
// preload and stylesheet must use the same URL so returning readers never
// combine a new control's HTML with a still-fresh copy of the old stylesheet.
hexo.extend.filter.register('after_generate', async function versionMainStylesheet() {
  const cssRoute = path.posix.join(this.theme.config.css, 'main.css').replace(/^\/+/, '');
  const stream = this.route.get(cssRoute);
  if (!stream) throw new Error(`Cannot version missing stylesheet: ${cssRoute}`);
  const css = await readRoute(stream);
  const version = createHash('sha256').update(css).digest('hex').slice(0, 12);
  const href = this.config.root.replace(/\/?$/, '/') + cssRoute;
  const versionedHref = `${href}?v=${version}`;

  // Freeze the exact bytes used to compute the version for this generation.
  this.route.set(cssRoute, css);
  await Promise.all(this.route.list().filter(route => route.endsWith('.html')).map(async route => {
    const html = (await readRoute(this.route.get(route))).toString('utf8');
    const updated = html.replace(/<link\b[^>]*>/gi, tag => tag.replace(
      /\bhref\s*=\s*(["'])([^"']*)\1/i,
      (attribute, quote, url) => url.split(/[?#]/)[0] === href
        ? `href=${quote}${versionedHref}${quote}`
        : attribute
    ));
    if (updated !== html) this.route.set(route, updated);
  }));
}, 8);
