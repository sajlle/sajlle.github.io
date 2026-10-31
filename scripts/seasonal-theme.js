'use strict';

const fs = require('node:fs');
const path = require('node:path');

const THEMES = {
  original: null,
  'mid-autumn': 'mid-autumn-theme',
  halloween: 'halloween-theme',
  autumn: 'autumn-theme'
};

hexo.extend.filter.register('theme_inject', injects => {
  // Older checkouts can keep using the original boolean configuration.
  // The named setting takes precedence so seasonal styles never overlap.
  const selected = hexo.config.seasonalTheme
    ?? (hexo.config.midAutumnTheme === true ? 'mid-autumn' : 'original');

  if (!Object.hasOwn(THEMES, selected)) {
    throw new Error(`Unknown seasonalTheme: ${selected}. Choose ${Object.keys(THEMES).join(', ')}.`);
  }

  const name = THEMES[selected];
  if (!name) return;

  if (selected === 'halloween' || selected === 'autumn') {
    // Seasonal palettes have a fixed reading mode, independent of the OS.
    // Reuse its installed syntax theme before NexT resolves highlighting.
    const theme = hexo.theme.config;
    const codeTheme = theme.codeblock.theme[selected === 'halloween' ? 'dark' : 'light'];
    theme.codeblock.theme = { light: codeTheme, dark: codeTheme };
    const color = selected === 'halloween' ? '#1c1924' : '#f3eee5';
    theme.theme_color = { light: color, dark: color };

    // Override the brand partial in memory, leaving the NexT checkout intact.
    hexo.theme.setView('_partials/header/brand.njk', fs.readFileSync(
      path.join(hexo.base_dir, 'source/_data/seasonal-brand.njk'), 'utf8'
    ));
    injects.bodyEnd.file(`${name}-edge`, `source/_data/${name}-edge.njk`);
  }

  injects.style.push(`source/_data/${name}.styl`);
  injects.header.file(name, `source/_data/${name}.njk`);
});
