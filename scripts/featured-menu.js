'use strict';

// Alternate theme config is deep-merged with NexT, so 精选 would normally be
// appended after GitHub. Put it right after home so first-time readers see it.
// Runs after the Series filter (priority -10), which rebuilds the menu object.
hexo.extend.filter.register('before_generate', function placeFeaturedMenuAfterHome() {
  const menu = this.theme.config.menu;
  if (!menu || !Object.prototype.hasOwnProperty.call(menu, '精选')) return;

  const featuredMenuItem = menu['精选'];
  const orderedMenu = {};
  let inserted = false;

  Object.entries(menu).forEach(([name, value]) => {
    if (name === '精选') return;
    orderedMenu[name] = value;
    if (!inserted && name === 'home') {
      orderedMenu['精选'] = featuredMenuItem;
      inserted = true;
    }
  });

  if (!inserted) orderedMenu['精选'] = featuredMenuItem;
  this.theme.config.menu = orderedMenu;
}, -9);
