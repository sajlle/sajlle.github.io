'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

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
      path.join(hexo.base_dir, 'templates/seasonal-brand.njk'), 'utf8'
    ));
    injects.bodyEnd.file(`${name}-edge`, `source/_data/${name}-edge.njk`);
  }

  if (selected === 'halloween' && hexo.theme.config.back2top.enable && !hexo.theme.config.back2top.sidebar) {
    const widgets = fs.readFileSync(path.join(hexo.theme_dir, 'layout/_partials/widgets.njk'), 'utf8');
    const control = /<div class="back-to-top" role="button"[^>]*>[\s\S]*?<\/div>/;
    if (!control.test(widgets)) throw new Error('NexT back-to-top template changed; review the Halloween control.');
    const pumpkin = fs.readFileSync(path.join(hexo.base_dir, 'templates/halloween-pumpkin.njk'), 'utf8');
    hexo.theme.setView('_partials/widgets.njk', widgets.replace(control, () => pumpkin));
    injects.style.push('source/_data/halloween-pumpkin.styl');
    const version = createHash('sha256')
      .update(fs.readFileSync(path.join(hexo.source_dir, 'js/halloween-pumpkin.js')))
      .digest('hex').slice(0, 12);
    injects.bodyEnd.raw('halloween-pumpkin',
      `<script src="{{ url_for('/js/halloween-pumpkin.js?v=${version}') }}" defer></script>`);
  }

  injects.style.push(`source/_data/${name}.styl`);
  injects.header.file(name, `source/_data/${name}.njk`);
});
