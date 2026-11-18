'use strict';

const { escapeHTML } = require('hexo-util');

// Apple supplies the player; this tag only turns a share URL into its embed URL.
// https://artists.apple.com/support/1117-apple-music-marketing-tools
hexo.extend.tag.register('apple_music', function appleMusic(args) {
  if (!args[0] || args.length > 2) {
    throw new Error('apple_music 用法：{% apple_music "Apple Music 分享链接" "可选标题" %}');
  }

  let url;
  try {
    url = new URL(args[0]);
  } catch {
    throw new Error('apple_music 需要完整的 https://music.apple.com/ 分享链接。');
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || !['music.apple.com', 'embed.music.apple.com'].includes(url.hostname)) {
    throw new Error('apple_music 只支持 Apple Music 官方 HTTPS 链接。');
  }

  const resource = url.pathname.match(/^\/[a-z]{2}\/(song|album|playlist)\/(?:[^/]+\/)?([^/]+)\/?$/i);
  const type = resource?.[1].toLowerCase();
  const id = resource?.[2];
  const validId = type === 'playlist' ? /^pl\.[a-z0-9.-]+$/i.test(id) : /^\d+$/.test(id);
  if (!resource || !validId) {
    throw new Error('apple_music 需要单曲、专辑或歌单链接，且链接中必须包含地区和内容 ID。');
  }

  const songId = type === 'album' ? url.searchParams.get('i') : null;
  if (songId !== null && !/^\d+$/.test(songId)) {
    throw new Error('apple_music 链接中的单曲参数 i 必须是数字 ID。');
  }

  // Retain the selected song and optional official appearance, not share tracking.
  const query = new URLSearchParams();
  if (songId) query.set('i', songId);
  const theme = url.searchParams.get('theme');
  if (['auto', 'light', 'dark'].includes(theme)) query.set('theme', theme);
  const suffix = query.size ? `?${query}` : '';
  const shareUrl = escapeHTML(`https://music.apple.com${url.pathname}${suffix}`);
  const embedUrl = escapeHTML(`https://embed.music.apple.com${url.pathname}${suffix}`);
  const title = escapeHTML(args[1] || 'Apple Music 播放器');
  const height = type === 'song' || songId ? 175 : 450;

  return `<div class="apple-music-card">`
    + `<iframe class="apple-music-card__player" title="${title}" src="${embedUrl}"`
    + ` width="100%" height="${height}" loading="lazy"`
    + ' allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"'
    + ' referrerpolicy="strict-origin-when-cross-origin"></iframe>'
    + '<p class="apple-music-card__footer">'
    + `<a href="${shareUrl}" target="_blank" rel="noopener noreferrer">在 Apple Music 中打开 ↗</a>`
    + '<span>未登录可试听</span></p></div>';
});

hexo.extend.filter.register('theme_inject', injects => {
  injects.style.push('source/_data/apple-music.styl');
});
