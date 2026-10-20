'use strict';

const { full_url_for: fullUrlFor, stripHTML } = require('hexo-util');

function cleanText(value, limit = 200) {
  const text = stripHTML(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function isoDate(value) {
  if (!value) return undefined;

  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function canonicalUrl(context) {
  let canonical = context.url.replace(/index\.html$/, '');

  if (!context.config.permalink.endsWith('.html')) {
    canonical = canonical.replace(/\.html$/, '');
  }

  return canonical;
}

function tagNames(tags) {
  if (!tags || !tags.length) return undefined;

  const list = typeof tags.toArray === 'function' ? tags.toArray() : tags;
  return Array.from(list, tag => tag.name).filter(Boolean);
}

function pageImage(context) {
  const { page, theme } = context;
  const photos = Array.isArray(page.photos) ? page.photos : [];
  const image = page.image || page.cover || page.thumbnail || photos[0] || theme.avatar?.url;

  return image ? fullUrlFor.call(context, image) : undefined;
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function readRoute(routeStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    routeStream.on('data', chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });
    routeStream.on('error', reject);
    routeStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function isListingRoute(route) {
  return /^(archives|categories|tags)\//.test(route) || /^page\/[2-9]\d*\//.test(route);
}

hexo.extend.helper.register('seo_json_ld', function seoJsonLd() {
  const { config, page } = this;
  const homeUrl = fullUrlFor.call(this, '/');
  const siteId = `${homeUrl}#website`;
  const language = page.lang || page.language || config.language;
  const author = {
    '@type': 'Person',
    name: config.author,
    url: fullUrlFor.call(this, '/about/'),
    sameAs: ['https://github.com/sajlle']
  };

  let data;

  if (page.__post) {
    const canonical = canonicalUrl(this);
    const description = cleanText(
      page.description || page.excerpt || page.content || config.description
    );
    const image = pageImage(this);

    data = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${canonical}#blogposting`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': canonical
      },
      headline: cleanText(page.title, 110),
      description,
      datePublished: isoDate(page.date),
      dateModified: isoDate(page.updated || page.date),
      inLanguage: language,
      image: image ? [image] : undefined,
      keywords: tagNames(page.tags),
      author,
      publisher: author,
      isPartOf: {
        '@type': 'Blog',
        '@id': siteId
      }
    };
  } else if (page.__index && page.current === 1) {
    data = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': siteId,
      url: homeUrl,
      name: config.title,
      alternateName: config.subtitle,
      description: cleanText(config.description),
      inLanguage: language,
      author
    };
  } else {
    return '';
  }

  return `<script type="application/ld+json">${safeJson(data)}</script>`;
});

hexo.extend.filter.register('theme_inject', injects => {
  injects.head.raw('seo-json-ld', '{{ seo_json_ld() | safe }}');
});

hexo.extend.filter.register('after_generate', async function markListingPagesNoindex() {
  const listingRoutes = this.route.list().filter(route => {
    return route.endsWith('.html') && isListingRoute(route);
  });

  await Promise.all(listingRoutes.map(async route => {
    const html = (await readRoute(this.route.get(route))).toString('utf8');

    if (html.includes('<meta name="robots" content="noindex">')) return;

    const markedHtml = html.replace(
      '</head>',
      '<meta name="robots" content="noindex">\n</head>'
    );
    this.route.set(route, markedHtml);
  }));
}, 5);
