'use strict';

const fs = require('node:fs');
const path = require('node:path');

hexo.extend.filter.register('theme_inject', injects => {
  const configured = hexo.config.mouseEffects ?? 'auto';
  const choices = ['auto', 'legacy', 'bats', 'off'];
  if (!choices.includes(configured)) {
    throw new Error(`Unknown mouseEffects: ${configured}. Choose ${choices.join(', ')}.`);
  }
  const effect = configured === 'auto'
    ? hexo.config.seasonalTheme === 'halloween' ? 'bats' : 'legacy'
    : configured;

  // Remove the old per-post and global tags in memory. The checked-out NexT
  // files and the frozen v5 script remain intact for restoration and upgrades.
  const legacyTag = '<script src="{{ url_for(\'/js/click-fireworks-v5.js\') }}"></script>';
  for (const name of ['_macro/post.njk', '_scripts/index.njk']) {
    const original = fs.readFileSync(path.join(hexo.theme_dir, 'layout', name), 'utf8');
    hexo.theme.setView(name, original.split(legacyTag).join(''));
  }

  if (effect === 'off') return;
  if (effect === 'bats') injects.style.push('source/_data/bat-pointer.styl');
  const file = effect === 'bats' ? 'click-bats-v6.js' : 'click-fireworks-v5.js';
  injects.bodyEnd.raw('mouse-effects',
    `<script src="{{ url_for('/js/${file}') }}" data-mouse-effect="${effect}" defer></script>`);
});
