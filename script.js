if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function openPortfolioAtTop() {
  if (window.location.hash) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  window.scrollTo(0, 0);
}

openPortfolioAtTop();
window.addEventListener('load', () => {
  requestAnimationFrame(() => {
    openPortfolioAtTop();
    setTimeout(openPortfolioAtTop, 80);
  });
});
window.addEventListener('pageshow', openPortfolioAtTop);

const glow = document.querySelector('.cursor-glow');
window.addEventListener('pointermove', event => {
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
});

window.addEventListener('pointerdown', event => {
  const lily = document.createElement('img');
  lily.src = './lily-cutout.png';
  lily.alt = '';
  lily.className = 'click-lily';
  lily.style.left = `${event.clientX}px`;
  lily.style.top = `${event.clientY}px`;
  lily.style.setProperty('--turn', `${Math.round(Math.random() * 24 - 12)}deg`);
  document.body.appendChild(lily);
  lily.addEventListener('animationend', () => lily.remove());
});

document.querySelectorAll('[data-dialog]').forEach(button => {
  button.addEventListener('click', () => {
    document.getElementById(button.dataset.dialog)?.showModal();
  });
});

document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();

document.querySelectorAll('.skill-groups section p').forEach(list => {
  const skills = list.textContent.split('·').map(skill => skill.trim()).filter(Boolean);
  list.replaceChildren(...skills.map(skill => {
    const chip = document.createElement('span');
    chip.textContent = skill;
    return chip;
  }));
});

const canvas = document.querySelector('#swingCanvas');
const context = canvas?.getContext('2d');
const trailsButton = document.querySelector('#swingTrails');
const resetButton = document.querySelector('#swingReset');

if (canvas && context) {
  const colors = ['#ff4eaa', '#ff78c2', '#ffa0d4', '#e950a5', '#ffd0e7'];
  const state = {
    width: 0,
    height: 0,
    trails: true,
    dragging: null,
    lastFrameTime: 0,
    lastDragTime: 0,
    pendulums: []
  };

  function makePendulums() {
    state.dragging = null;
    state.lastFrameTime = 0;
    state.pendulums = Array.from({ length: 5 }, (_, index) => ({
      a1: 1.55 + index * 0.012,
      a2: 1.2 + index * 0.009,
      v1: 0,
      v2: 0,
      active: false,
      color: colors[index],
      trail: []
    }));
  }

  function resizeCanvas() {
    const rectangle = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    state.width = rectangle.width;
    state.height = rectangle.height;
    canvas.width = Math.round(rectangle.width * ratio);
    canvas.height = Math.round(rectangle.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.pendulums.forEach(pendulum => { pendulum.trail = []; });
  }

  function geometry() {
    const length = Math.min(88, state.height * .28, state.width * .12);
    return { anchorX: state.width * .5, anchorY: 20, l1: length, l2: length * .92 };
  }

  function position(pendulum) {
    const { anchorX, anchorY, l1, l2 } = geometry();
    const x1 = anchorX + l1 * Math.sin(pendulum.a1);
    const y1 = anchorY + l1 * Math.cos(pendulum.a1);
    const x2 = x1 + l2 * Math.sin(pendulum.a2);
    const y2 = y1 + l2 * Math.cos(pendulum.a2);
    return { anchorX, anchorY, x1, y1, x2, y2 };
  }

  function drawPendulum(pendulum, index) {
    const points = position(pendulum);
    pendulum.x1 = points.x1;
    pendulum.y1 = points.y1;
    pendulum.x2 = points.x2;
    pendulum.y2 = points.y2;

    if (state.trails && pendulum.trail.length > 1) {
      context.beginPath();
      pendulum.trail.forEach((point, pointIndex) => {
        if (pointIndex === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.strokeStyle = pendulum.color + '55';
      context.lineWidth = 1.4;
      context.stroke();
    }

    context.beginPath();
    context.moveTo(points.anchorX, points.anchorY);
    context.lineTo(points.x1, points.y1);
    context.lineTo(points.x2, points.y2);
    context.strokeStyle = pendulum.color + 'aa';
    context.lineWidth = index === 0 ? 2 : 1.25;
    context.stroke();

    context.beginPath();
    context.arc(points.x1, points.y1, 5, 0, Math.PI * 2);
    context.fillStyle = pendulum.color;
    context.fill();

    context.save();
    context.shadowColor = pendulum.color;
    context.shadowBlur = 17;
    context.beginPath();
    context.arc(points.x2, points.y2, index === 0 ? 10 : 7, 0, Math.PI * 2);
    context.fillStyle = pendulum.color;
    context.fill();
    context.restore();
  }

  function updatePendulum(pendulum, deltaTime) {
    if (!pendulum.active || state.dragging) return;
    const gravity = 9.81;
    const length1 = 1;
    const length2 = .92;
    const mass1 = 1;
    const mass2 = 1;
    const steps = 4;
    const step = Math.min(deltaTime, .025) / steps;

    for (let index = 0; index < steps; index += 1) {
      const difference = pendulum.a1 - pendulum.a2;
      const denominator = 2 * mass1 + mass2 - mass2 * Math.cos(2 * difference);
      const acceleration1 = (
        -gravity * (2 * mass1 + mass2) * Math.sin(pendulum.a1)
        - mass2 * gravity * Math.sin(pendulum.a1 - 2 * pendulum.a2)
        - 2 * Math.sin(difference) * mass2 * (
          pendulum.v2 * pendulum.v2 * length2
          + pendulum.v1 * pendulum.v1 * length1 * Math.cos(difference)
        )
      ) / (length1 * denominator);
      const acceleration2 = (
        2 * Math.sin(difference) * (
          pendulum.v1 * pendulum.v1 * length1 * (mass1 + mass2)
          + gravity * (mass1 + mass2) * Math.cos(pendulum.a1)
          + pendulum.v2 * pendulum.v2 * length2 * mass2 * Math.cos(difference)
        )
      ) / (length2 * denominator);

      pendulum.v1 += acceleration1 * step;
      pendulum.v2 += acceleration2 * step;
      pendulum.a1 += pendulum.v1 * step;
      pendulum.a2 += pendulum.v2 * step;
    }

    const damping = Math.pow(.9992, deltaTime * 60);
    pendulum.v1 *= damping;
    pendulum.v2 *= damping;

    const endpoint = position(pendulum);
    if (state.trails) {
      pendulum.trail.push({ x: endpoint.x2, y: endpoint.y2 });
      if (pendulum.trail.length > 220) pendulum.trail.shift();
    }

    const nearlyStill = Math.abs(pendulum.v1) + Math.abs(pendulum.v2) < .012;
    const nearlyVertical = Math.abs(Math.sin(pendulum.a1)) + Math.abs(Math.sin(pendulum.a2)) < .012;
    if (nearlyStill && nearlyVertical) {
      pendulum.active = false;
      pendulum.v1 = 0;
      pendulum.v2 = 0;
    }
  }

  function frame(timestamp) {
    const deltaTime = state.lastFrameTime
      ? Math.min((timestamp - state.lastFrameTime) / 1000, .035)
      : 1 / 60;
    state.lastFrameTime = timestamp;
    context.clearRect(0, 0, state.width, state.height);
    const { anchorX, anchorY } = geometry();
    context.beginPath();
    context.arc(anchorX, anchorY, 4, 0, Math.PI * 2);
    context.fillStyle = '#5b2340';
    context.fill();

    state.pendulums.forEach((pendulum, index) => {
      updatePendulum(pendulum, deltaTime);
      drawPendulum(pendulum, index);
    });
    requestAnimationFrame(frame);
  }

  function pointerPosition(event) {
    const rectangle = canvas.getBoundingClientRect();
    return { x: event.clientX - rectangle.left, y: event.clientY - rectangle.top };
  }

  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    const pointer = pointerPosition(event);
    let nearest = null;
    let nearestDistance = Infinity;
    state.pendulums.forEach(pendulum => {
      const distance = Math.hypot(pointer.x - pendulum.x2, pointer.y - pendulum.y2);
      if (distance < nearestDistance) {
        nearest = pendulum;
        nearestDistance = distance;
      }
    });
    const grabRadius = event.pointerType === 'touch' ? 120 : 90;
    if (nearest && nearestDistance < grabRadius) {
      state.dragging = nearest;
      state.pendulums.forEach(pendulum => {
        pendulum.active = false;
        pendulum.v1 = 0;
        pendulum.v2 = 0;
        pendulum.trail = [];
      });
      state.lastDragTime = performance.now();
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add('is-dragging');
      moveDraggedPendulum(pointer);
    }
  });

  function moveDraggedPendulum(pointer) {
    const pendulum = state.dragging;
    if (!pendulum) return;
    const { anchorX, anchorY, l1, l2 } = geometry();
    const dx = pointer.x - anchorX;
    const dy = pointer.y - anchorY;
    const distance = Math.max(8, Math.min(Math.hypot(dx, dy), l1 + l2 - .5));
    const relativeAngle = Math.acos(Math.max(-1, Math.min(1,
      (distance * distance - l1 * l1 - l2 * l2) / (2 * l1 * l2)
    )));
    const targetAngle = Math.atan2(dx, dy);
    const nextA1 = targetAngle - Math.atan2(
      l2 * Math.sin(relativeAngle),
      l1 + l2 * Math.cos(relativeAngle)
    );
    const nextA2 = nextA1 + relativeAngle;
    const now = performance.now();
    const elapsed = Math.max((now - state.lastDragTime) / 1000, .008);
    const nextV1 = Math.max(-8, Math.min(8, (nextA1 - pendulum.a1) / elapsed));
    const nextV2 = Math.max(-8, Math.min(8, (nextA2 - pendulum.a2) / elapsed));
    state.pendulums.forEach((item, index) => {
      const tinyDifference = index * .00065;
      item.a1 = nextA1 + tinyDifference;
      item.a2 = nextA2 - tinyDifference * .7;
      item.v1 = nextV1 + tinyDifference;
      item.v2 = nextV2 - tinyDifference;
    });
    state.lastDragTime = now;
    state.pendulums.forEach(item => {
      const endpoint = position(item);
      item.trail.push({ x: endpoint.x2, y: endpoint.y2 });
      if (item.trail.length > 220) item.trail.shift();
    });
  }

  canvas.addEventListener('pointermove', event => {
    if (!state.dragging) return;
    event.preventDefault();
    moveDraggedPendulum(pointerPosition(event));
  });

  function releasePointer(event) {
    if (state.dragging) {
      state.pendulums.forEach(pendulum => { pendulum.active = true; });
    }
    if (event?.pointerId != null && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.dragging = null;
    canvas.classList.remove('is-dragging');
  }

  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);

  trailsButton.addEventListener('click', () => {
    state.trails = !state.trails;
    trailsButton.textContent = state.trails ? 'Trails on' : 'Trails off';
    trailsButton.setAttribute('aria-pressed', String(state.trails));
    if (!state.trails) state.pendulums.forEach(pendulum => { pendulum.trail = []; });
  });

  resetButton.addEventListener('click', makePendulums);
  window.addEventListener('resize', resizeCanvas);
  makePendulums();
  resizeCanvas();
  requestAnimationFrame(frame);
}

const airbnbMetric = document.querySelector('#airbnbMetric');
const airbnbReadout = document.querySelector('#airbnbReadout');
document.querySelectorAll('.outcome-bar').forEach(bar => {
  const selectOutcome = () => {
    document.querySelectorAll('.outcome-bar').forEach(item => item.classList.remove('active'));
    bar.classList.add('active');
    airbnbMetric.querySelector('span').textContent = bar.dataset.value;
    airbnbMetric.querySelector('small').textContent = bar.dataset.label;
    airbnbReadout.textContent = bar.dataset.description;
  };
  bar.addEventListener('click', selectOutcome);
  bar.addEventListener('focus', selectOutcome);
});
