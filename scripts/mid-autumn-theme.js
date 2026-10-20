'use strict';

const STYLE_FILE = 'source/_data/mid-autumn-theme.styl';
const HEADER_FILE = 'source/_data/mid-autumn-theme.njk';

hexo.extend.filter.register('theme_inject', injects => {
  if (hexo.config.midAutumnTheme !== true) return;

  injects.style.push(STYLE_FILE);
  injects.header.file('mid-autumn-theme', HEADER_FILE);
});
