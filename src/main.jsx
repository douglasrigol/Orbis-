import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

function LogoAnimation() {
  const container = useRef(document.body);

  useGSAP(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const split = reduced ? null : SplitText.create('.split', {
      type: 'lines, words',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.words, {
          duration: 1,
          y: 100,
          autoAlpha: 0,
          stagger: 0.05
        });
      }
    });

    const logo = document.getElementById('orbis-logo');
    if (!logo || reduced) return () => split?.revert();

    const paths = [...logo.querySelectorAll('path')];
    const lengths = paths.map(path => {
      const length = path.getTotalLength();
      path.style.stroke = 'url(#logo-silver)';
      path.style.strokeWidth = '2';
      path.style.strokeLinejoin = 'round';
      path.style.strokeDasharray = `${length}px`;
      path.style.strokeDashoffset = `${length}px`;
      return length;
    });
    gsap.set(paths, { fillOpacity: 0, strokeOpacity: 1, strokeDashoffset: lengths });
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: .5, paused: true });
    timeline.to(paths, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', stagger: .22 })
        .to(paths, { fillOpacity: 1, duration: .7, ease: 'power1.out' }, '-=.5')
        .to(paths, { strokeOpacity: 0, duration: .5 }, '<.2')
        .to({}, { duration: 2 })
        .to(paths, { fillOpacity: 0, strokeOpacity: 1, duration: .5 })
        .set(paths, { strokeDashoffset: lengths });
    const start = () => timeline.play(0);
    if (document.body.classList.contains('ready')) start();
    else {
      const observer = new MutationObserver(() => {
        if (document.body.classList.contains('ready')) {
          observer.disconnect();
          start();
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      return () => {
        observer.disconnect();
        split?.revert();
      };
    }
    return () => split?.revert();
  }, { scope: container });
  return null;
}

createRoot(document.createElement('div')).render(<LogoAnimation />);
