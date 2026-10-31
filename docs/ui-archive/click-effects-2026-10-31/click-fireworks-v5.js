(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  if (window.__clickFxInited__) return;
  window.__clickFxInited__ = true;

  const CONFIG = {
    zIndex: 9999,

    // 6:00 - 18:59 视为白天
    dayStartHour: 6,
    nightStartHour: 19,

    // 特殊节日：MM-DD 可复用；七夕这种每年改一次公历日期
    specialDates: {
      heart: [
        '02-14',
        '2026-08-19',
        '2026-04-16'
      ]
    },

    // 常见深色模式标记。不同 NexT 版本不完全一样，所以我给你放宽一点。
    darkMode: {
      classNames: [
        'dark',
        'next-dark',
        'darkmode',
        'theme-dark',
        'mode-dark'
      ],
      dataThemeValues: [
        'dark'
      ]
    },

    modeConfig: {
      firework: {
        desktopCount: 28,
        mobileCount: 16,
        gravity: 0.06,
        friction: 0.985,
        ringDuration: 22,
        particleLifeMin: 22,
        particleLifeMax: 38,
        maxTrail: 6,
        glowRadius: { mobile: 28, desktop: 40 },
        colors: {
          light: ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#a78bfa', '#f72585', '#f77f00'],
          dark:  ['#ff7aa2', '#ffd166', '#00f5d4', '#4cc9f0', '#b388ff', '#ff4d6d', '#ff9e00']
        }
      },
      star: {
        desktopCount: 22,
        mobileCount: 12,
        gravity: 0.025,
        friction: 0.988,
        ringDuration: 18,
        particleLifeMin: 28,
        particleLifeMax: 46,
        maxTrail: 8,
        glowRadius: { mobile: 22, desktop: 32 },
        colors: {
          light: ['#dbeafe', '#bfdbfe', '#93c5fd', '#c4b5fd', '#e9d5ff', '#fde68a'],
          dark:  ['#dbeafe', '#93c5fd', '#60a5fa', '#818cf8', '#c4b5fd', '#e9d5ff']
        }
      },
      heart: {
        desktopCount: 24,
        mobileCount: 14,
        gravity: 0.035,
        friction: 0.987,
        ringDuration: 20,
        particleLifeMin: 24,
        particleLifeMax: 40,
        maxTrail: 7,
        glowRadius: { mobile: 24, desktop: 34 },
        colors: {
          light: ['#ff4d6d', '#ff758f', '#ff8fa3', '#ffb3c1', '#fb6f92', '#ffc2d1'],
          dark:  ['#ff4d8d', '#ff5c8a', '#ff85a1', '#ff99ac', '#ffb3c1', '#ffd6e0']
        }
      }
    }
  };

  let canvas = null;
  let ctx = null;
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let width = window.innerWidth;
  let height = window.innerHeight;
  let rafId = null;
  let currentScheme = 'light';
  let observer = null;

  const particles = [];
  const rings = [];

  function isMobile() {
    return window.innerWidth < 768;
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pad(num) {
    return String(num).padStart(2, '0');
  }

  function getDateKeys(date) {
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    return {
      full: `${y}-${m}-${d}`,
      md: `${m}-${d}`
    };
  }

  function isSpecialDate(type, date = new Date()) {
    const list = CONFIG.specialDates[type] || [];
    const keys = getDateKeys(date);
    return list.includes(keys.full) || list.includes(keys.md);
  }

  function hasDarkClass(el) {
    if (!el) return false;
    return CONFIG.darkMode.classNames.some(cls => el.classList.contains(cls));
  }

  function hasDarkDataTheme(el) {
    if (!el) return false;
    const v1 = (el.getAttribute('data-theme') || '').toLowerCase();
    const v2 = (el.dataset && el.dataset.theme ? el.dataset.theme : '').toLowerCase();
    return CONFIG.darkMode.dataThemeValues.includes(v1) || CONFIG.darkMode.dataThemeValues.includes(v2);
  }

  function detectDarkMode() {
    const html = document.documentElement;
    const body = document.body;

    if (hasDarkClass(html) || hasDarkClass(body) || hasDarkDataTheme(html) || hasDarkDataTheme(body)) {
      return true;
    }

    // 某些主题会设置 color-scheme
    const computed = getComputedStyle(html).colorScheme || '';
    if (String(computed).toLowerCase().includes('dark')) {
      return true;
    }

    // 最后退回系统偏好
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function updateColorScheme() {
    currentScheme = detectDarkMode() ? 'dark' : 'light';
  }

  function getEffectMode(date = new Date()) {
    if (isSpecialDate('heart', date)) return 'heart';

    const hour = date.getHours();
    const isNight = hour >= CONFIG.nightStartHour || hour < CONFIG.dayStartHour;
    return isNight ? 'star' : 'firework';
  }

  function getModeSettings(mode) {
    return CONFIG.modeConfig[mode] || CONFIG.modeConfig.firework;
  }

  function getPalette(mode) {
    const settings = getModeSettings(mode);
    return settings.colors[currentScheme] || settings.colors.light;
  }

  function ensureCanvas() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = 'click-particles-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.zIndex = String(CONFIG.zIndex);
    canvas.setAttribute('aria-hidden', 'true');

    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });

    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;

    dpr = Math.max(1, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  class Ring {
    constructor(x, y, color, mode) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.mode = mode;
      this.age = 0;

      const settings = getModeSettings(mode);
      this.life = settings.ringDuration;
      this.radius = 8;
      this.maxRadius = isMobile()
        ? settings.glowRadius.mobile + 6
        : settings.glowRadius.desktop + 8;
      this.lineWidth = mode === 'star' ? 1.8 : 2.4;
      this.alpha = mode === 'star' ? 0.5 : 0.75;
    }

    update() {
      this.age += 1;
      const progress = this.age / this.life;
      this.radius = 8 + (this.maxRadius - 8) * progress;
      this.alpha = (this.mode === 'star' ? 0.5 : 0.75) * (1 - progress);
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(this.alpha, 0);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.lineWidth = this.lineWidth;
      ctx.strokeStyle = this.color;
      ctx.shadowBlur = this.mode === 'star' ? 10 : 14;
      ctx.shadowColor = this.color;
      ctx.stroke();
      ctx.restore();
    }

    alive() {
      return this.age < this.life;
    }
  }

  class Particle {
    constructor(x, y, angle, speed, color, mode) {
      this.x = x;
      this.y = y;
      this.mode = mode;
      this.color = color;

      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      const settings = getModeSettings(mode);
      this.gravity = settings.gravity;
      this.friction = settings.friction;
      this.life = Math.floor(random(settings.particleLifeMin, settings.particleLifeMax));
      this.maxTrail = settings.maxTrail;

      if (mode === 'star') {
        this.size = random(isMobile() ? 3.2 : 4.2, isMobile() ? 5.2 : 7.2);
      } else if (mode === 'heart') {
        this.size = random(isMobile() ? 5.5 : 6.5, isMobile() ? 8.5 : 10.5);
      } else {
        this.size = random(isMobile() ? 1.8 : 2.0, isMobile() ? 3.3 : 4.3);
      }

      this.age = 0;
      this.alpha = 1;
      this.trail = [];
      this.rotation = random(0, Math.PI * 2);
      this.spin = random(-0.08, 0.08);
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrail) this.trail.shift();

      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;

      this.x += this.vx;
      this.y += this.vy;

      this.rotation += this.spin;
      this.age += 1;
      this.alpha = Math.max(0, 1 - this.age / this.life);
    }

    drawTrail(ctx) {
      if (this.trail.length < 2) return;

      ctx.save();
      for (let i = 0; i < this.trail.length - 1; i++) {
        const p1 = this.trail[i];
        const p2 = this.trail[i + 1];
        const t = i / this.trail.length;
        ctx.globalAlpha = this.alpha * t * (this.mode === 'star' ? 0.25 : 0.45);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = Math.max(1, this.size * 0.45 * t);
        ctx.strokeStyle = this.color;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawDot(ctx) {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    drawStar(ctx) {
      const spikes = 5;
      const outerRadius = this.size;
      const innerRadius = this.size * 0.45;
      let rot = -Math.PI / 2;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(0, -outerRadius);

      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(Math.cos(rot) * outerRadius, Math.sin(rot) * outerRadius);
        rot += step;
        ctx.lineTo(Math.cos(rot) * innerRadius, Math.sin(rot) * innerRadius);
        rot += step;
      }

      ctx.closePath();
      ctx.fill();
    }

    drawHeart(ctx) {
      const s = this.size * 0.12;
      ctx.beginPath();
      ctx.moveTo(0, 2.8 * s);
      ctx.bezierCurveTo(5 * s, -1.5 * s, 10 * s, 3.5 * s, 0, 10 * s);
      ctx.bezierCurveTo(-10 * s, 3.5 * s, -5 * s, -1.5 * s, 0, 2.8 * s);
      ctx.closePath();
      ctx.fill();
    }

    drawShape(ctx) {
      if (this.mode === 'star') {
        this.drawStar(ctx);
      } else if (this.mode === 'heart') {
        this.drawHeart(ctx);
      } else {
        this.drawDot(ctx);
      }
    }

    draw(ctx) {
      this.drawTrail(ctx);

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = this.mode === 'star' ? 12 : 10;
      ctx.shadowColor = this.color;
      this.drawShape(ctx);
      ctx.restore();
    }

    alive() {
      return this.age < this.life && this.alpha > 0.01;
    }
  }

  function renderBackgroundGlow(x, y, mode) {
    const settings = getModeSettings(mode);
    const radius = isMobile() ? settings.glowRadius.mobile : settings.glowRadius.desktop;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

    if (mode === 'star') {
      if (currentScheme === 'dark') {
        gradient.addColorStop(0, 'rgba(147,197,253,0.16)');
        gradient.addColorStop(1, 'rgba(147,197,253,0)');
      } else {
        gradient.addColorStop(0, 'rgba(255,255,255,0.14)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      }
    } else if (mode === 'heart') {
      if (currentScheme === 'dark') {
        gradient.addColorStop(0, 'rgba(255,105,180,0.18)');
        gradient.addColorStop(1, 'rgba(255,105,180,0)');
      } else {
        gradient.addColorStop(0, 'rgba(255,105,140,0.16)');
        gradient.addColorStop(1, 'rgba(255,105,140,0)');
      }
    } else {
      if (currentScheme === 'dark') {
        gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      } else {
        gradient.addColorStop(0, 'rgba(255,255,255,0.20)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
      }
    }

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function spawnBurst(x, y) {
    updateColorScheme();

    const mode = getEffectMode(new Date());
    const settings = getModeSettings(mode);
    const palette = getPalette(mode);
    const count = isMobile() ? settings.mobileCount : settings.desktopCount;
    const ringColor = pick(palette);

    rings.push(new Ring(x, y, ringColor, mode));

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + random(-0.14, 0.14);

      let speed;
      if (mode === 'star') {
        speed = random(isMobile() ? 1.1 : 1.4, isMobile() ? 2.6 : 3.4);
      } else if (mode === 'heart') {
        speed = random(isMobile() ? 1.2 : 1.5, isMobile() ? 3.0 : 3.9);
      } else {
        speed = random(isMobile() ? 1.4 : 1.8, isMobile() ? 3.5 : 4.9);
      }

      const color = pick(palette);
      particles.push(new Particle(x, y, angle, speed, color, mode));
    }

    startLoop();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, width, height);

    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.update();
      renderBackgroundGlow(ring.x, ring.y, ring.mode);
      ring.draw(ctx);
      if (!ring.alive()) rings.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (!p.alive()) particles.splice(i, 1);
    }

    if (rings.length === 0 && particles.length === 0) {
      stopLoop();
    }
  }

  function startLoop() {
    if (rafId) return;
    loop();
  }

  function stopLoop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = null;
    ctx.clearRect(0, 0, width, height);
  }

  // 是否是可选元素
  function isSelectableElement(el) {
    if (!el || !(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    return style.userSelect !== 'none' && style.webkitUserSelect !== 'none';
  }

  // 是否越过了可选元素
  function isOverSelectableText(x, y, fallbackTarget) {
    let node = null;

    // 标准接口
    if (document.caretPositionFromPoint) {
      const pos = document.caretPositionFromPoint(x, y);
      node = pos && pos.offsetNode;
    }
    // 兼容 Chromium / Safari 老接口
    else if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(x, y);
      node = range && range.startContainer;
    }

    // 真正点在文字字形上
    if (node && node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.trim().length > 0) {
        const parentEl = node.parentElement;
        if (parentEl && isSelectableElement(parentEl)) {
          return true;
        }
      }
    }

    // 兜底：一些正文/代码/标题区域，也视为“常见选字区”
    if (!fallbackTarget || !(fallbackTarget instanceof Element)) return false;

    const textLikeEl = fallbackTarget.closest(
      'p, li, blockquote, pre, code, td, th, h1, h2, h3, h4, h5, h6, figcaption, .post-title, .highlight'
    );

    if (!textLikeEl) return false;

    return isSelectableElement(textLikeEl) && ((textLikeEl.textContent || '').trim().length > 0);
  }

  function shouldIgnoreTarget(target) {
    if (!target || !(target instanceof Element)) return false;

    return !!target.closest(
      'a, button, input, textarea, select, option, label, summary, audio, video, iframe, [contenteditable="true"], .menu-item, .site-nav-toggle'
    );
  }

  function handlePointerDown(e) {
    if (typeof e.button === 'number' && e.button !== 0) return;
    if (shouldIgnoreTarget(e.target)) return;

    const x = e.clientX;
    const y = e.clientY;

    if (x < 2 || y < 2 || x > width - 2 || y > height - 2) return;

//     // 已经有选中的文字时，不炸
//     const selection = window.getSelection();
//     if (selection && !selection.isCollapsed) return;
//
//     // 点在可选文字上时，不炸
//     if (isOverSelectableText(x, y, e.target)) return;

    spawnBurst(x, y);
  }

  function observeThemeChange() {
    const targetNodes = [document.documentElement, document.body].filter(Boolean);
    if (!targetNodes.length) return;

    observer = new MutationObserver(() => {
      updateColorScheme();
    });

    targetNodes.forEach(node => {
      observer.observe(node, {
        attributes: true,
        attributeFilter: ['class', 'data-theme']
      });
    });

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateColorScheme);
    } else if (typeof media.addListener === 'function') {
      media.addListener(updateColorScheme);
    }
  }

  function init() {
    updateColorScheme();
    ensureCanvas();
    observeThemeChange();

    window.addEventListener('resize', resizeCanvas, { passive: true });
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();