// Keep input in screen pixels so the same gesture works on compact and wide boards.
export function dragIntent(index, dx, dy, stepX, stepY, axis = null) {
  axis ||= Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  const distance = axis === 'x' ? dx : dy;
  const step = axis === 'x' ? stepX : stepY;
  const direction = Math.sign(distance);
  const target = index + direction * (axis === 'x' ? 1 : 8);
  const inside = target >= 0 && target < 64 &&
    (axis === 'y' || (target / 8 | 0) === (index / 8 | 0));
  return { axis, target: inside && direction ? target : null,
    offset: Math.max(-step, Math.min(step, distance)), step,
    committed: Math.abs(distance) >= Math.max(10, step * .28) };
}

export function bindPuzzlePointer(board, callbacks) {
  let gesture = null;
  const tile = i => board.querySelector(`[data-cell="${i}"]`);
  const motion = i => tile(i)?.querySelector('.piece-motion');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vector = (axis, n) => `translate3d(${axis === 'x' ? n : 0}px, ${axis === 'y' ? n : 0}px, 0)`;
  function resetVisuals() {
    board.classList.remove('dragging');
    board.querySelectorAll('.drag-source,.drag-neighbor').forEach(el => {
      el.classList.remove('drag-source', 'drag-neighbor');
      const piece = el.querySelector('.piece-motion');
      if (piece) piece.style.transform = '';
    });
  }
  async function tween(entries) {
    const animations = entries.filter(([el]) => el).map(([el, from, to]) => {
      el.style.transform = to;
      return el.animate([{ transform: from }, { transform: to }], {
        duration: reduced() ? 1 : 145, easing: 'cubic-bezier(.2,.75,.3,1)'
      }).finished.catch(() => {});
    });
    await Promise.all(animations);
  }
  function paint(g) {
    // Clear the old neighbor too when the player reverses direction.
    resetVisuals();
    if (!g.intent) return;
    board.classList.add('dragging');
    const {axis, target, offset} = g.intent;
    const movable = target !== null && callbacks.canMove(target);
    const amount = movable ? offset : offset * .18;
    tile(g.index)?.classList.add('drag-source');
    motion(g.index).style.transform = vector(axis, amount);
    if (movable) {
      tile(target)?.classList.add('drag-neighbor');
      motion(target).style.transform = vector(axis, -amount);
    }
  }
  function track(e) {
    const g = gesture;
    if (!g || g.pointerId !== e.pointerId || g.settling) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 6) return;
    g.moved = true;
    g.intent = dragIntent(g.index, dx, dy, g.stepX, g.stepY, g.intent?.axis);
    if (e.cancelable) e.preventDefault();
    paint(g);
  }
  async function release(e, cancel = false) {
    const g = gesture;
    if (!g || (e?.pointerId !== undefined && e.pointerId !== g.pointerId) || g.settling) return;
    if (!cancel && g.draggable) track(e);
    g.settling = true;
    if (board.hasPointerCapture(g.pointerId)) board.releasePointerCapture(g.pointerId);
    if (!g.moved) {
      gesture = null;
      callbacks.onGesture(false);
      if (!cancel) callbacks.onTap(g.index);
      return;
    }
    const {axis, target, offset, step, committed} = g.intent;
    const movable = target !== null && callbacks.canMove(target);
    const valid = !cancel && committed && movable && callbacks.canSwap(g.index, target);
    const from = movable ? offset : offset * .18;
    const end = valid ? Math.sign(offset) * step : 0;
    await tween([
      [motion(g.index), vector(axis, from), vector(axis, end)],
      ...(movable ? [[motion(target), vector(axis, -from), vector(axis, -end)]] : [])
    ]);
    resetVisuals();
    gesture = null;
    callbacks.onGesture(false);
    if (valid) callbacks.onSwap(g.index, target, true);
    else if (!cancel && committed) callbacks.onInvalid();
  }
  board.addEventListener('pointerdown', e => {
    if (gesture || callbacks.blocked() || !e.isPrimary || e.button !== 0) return;
    const el = e.target.closest('[data-cell]');
    if (!el) return;
    e.preventDefault();
    const index = Number(el.dataset.cell), rect = el.getBoundingClientRect();
    const next = tile(index % 8 < 7 ? index + 1 : index - 1).getBoundingClientRect();
    const below = tile(index < 56 ? index + 8 : index - 8).getBoundingClientRect();
    board.querySelectorAll('.hint').forEach(t => t.classList.remove('hint'));
    gesture = {index, pointerId:e.pointerId, x:e.clientX, y:e.clientY,
      stepX:Math.abs(next.left - rect.left), stepY:Math.abs(below.top - rect.top),
      moved:false, draggable:callbacks.canMove(index), settling:false};
    board.setPointerCapture(e.pointerId);
    callbacks.onGesture(true);
  });
  board.addEventListener('pointermove', e => { if (gesture?.draggable) track(e); });
  board.addEventListener('pointerup', e => release(e));
  board.addEventListener('pointercancel', e => release(e, true));
  board.addEventListener('lostpointercapture', e => release(e, true));
  board.addEventListener('dragstart', e => e.preventDefault());
  window.addEventListener('blur', () => release(null, true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(null, true); });
  return {
    async animateSwap(a, b) {
      const first = tile(a), second = tile(b);
      const ra = first.getBoundingClientRect(), rb = second.getBoundingClientRect();
      first.classList.add('drag-source'); second.classList.add('drag-neighbor');
      board.classList.add('dragging');
      await tween([
        [motion(a), vector('x',0), `translate3d(${rb.left-ra.left}px,${rb.top-ra.top}px,0)`],
        [motion(b), vector('x',0), `translate3d(${ra.left-rb.left}px,${ra.top-rb.top}px,0)`]
      ]);
      resetVisuals();
    }
  };
}
