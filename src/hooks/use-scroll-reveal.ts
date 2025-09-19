import { useEffect } from 'react';

/**
 * Hook to apply scroll reveal animations.
 * Accepts an optional resetKey which, when changed, re-initializes observers.
 */
export function useScrollReveal(resetKey?: unknown) {
  useEffect(() => {
    const observerOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target); // once revealed, stop observing
        }
      });
    }, observerOptions);

    // Query elements fresh each time (after DOM changes)
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.scroll-reveal'));

    // Remove previously added revealed class if we want animations again when coming back
    elements.forEach((el) => {
      if (resetKey !== undefined) {
        el.classList.remove('revealed');
      }
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [resetKey]);
}