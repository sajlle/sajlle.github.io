(() => {
  // 点击之后烟花爆炸，无粒子效果
  // 尊重系统“减少动态效果”设置
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  let canvas;
  let ctx;
  let dpr = window.devicePixelRatio || 1;
  let particles = [];
  let animationId = null;

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'click-fireworks-canvas';
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    resizeCanvas();
  }

  function resizeCanvas() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  class Particle {
    constructor(x, y, angle, speed, color, size) {
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.color = color;
      this.size = size;
      this.alpha = 1;
      this.gravity = 0.05 + Math.random() * 0.03;
      this.friction = 0.98;
      this.decay = 0.015 + Math.random() * 0.015;
    }

    update() {
      this.vx *= this.friction;
      this.vy *= this.friction;
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(this.alpha, 0);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.restore();
    }

    isAlive() {
      return this.alpha > 0;
    }
  }

  function randomColor() {
    const colors = [
      '#ff4d6d',
      '#ffd166',
      '#06d6a0',
      '#118ab2',
      '#9b5de5',
      '#f15bb5',
      '#ff7b00'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function burst(x, y) {
    const count = 18 + Math.floor(Math.random() * 10);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3.5;
      const size = 1.5 + Math.random() * 2.5;
      particles.push(new Particle(x, y, angle, speed, randomColor(), size));
    }

    if (!animationId) animate();
  }

  function animate() {
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    particles = particles.filter((p) => {
      p.update();
      p.draw(ctx);
      return p.isAlive();
    });

    if (particles.length === 0) {
      cancelAnimationFrame(animationId);
      animationId = null;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  function handleClick(e) {
    // 不在输入框和链接里放烟花，免得页面像精神状态过好
    const tag = e.target.tagName;
    if (['A', 'INPUT', 'TEXTAREA', 'BUTTON'].includes(tag)) return;


    burst(e.clientX, e.clientY);
  }

  function init() {
    if (document.getElementById('click-fireworks-canvas')) return;
    createCanvas();
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('click', handleClick, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
