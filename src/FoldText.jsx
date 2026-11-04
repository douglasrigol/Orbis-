import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './FoldText.css';

gsap.registerPlugin(ScrollTrigger);

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const HINGES = {
  top: { origin: '50% 0%', axis: 'rotateX', sign: -1 },
  bottom: { origin: '50% 100%', axis: 'rotateX', sign: 1 },
  left: { origin: '0% 50%', axis: 'rotateY', sign: 1 },
  right: { origin: '100% 50%', axis: 'rotateY', sign: -1 }
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function FoldText({
  text = 'Design unfolds', splitBy = 'char', hinge = 'top', foldStyle = 'paper',
  duration = .65, stagger = .045, staggerFrom = 'start', foldAngle = 92,
  ease = 'power3.out', perspective = 700, creaseShading = .55,
  trigger = 'scroll', loopDelay = 1.4, hoverRefold = true, refoldRadius = 140,
  refoldAngle = 45, fontSize = 'inherit', fontWeight = 'inherit', color = 'currentColor', className = ''
}) {
  const rootRef = useRef(null);
  const hingeConfig = HINGES[hinge] || HINGES.top;
  const pieces = useMemo(() => [...text].map((character, index) => ({ character, index })), [text]);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const elements = [...root.querySelectorAll('.fold-text-piece')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const angle = reduced ? 0 : clamp(foldAngle, 0, 180);
    const play = () => {
      gsap.killTweensOf(elements);
      gsap.set(elements, { rotateX: angle, opacity: 0, transformOrigin: hingeConfig.origin });
      gsap.to(elements, { rotateX: 0, opacity: 1, duration: reduced ? .2 : duration, stagger: reduced ? .02 : stagger, ease, overwrite: true });
    };
    const refold = () => {
      if (!hoverRefold || reduced) return;
      gsap.to(elements, { rotateX: refoldAngle, duration: .28, stagger: { each: .025, from: 'end' }, ease: 'power2.in', overwrite: true });
    };
    elements.forEach(element => element.addEventListener('pointerenter', refold));
    let triggerInstance;
    if (trigger === 'scroll') {
      triggerInstance = ScrollTrigger.create({ trigger: root, start: 'top 82%', once: true, onEnter: play });
      gsap.set(elements, { rotateX: angle, opacity: 0, transformOrigin: hingeConfig.origin });
    } else play();
    return () => {
      elements.forEach(element => element.removeEventListener('pointerenter', refold));
      triggerInstance?.kill();
      gsap.killTweensOf(elements);
    };
  }, [duration, ease, foldAngle, hingeConfig.origin, hoverRefold, refoldAngle, stagger, trigger]);

  return <span ref={rootRef} className={`fold-text ${className}`.trim()} style={{ '--fold-perspective': `${perspective}px`, '--fold-crease': creaseShading, fontSize, fontWeight, color }} aria-label={text}>
    {pieces.map(({ character, index }) => <span className="fold-text-segment" key={`${character}-${index}`}><span className="fold-text-piece">{character === ' ' ? '\u00a0' : character}</span></span>)}
  </span>;
}
