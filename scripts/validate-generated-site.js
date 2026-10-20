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
});
