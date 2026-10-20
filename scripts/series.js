'use strict';

const { createHash } = require('crypto');
const { escapeHTML } = require('hexo-util');

const SERIES_DIRECTORY_PATH = 'series/';
const FALLBACK_DESCRIPTION = '简介待补充。';

function toArray(collection) {
  if (!collection) return [];
  return typeof collection.toArray === 'function' ? collection.toArray() : Array.from(collection);
}

function normalizeSeriesKey(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === undefined || candidate === null) return '';
  return String(candidate).trim();
}

function numericSeriesOrder(value) {
  if (value === '' || value === undefined || value === null) return null;

  const order = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isInteger(order) ? order : null;
}

function postTimestamp(post) {
  if (!post?.date) return Number.MAX_SAFE_INTEGER;

  const date = typeof post.date.toDate === 'function' ? post.date.toDate() : new Date(post.date);
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function comparePostsByDate(left, right) {
  const dateDifference = postTimestamp(left) - postTimestamp(right);
  if (dateDifference !== 0) return dateDifference;

  return String(left.title || left.path || '').localeCompare(
    String(right.title || right.path || ''),
    'zh-CN'
  );
}

function orderSeriesPosts(seriesPosts) {
  const explicitOrders = new Set(
    seriesPosts
      .map(post => numericSeriesOrder(post.series_order))
      .filter(order => order !== null)
  );
  const fallbackPosts = seriesPosts
    .filter(post => numericSeriesOrder(post.series_order) === null)
    .sort(comparePostsByDate);
  let fallbackOrder = 0;
  const fallbackOrders = new Map();

  fallbackPosts.forEach(post => {
    while (explicitOrders.has(fallbackOrder)) fallbackOrder += 1;
    fallbackOrders.set(post, fallbackOrder);
    fallbackOrder += 1;
  });

  return seriesPosts.map(post => {
    const configuredOrder = numericSeriesOrder(post.series_order);
    return {
      post,
      episode: configuredOrder === null ? fallbackOrders.get(post) : configuredOrder,
      explicit: configuredOrder !== null
    };
  }).sort((left, right) => {
    if (left.episode !== right.episode) return left.episode - right.episode;
    if (left.explicit !== right.explicit) return left.explicit ? -1 : 1;
    return comparePostsByDate(left.post, right.post);
  });
}

function seriesMetadata(data, key) {
  const configured = data && typeof data === 'object' ? data[key] : undefined;

  if (typeof configured === 'string') {
    return {
      title: key,
      description: configured.trim() || FALLBACK_DESCRIPTION
    };
  }

  if (configured && typeof configured === 'object') {
    return {
      title: String(configured.title || key).trim() || key,
      description: String(configured.description || '').trim() || FALLBACK_DESCRIPTION
    };
  }

  return {
    title: key,
    description: FALLBACK_DESCRIPTION
  };
}

function seriesAnchor(key) {
  const digest = createHash('sha1').update(key).digest('hex').slice(0, 12);
  return `series-${digest}`;
}

function buildSeriesGroups(posts, data) {
  const postsBySeries = new Map();

  toArray(posts).forEach(post => {
    const key = normalizeSeriesKey(post.series);
    if (!key) return;

    if (!postsBySeries.has(key)) postsBySeries.set(key, []);
    postsBySeries.get(key).push(post);
  });

  const configuredKeys = data && typeof data === 'object' ? Object.keys(data) : [];
  const configuredPositions = new Map(configuredKeys.map((key, index) => [key, index]));

  return Array.from(postsBySeries, ([key, seriesPosts]) => {
    const metadata = seriesMetadata(data, key);
    const orderedPosts = orderSeriesPosts(seriesPosts);

    return {
      key,
      ...metadata,
      anchor: seriesAnchor(key),
      posts: orderedPosts
    };
  }).sort((left, right) => {
    const leftPosition = configuredPositions.get(left.key);
    const rightPosition = configuredPositions.get(right.key);
    const leftConfigured = leftPosition !== undefined;
    const rightConfigured = rightPosition !== undefined;

    if (leftConfigured && rightConfigured) return leftPosition - rightPosition;
    if (leftConfigured) return -1;
    if (rightConfigured) return 1;
    return left.title.localeCompare(right.title, 'zh-CN');
  });
}

function rootUrl(root, path = '') {
  const normalizedRoot = String(root || '/').replace(/\/?$/, '/');
  return `${normalizedRoot}${String(path).replace(/^\/+/, '')}`;
}

function formatDate(value) {
  if (!value) return null;

  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    display: `${year}-${month}-${day}`,
    datetime: `${year}-${month}-${day}`
  };
}

function renderSeriesCatalog(groups, root) {
  if (!groups.length) {
    return `<div class="series-catalog series-catalog--empty">
      <p class="series-catalog__intro">Series 是作者策展的阅读集合，与分类和标签不同。</p>
      <p>还没有文章加入系列。</p>
    </div>`;
  }

  const cards = groups.map(group => {
    const items = group.posts.map(({ post, episode }) => {
      const date = formatDate(post.date);
      const dateHtml = date
        ? `<time class="series-card__date" datetime="${date.datetime}">${date.display}</time>`
        : '';

      return `<li class="series-card__item">
        <span class="series-card__episode">第 ${escapeHTML(String(episode))} 集</span>
        <div class="series-card__post">
          <a class="series-card__link" href="${escapeHTML(rootUrl(root, post.path))}">${escapeHTML(post.title || '未命名文章')}</a>
          ${dateHtml}
        </div>
      </li>`;
    }).join('\n');

    return `<section class="series-card" id="${group.anchor}" aria-labelledby="${group.anchor}-title">
      <header class="series-card__header">
        <div>
          <p class="series-card__eyebrow">系列目录</p>
          <h2 class="series-card__title" id="${group.anchor}-title">${escapeHTML(group.title)}</h2>
          <p class="series-card__description">${escapeHTML(group.description)}</p>
        </div>
        <span class="series-card__count">共 ${group.posts.length} 篇</span>
      </header>
      <ol class="series-card__list">
        ${items}
      </ol>
    </section>`;
  }).join('\n');

  return `<div class="series-catalog" data-series-count="${groups.length}">
    <p class="series-catalog__intro">Series 是作者策展的阅读集合：它按阅读顺序组织文章，不等同于分类或标签。</p>
    ${cards}
  </div>`;
}

function samePost(left, right) {
  if (left === right) return true;
  if (left?._id && right?._id && String(left._id) === String(right._id)) return true;
  if (left?.source && right?.source && left.source === right.source) return true;
  return Boolean(left?.path && right?.path && left.path === right.path);
}

function navigationLink(post, direction, root) {
  const isPrevious = direction === 'previous';
  const label = isPrevious ? '← 上一篇' : '下一篇 →';
  const className = `series-post-nav__link series-post-nav__link--${direction}`;

  if (!post) {
    return `<span class="${className} is-disabled" aria-hidden="true">${label}</span>`;
  }

  const title = escapeHTML(post.title || '未命名文章');
  return `<a class="${className}" href="${escapeHTML(rootUrl(root, post.path))}" title="${title}" aria-label="${isPrevious ? '上一篇' : '下一篇'}：${title}">${label}</a>`;
}

hexo.extend.filter.register('template_locals', locals => {
  if (locals.page?.type !== 'series') return locals;

  const groups = buildSeriesGroups(locals.site.posts, locals.site.data?.series);
  locals.page.content = renderSeriesCatalog(groups, locals.config.root);
  return locals;
}, 20);

hexo.extend.helper.register('series_post_navigation', function seriesPostNavigation() {
  const page = this.page;
  const key = normalizeSeriesKey(page?.series);
  if (!page?.__post || !key) return '';

  const groups = buildSeriesGroups(this.site.posts, this.site.data?.series);
  const group = groups.find(candidate => candidate.key === key);
  if (!group) return '';

  const currentIndex = group.posts.findIndex(item => samePost(item.post, page));
  if (currentIndex < 0) return '';

  const current = group.posts[currentIndex];
  const previous = group.posts[currentIndex - 1]?.post;
  const next = group.posts[currentIndex + 1]?.post;
  const directoryUrl = `${rootUrl(this.config.root, SERIES_DIRECTORY_PATH)}#${group.anchor}`;

  return `<nav class="series-post-nav" aria-label="系列文章导航">
    <a class="series-post-nav__context" href="${escapeHTML(directoryUrl)}">
      <span class="series-post-nav__label">所属系列</span>
      <strong>${escapeHTML(group.title)} · 第 ${escapeHTML(String(current.episode))} 集</strong>
    </a>
    <div class="series-post-nav__links">
      ${navigationLink(previous, 'previous', this.config.root)}
      <a class="series-post-nav__directory" href="${escapeHTML(directoryUrl)}">查看系列目录</a>
      ${navigationLink(next, 'next', this.config.root)}
    </div>
  </nav>`;
});

hexo.extend.filter.register('theme_inject', injects => {
  injects.postBodyEnd.raw(
    'series-post-navigation',
    '{{ series_post_navigation() | safe }}'
  );
});

// Alternate theme config is deep-merged with NexT, so a new item would normally
// be appended after GitHub. Keep the configured Series item beside taxonomies.
hexo.extend.filter.register('before_generate', function placeSeriesMenuBesideTaxonomies() {
  const menu = this.theme.config.menu;
  if (!menu || !Object.prototype.hasOwnProperty.call(menu, '系列')) return;

  const seriesMenuItem = menu['系列'];
  const orderedMenu = {};
  let inserted = false;

  Object.entries(menu).forEach(([name, value]) => {
    if (name === '系列') return;
    if (!inserted && name === 'archives') {
      orderedMenu['系列'] = seriesMenuItem;
      inserted = true;
    }
    orderedMenu[name] = value;
  });

  if (!inserted) orderedMenu['系列'] = seriesMenuItem;
  this.theme.config.menu = orderedMenu;
}, -10);
