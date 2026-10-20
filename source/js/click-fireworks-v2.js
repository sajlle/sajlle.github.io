(() => {
  'use strict';
  // 点击之后烟花爆炸，烟花加上粒子效果

  // 尊重系统“减少动态效果”
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  // 避免重复初始化
  if (window.__clickFireworksInited__) return;
  window.__clickFireworksInited__ = true;

  const CONFIG = {
    zIndex: 9999,
    desktopParticles: 26, // 改大，烟花会更炸
    mobileParticles: 16, // 改大，烟花会更炸
    gravity: 0.06,
    friction: 0.985,
    ringDuration: 22, // 圆环时间，改小，则圆环时间缩短
    particleLifeMin: 22, // 粒子寿命最小值
    particleLifeMax: 38, // 粒子寿命最大值
    maxTrail: 6,
    colors: [ // 烟花颜色，可以切其他色系
      '#ff6b6b',
      '#ffd166',
      '#06d6a0',
      '#4cc9f0',
      '#a78bfa',
      '#f72585',
      '#f77f00'
    ]
  };

  let canvas = null;
  let ctx = null;
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let width = window.innerWidth;
  let height = window.innerHeight;
  let rafId = null;

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

  function ensureCanvas() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = 'click-fireworks-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = String(CONFIG.zIndex);
    canvas.style.userSelect = 'none';
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
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.age = 0;
      this.life = CONFIG.ringDuration;
      this.radius = 8;
      this.maxRadius = isMobile() ? 34 : 46;
      this.lineWidth = isMobile() ? 2 : 2.5;
      this.alpha = 0.75;
    }

    update() {
      this.age += 1;
      const progress = this.age / this.life;
      this.radius = 8 + (this.maxRadius - 8) * progress;
      this.alpha = 0.75 * (1 - progress);
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(this.alpha, 0);

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.lineWidth = this.lineWidth;
      ctx.strokeStyle = this.color;
      ctx.shadowBlur = 14;
      ctx.shadowColor = this.color;
      ctx.stroke();

      ctx.restore();
    }

    alive() {
      return this.age < this.life;
    }
  }

  class Particle {
    constructor(x, y, angle, speed, color) {
      this.x = x;
      this.y = y;

      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      this.color = color;
      this.size = random(isMobile() ? 1.6 : 1.8, isMobile() ? 3.2 : 4.2);
      this.life = Math.floor(random(CONFIG.particleLifeMin, CONFIG.particleLifeMax));
      this.age = 0;
      this.alpha = 1;
      this.trail = [];
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > CONFIG.maxTrail) this.trail.shift();

      this.vx *= CONFIG.friction;
      this.vy *= CONFIG.friction;
      this.vy += CONFIG.gravity;

      this.x += this.vx;
      this.y += this.vy;

      this.age += 1;
      this.alpha = Math.max(0, 1 - this.age / this.life);
    }

    draw(ctx) {
      if (this.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < this.trail.length - 1; i++) {
          const p1 = this.trail[i];
          const p2 = this.trail[i + 1];
          const t = i / this.trail.length;
          ctx.globalAlpha = this.alpha * t * 0.45;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineWidth = Math.max(1, this.size * 0.55 * t);
          ctx.strokeStyle = this.color;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    }

    alive() {
      return this.age < this.life && this.alpha > 0.01;
    }
  }

  function spawnBurst(x, y) {
    const count = isMobile() ? CONFIG.mobileParticles : CONFIG.desktopParticles;
    const ringColor = pick(CONFIG.colors);

    rings.push(new Ring(x, y, ringColor));

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + random(-0.12, 0.12);
      const speed = random(isMobile() ? 1.4 : 1.8, isMobile() ? 3.4 : 4.8);
      const color = pick(CONFIG.colors);
      particles.push(new Particle(x, y, angle, speed, color));
    }

    startLoop();
  }

  function renderBackgroundGlow(x, y) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, isMobile() ? 28 : 40);
    gradient.addColorStop(0, 'rgba(255,255,255,0.20)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, isMobile() ? 28 : 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);

    ctx.clearRect(0, 0, width, height);

    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.update();
      renderBackgroundGlow(ring.x, ring.y);
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

  function shouldIgnoreTarget(target) {
    if (!target || !(target instanceof Element)) return false;

    return !!target.closest(
      'a, button, input, textarea, select, option, label, summary, audio, video, iframe, [contenteditable="true"], .menu-item, .site-nav-toggle'
    );
  }

  function handlePointerDown(e) {
    // 只响应主按钮
    if (typeof e.button === 'number' && e.button !== 0) return;
    if (shouldIgnoreTarget(e.target)) return;

    const x = e.clientX;
    const y = e.clientY;

    // 极边缘位置不炸，省得视觉怪
    if (x < 2 || y < 2 || x > width - 2 || y > height - 2) return;

    spawnBurst(x, y);
  }

  function init() {
    ensureCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();