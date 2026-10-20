'use strict';

function readRoute(routeStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    routeStream.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))));
    routeStream.on('error', reject);
    routeStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

hexo.extend.filter.register('after_generate', async function validateGeneratedSite() {
  const indexRoute = this.route.get('index.html');

  if (!indexRoute) {
    throw new Error('Generated index.html route is missing. Check that the theme was checked out before deploying.');
  }

  const indexHtml = await readRoute(indexRoute);
  const { length } = indexHtml;

  if (length < 1024) {
    throw new Error(
      `Generated index.html is only ${length} bytes. The theme/layout is likely missing, so deployment was stopped.`
    );
  }

  const indexText = indexHtml.toString('utf8');
  if (!indexText.includes('<link rel="canonical" href="https://sajlle.github.io/">')) {
    throw new Error('Generated homepage is missing the expected canonical URL.');
  }
  if (!indexText.includes('<script type="application/ld+json">')) {
    throw new Error('Generated homepage is missing JSON-LD structured data.');
  }

  const mainMenu = indexText.match(/<ul class="main-menu menu">([\s\S]*?)<\/ul>/)?.[1];
  if (!mainMenu || !mainMenu.includes('href="/series/"') || !mainMenu.includes('>系列</a>')) {
    throw new Error('Generated homepage navigation is missing the Series menu item.');
  }

  const tagsPosition = mainMenu.indexOf('href="/tags/"');
  const categoriesPosition = mainMenu.indexOf('href="/categories/"');
  const seriesPosition = mainMenu.indexOf('href="/series/"');
  const archivesPosition = mainMenu.indexOf('href="/archives/"');
  if (!(tagsPosition < categoriesPosition && categoriesPosition < seriesPosition && seriesPosition < archivesPosition)) {
    throw new Error('Series should remain beside tags, categories, and archives in the main navigation.');
  }

  const requiredRoutes = {
    'sitemap.xml': '<urlset',
    'robots.txt': 'Sitemap: https://sajlle.github.io/sitemap.xml',
    'atom.xml': '<feed',
    'ai.txt': 'Hallucinating confidently is not interpretation.',
    'llms.txt': 'A note to AI agents',
    'series/index.html': 'class="series-catalog"',
    'css/main.css': '.series-post-nav'
  };

  for (const [route, expectedText] of Object.entries(requiredRoutes)) {
    const stream = this.route.get(route);
    if (!stream) {
      throw new Error(`Generated ${route} route is missing.`);
    }

    const contents = (await readRoute(stream)).toString('utf8');
    if (!contents.includes(expectedText)) {
      throw new Error(`Generated ${route} does not contain ${expectedText}.`);
    }
  }

  const sitemap = (await readRoute(this.route.get('sitemap.xml'))).toString('utf8');
  if (/https:\/\/sajlle\.github\.io\/(tags|categories)\//.test(sitemap)) {
    throw new Error('Generated sitemap should prioritize posts and standalone pages, not taxonomy listings.');
  }

  const taxonomyRoutes = {
    'tags/index.html': ['tag-cloud', 'href="/tags/'],
    'categories/index.html': ['category-list', 'href="/categories/']
  };

  for (const [route, expectedMarkers] of Object.entries(taxonomyRoutes)) {
    const stream = this.route.get(route);
    if (!stream) {
      throw new Error(`Generated ${route} route is missing.`);
    }

    const contents = (await readRoute(stream)).toString('utf8');
    if (!contents.includes('<meta name="robots" content="noindex">')) {
      throw new Error(`Generated ${route} is missing its noindex directive.`);
    }
    for (const marker of expectedMarkers) {
      if (!contents.includes(marker)) {
        throw new Error(`Generated ${route} is missing its automatic taxonomy marker: ${marker}.`);
      }
    }
  }

  const posts = this.locals.get('posts').toArray();
  const seriesHtml = (await readRoute(this.route.get('series/index.html'))).toString('utf8');
  const seriesData = this.locals.get('data').series || {};
  const postsBySeries = new Map();

  posts.forEach(post => {
    const rawSeries = Array.isArray(post.series) ? post.series[0] : post.series;
    const key = rawSeries === undefined || rawSeries === null ? '' : String(rawSeries).trim();
    if (!key) return;
    if (!postsBySeries.has(key)) postsBySeries.set(key, []);
    postsBySeries.get(key).push(post);
  });

  if (!seriesHtml.includes('class="series-card"') || postsBySeries.size === 0) {
    throw new Error('Generated Series directory should contain at least one curated series card.');
  }

  for (const [key, seriesPosts] of postsBySeries) {
    const configured = seriesData[key];
    const title = configured && typeof configured === 'object' && configured.title
      ? String(configured.title).trim()
      : key;
    const description = typeof configured === 'string'
      ? configured.trim()
      : configured && typeof configured === 'object' && configured.description
        ? String(configured.description).trim()
        : '简介待补充。';
    const expectedMarkers = [title, description || '简介待补充。', `共 ${seriesPosts.length} 篇`];

    seriesPosts.forEach(post => {
      expectedMarkers.push(post.title || '未命名文章');
      const rawOrder = post.series_order;
      const order = rawOrder === undefined || rawOrder === null || rawOrder === ''
        ? null
        : typeof rawOrder === 'number'
          ? rawOrder
          : Number(String(rawOrder).trim());
      if (Number.isInteger(order)) expectedMarkers.push(`第 ${order} 集`);
    });

    for (const marker of expectedMarkers) {
      if (!seriesHtml.includes(marker)) {
        throw new Error(`Generated Series directory is missing: ${marker}.`);
      }
    }
  }

  await Promise.all(posts.map(async post => {
    const stream = this.route.get(post.path);
    if (!stream) {
      throw new Error(`Generated post route is missing: ${post.path}.`);
    }

    const contents = (await readRoute(stream)).toString('utf8');
    const rawSeries = Array.isArray(post.series) ? post.series[0] : post.series;
    const belongsToSeries = rawSeries !== undefined
      && rawSeries !== null
      && String(rawSeries).trim() !== '';
    const hasSeriesNavigation = contents.includes('class="series-post-nav"');

    if (belongsToSeries && !hasSeriesNavigation) {
      throw new Error(`Series post is missing its Series navigation: ${post.path}.`);
    }
    if (!belongsToSeries && hasSeriesNavigation) {
      throw new Error(`Ordinary post unexpectedly contains Series navigation: ${post.path}.`);
    }
    if (hasSeriesNavigation && !contents.includes('查看系列目录')) {
      throw new Error(`Series post is missing its directory link: ${post.path}.`);
    }
  }));
});
