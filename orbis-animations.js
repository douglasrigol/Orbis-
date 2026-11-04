/* ===== ORBIS — DrawSVG + FoldText ===== */
(() => {
  if (typeof gsap === 'undefined' || typeof DrawSVGPlugin === 'undefined') return;
  gsap.registerPlugin(DrawSVGPlugin);

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const logo = document.getElementById('orbis-logo');
  const lead = document.getElementById('lead');
  const pill = document.getElementById('pill');
  const words = ['viajantes', 'noctívagos', 'colecionadores', 'contempladores'];

  let parts = [];
  if (logo) {
    const letters = logo.querySelector('#logo-rbis');
    if (letters) {
      letters.getAttribute('d').split(' M').forEach((segment, index) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', index ? `M${segment}` : segment);
        path.setAttribute('class', 'logo-letter');
        letters.parentNode.insertBefore(path, letters);
      });
      letters.remove();
    }
    parts = [...logo.querySelectorAll('path')];
  }

  const createFoldText = (element, text) => {
    if (!element) return { play() {}, refold() {} };
    element.classList.add('fold-text');
    const segments = [...text].map(character => {
      const segment = document.createElement('span');
      segment.className = 'fold-text-segment';
      const piece = document.createElement('span');
      piece.className = 'fold-text-piece';
      piece.dataset.foldText = character;
      piece.textContent = character === ' ' ? '\u00a0' : character;
      segment.appendChild(piece);
      return segment;
    });
    element.replaceChildren(...segments);
    const pieces = segments.map(segment => segment.firstElementChild);

    const play = () => {
      if (reduceMotion) return;
      gsap.killTweensOf(pieces);
      gsap.set(pieces, { rotateX: 92, opacity: 0, transformOrigin: '50% 0%' });
      gsap.to(pieces, { rotateX: 0, opacity: 1, duration: .65, stagger: .045, ease: 'power3.out', overwrite: true });
    };
    const refold = () => {
      if (reduceMotion) return;
      gsap.to(pieces, { rotateX: 45, duration: .28, stagger: { each: .025, from: 'end' }, ease: 'power2.in', overwrite: true });
    };
    element.addEventListener('pointerenter', refold);
    element.addEventListener('pointerleave', play);
    return { play, refold };
  };

  if (reduceMotion) {
    if (lead) lead.textContent = 'Relógios para';
    if (pill) pill.textContent = words[0];
  } else {
    const leadFold = createFoldText(lead, 'Relógios para');
    let pillFold = createFoldText(pill, words[0]);
    let wordIndex = 1;
    const cycleWord = () => {
      pillFold.refold();
      gsap.delayedCall(.34, () => {
        pillFold = createFoldText(pill, words[wordIndex % words.length]);
        pillFold.play();
        wordIndex += 1;
        gsap.delayedCall(3.2, cycleWord);
      });
    };
    const playText = () => {
      leadFold.play();
      pillFold.play();
      gsap.delayedCall(3.2, cycleWord);
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        playText();
      }
    }, { threshold: .2 });
    if (lead) observer.observe(lead);
  }

  if (!logo || !parts.length || reduceMotion) return;
  const stroke = logo.querySelector('#logo-silver') ? 'url(#logo-silver)' : '#e4e8ef';
  parts.forEach(path => {
    path.setAttribute('stroke', stroke);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linejoin', 'round');
  });
  gsap.set(parts, { fillOpacity: 0, strokeOpacity: 1, drawSVG: '0%' });
  const logoTimeline = gsap.timeline({ repeat: -1, repeatDelay: .5, paused: true });
  logoTimeline
    .fromTo(parts, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut', stagger: .22 })
    .to(parts, { fillOpacity: 1, duration: .7 }, '-=.5')
    .to(parts, { strokeOpacity: 0, duration: .5 }, '<.2')
    .to({}, { duration: 2 })
    .to(parts, { fillOpacity: 0, strokeOpacity: 1, duration: .5 })
    .to(parts, { drawSVG: '100% 100%', duration: 1, ease: 'power2.in', stagger: .1 });

  const startLogo = () => logoTimeline.play(0);
  if (document.body.classList.contains('ready')) startLogo();
  else {
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('ready')) {
        observer.disconnect();
        startLogo();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
})();
