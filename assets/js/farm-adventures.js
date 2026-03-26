/* ==========================================================================
   Farm Adventures Page — GSAP ScrollTrigger Stacking Cards
   GrowPure Farms · Cinematic Scroll with Lenis
   ========================================================================== */

(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        heroObserver();
        initLenis();
        setupStackingCards();
    }

    /* ══════════════════════════════════════════
       HERO — trigger Ken Burns on visibility
       ══════════════════════════════════════════ */
    function heroObserver() {
        var hero = document.querySelector('.fa-hero');
        if (!hero) return;
        setTimeout(function () {
            hero.classList.add('is-visible');
        }, 200);
    }

    /* ══════════════════════════════════════════
       LENIS — Smooth Scrolling
       ══════════════════════════════════════════ */
    function initLenis() {
        if (typeof Lenis === 'undefined') {
            console.warn('Lenis not loaded — smooth scroll disabled');
            return;
        }

        var lenis = new Lenis({
            duration: 1.2,
            easing: function (t) {
                return Math.min(1, 1.001 - Math.pow(2, -10 * t));
            },
            smoothWheel: true,
            smoothTouch: false
        });

        // Connect Lenis to GSAP ScrollTrigger
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add(function (time) {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0);
        } else {
            // Standalone Lenis RAF loop
            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        }
    }

    /* ══════════════════════════════════════════
       STACKING CARDS — GSAP ScrollTrigger
       Each card pins in place while the next card
       slides up and covers it, creating a stacking effect.
       Fully reversible on scroll up.
       ══════════════════════════════════════════ */
    function setupStackingCards() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.warn('GSAP or ScrollTrigger not loaded — stacking disabled');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        var cards = gsap.utils.toArray('.fa-exp');
        if (!cards.length) return;

        // Pin each card except the last one.
        // As the user scrolls, the current card stays pinned
        // while the next card scrolls up and covers it.
        cards.forEach(function (card, i) {
            // Pin every card except the last
            if (i < cards.length - 1) {
                ScrollTrigger.create({
                    trigger: card,
                    start: 'top top',
                    // pin until the next card has fully covered this one
                    endTrigger: cards[i + 1],
                    end: 'top top',
                    pin: true,
                    pinSpacing: false,
                    invalidateOnRefresh: true
                });
            }

            // Slow parallax zoom on main image
            var img = card.querySelector('.fa-exp__img');
            if (img) {
                gsap.fromTo(img, {
                    scale: 1
                }, {
                    scale: 1.08,
                    ease: 'none',
                    force3D: true,
                    scrollTrigger: {
                        trigger: card,
                        start: 'top bottom',
                        end: 'bottom top',
                        scrub: 1.5,
                        invalidateOnRefresh: true
                    }
                });
            }

            // Fade in text content as each card enters
            var text = card.querySelector('.fa-exp__text');
            if (text) {
                gsap.fromTo(text, {
                    opacity: 0,
                    y: 40
                }, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: 'power2.out',
                    scrollTrigger: {
                        trigger: card,
                        start: 'top 60%',
                        toggleActions: 'play none none reverse',
                        invalidateOnRefresh: true
                    }
                });
            }
        });

        // Refresh on resize
        var lastWidth = window.innerWidth;
        var resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                var newWidth = window.innerWidth;
                if (newWidth !== lastWidth) {
                    ScrollTrigger.refresh();
                    lastWidth = newWidth;
                }
            }, 250);
        });
    }

})();
