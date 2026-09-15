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

  const requiredRoutes = {
    'sitemap.xml': '<urlset',
    'robots.txt': 'Sitemap: https://sajlle.github.io/sitemap.xml',
    'atom.xml': '<feed'
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

  const tagsIndex = (await readRoute(this.route.get('tags/index.html'))).toString('utf8');
  if (!tagsIndex.includes('<meta name="robots" content="noindex">')) {
    throw new Error('Generated tag listing is missing its noindex directive.');
  }
});
