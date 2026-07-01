/* interactions.js — vanilla JS only, no libraries
 * Feature 1: Scroll-triggered reveals (IntersectionObserver)
 * Feature 2: Magnetic tilt on project cards
 * Feature 3: Smooth scroll for in-page anchor links
 */

'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Feature 1: Scroll-triggered reveals ─────────────────────────────────── */

(function initReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;

  // If the user prefers reduced motion, make everything visible immediately.
  if (reducedMotion) {
    elements.forEach(el => el.classList.add('is-visible'));
    return;
  }

  // Assign stagger delays to .reveal elements that share a direct parent.
  // We collect unique parents, then for each parent find its immediate
  // .reveal children and space their transition-delays 80ms apart.
  const parents = new Set(Array.from(elements).map(el => el.parentElement));

  parents.forEach(parent => {
    const siblings = Array.from(parent.querySelectorAll(':scope > .reveal'));
    if (siblings.length > 1) {
      siblings.forEach((el, i) => {
        el.style.transitionDelay = `${i * 80}ms`;
      });
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target); // one-shot — never repeat
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px' // trigger slightly before the bottom edge
  });

  elements.forEach(el => observer.observe(el));
})();


/* ── Feature 2: Magnetic tilt on project cards ───────────────────────────── */

(function initTilt() {
  // Disable on touch devices and when reduced motion is set.
  const hasHover = window.matchMedia('(hover: hover)').matches;
  if (reducedMotion || !hasHover) return;

  const MAX_TILT = 1.5; // degrees
  const cards = document.querySelectorAll('.project-item');
  if (!cards.length) return;

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();

      // Cursor position relative to the card, normalised to -1 … +1
      const xNorm = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const yNorm = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      // rotateX tilts around the horizontal axis (driven by vertical cursor)
      const rotateX = -yNorm * MAX_TILT;
      const rotateY =  xNorm * MAX_TILT;

      // Short transition during tracking keeps movement smooth instead of snappy
      card.style.transition = 'transform 80ms ease-out, box-shadow 300ms ease-out';
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      // Smoothly spring back to flat on mouse leave
      card.style.transition = 'transform 400ms ease-out, box-shadow 300ms ease-out';
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
  });
})();


/* ── Feature 3: Smooth scroll for in-page anchor links ───────────────────── */

(function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const hash = link.getAttribute('href');
    const targetId = hash.slice(1);
    if (!targetId) return; // bare "#" — do nothing

    const target = document.getElementById(targetId);
    if (!target) return; // target doesn't exist — don't preventDefault

    e.preventDefault();

    if (reducedMotion) {
      // Instant jump, still offset for the navbar
      const navbar = document.querySelector('.navbar');
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navbarHeight;
      window.scrollTo({ top });
    } else {
      // Read navbar height dynamically — handles sticky navbar correctly
      const navbar = document.querySelector('.navbar');
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navbarHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
})();
