(() => {
  'use strict';

  function init() {
    const tools = document.querySelector('.halloween-pumpkin-tools');
    if (!tools || tools.dataset.initialized) return;
    tools.dataset.initialized = 'true';

    const backToTop = tools.querySelector('.back-to-top');
    const toggle = tools.querySelector('.pumpkin-candy-toggle');
    const panel = tools.querySelector('.pumpkin-treat-panel');
    const reply = tools.querySelector('.pumpkin-reply');
    const candies = tools.querySelector('.pumpkin-candies');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const forcedColors = window.matchMedia('(forced-colors: active)');
    const hover = window.matchMedia('(hover: hover) and (pointer: fine)');
    let closeTimer;
    let effectTimer;
    let hopTimer;

    function clearEffects() {
      clearTimeout(effectTimer);
      clearTimeout(hopTimer);
      candies.replaceChildren();
      tools.classList.remove('is-treated');
      backToTop.classList.remove('is-jumping');
    }

    function setOpen(open) {
      clearTimeout(closeTimer);
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    }

    function scheduleClose() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        if (!tools.contains(document.activeElement)) setOpen(false);
      }, 220);
    }

    function syncVisibility() {
      const visible = backToTop.classList.contains('back-to-top-on');
      if (tools.classList.contains('is-visible') === visible) return;
      tools.classList.toggle('is-visible', visible);
      if (!visible) {
        setOpen(false);
        clearEffects();
      }
    }

    new MutationObserver(syncVisibility).observe(backToTop, {
      attributes: true,
      attributeFilter: ['class']
    });
    syncVisibility();

    backToTop.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch' && hover.matches) setOpen(true);
    });
    tools.addEventListener('pointerenter', () => clearTimeout(closeTimer));
    tools.addEventListener('pointerleave', scheduleClose);
    panel.addEventListener('pointerenter', () => clearTimeout(closeTimer));
    tools.addEventListener('focusin', () => {
      clearTimeout(closeTimer);
      // A tap focuses the toggle before its click. Only the click opens it,
      // avoiding an open-then-close on the first tap (or keyboard activation).
      if (panel.contains(document.activeElement)) setOpen(true);
    });
    tools.addEventListener('focusout', scheduleClose);

    toggle.addEventListener('click', () => setOpen(panel.hidden));
    document.addEventListener('pointerdown', event => {
      if (!tools.contains(event.target)) setOpen(false);
    }, { passive: true });
    tools.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || panel.hidden) return;
      event.preventDefault();
      // Focus first: the focusin handler must not reopen a dismissed panel.
      toggle.focus();
      setOpen(false);
    });

    backToTop.addEventListener('click', event => {
      setOpen(false);
      clearEffects();
      if (reducedMotion.matches || forcedColors.matches) {
        // NexT 8.27 animates its native click; use an immediate scroll for
        // visitors who request reduced motion instead of starting that tween.
        event.stopImmediatePropagation();
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      backToTop.classList.add('is-jumping');
      hopTimer = setTimeout(() => backToTop.classList.remove('is-jumping'), 460);
    }, { capture: true });

    panel.addEventListener('click', event => {
      const action = event.target.closest('[data-pumpkin-action]');
      if (!action) return;
      clearEffects();
      const treat = action.dataset.pumpkinAction === 'treat';
      reply.textContent = treat ? '今晚你最甜 🍬' : '捣蛋成功！🦇';
      if (reducedMotion.matches || forcedColors.matches || document.hidden) return;

      if (treat) {
        tools.classList.add('is-treated');
        for (let i = 0; i < 5; i++) {
          const candy = document.createElement('i');
          candy.textContent = i % 2 ? '🍭' : '🍬';
          candy.style.setProperty('--candy-x', `${20 + i * 24}px`);
          candy.style.setProperty('--candy-y', `${-55 - Math.sin((i + 1) / 6 * Math.PI) * 80}px`);
          candy.style.setProperty('--candy-turn', `${i % 2 ? -35 : 45}deg`);
          candy.style.animationDelay = `${i * 25}ms`;
          candies.appendChild(candy);
        }
        effectTimer = setTimeout(clearEffects, 1100);
      } else {
        const bounds = backToTop.getBoundingClientRect();
        window.dispatchEvent(new CustomEvent('halloween:bat-burst', {
          detail: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
        }));
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        setOpen(false);
        clearEffects();
      }
    });
    for (const media of [reducedMotion, forcedColors]) {
      media.addEventListener('change', clearEffects);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
