const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastGlow;

document.addEventListener('pointerdown', event => {
  if (reducedMotion.matches || !event.isPrimary || event.button !== 0) return;

  const target = event.target.closest(
    'a[href], button:not(:disabled), summary, .project-card, .case-art, .case-banner, section'
  );
  if (!target) return;

  lastGlow?.cancel();
  lastGlow = target.animate([
    { boxShadow: 'inset 0 0 0 1px #a585c9a0, 0 0 .85rem #a585c95a' },
    { boxShadow: 'inset 0 0 0 1px #a585c900, 0 0 1.1rem #a585c900' }
  ], { duration: 420, easing: 'ease-out' });
}, { passive: true });
