/**
 * Royal Stays — Cinematic Room Showcase
 * Handles: per-room image sliders, scroll animations,
 * side navigation, touch/swipe, Ken Burns effect
 */
(function () {
  'use strict';

  /* ── Constants ────────────────────────────────────────── */
  var SLIDE_INTERVAL = 3000;
  var OBSERVER_THRESHOLD = 0.25;

  /* ── DOM Ready ────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    setupSliders();
    setupScrollAnimations();
    setupSideNav();
    setupTouchSwipe();
  }

  /* ══════════════════════════════════════════════════════════
     IMAGE SLIDERS — one per room section
     ══════════════════════════════════════════════════════════ */
  function setupSliders() {
    var sections = document.querySelectorAll('.rs-room-section');
    sections.forEach(function (section) {
      var slides = section.querySelectorAll('.rs-slide');
      var dots = section.querySelectorAll('.rs-dot');
      var prevBtn = section.querySelector('.rs-arrow-prev');
      var nextBtn = section.querySelector('.rs-arrow-next');
      if (slides.length === 0) return;

      var current = 0;
      var timer = null;
      var paused = false;

      function goTo(idx) {
        slides[current].classList.remove('rs-active');
        if (dots[current]) dots[current].classList.remove('rs-active');
        current = (idx + slides.length) % slides.length;
        slides[current].classList.add('rs-active');
        if (dots[current]) dots[current].classList.add('rs-active');
      }

      function next() { goTo(current + 1); }
      function prev() { goTo(current - 1); }

      function startAuto() {
        stopAuto();
        timer = setInterval(function () {
          if (!paused) next();
        }, SLIDE_INTERVAL);
      }

      function stopAuto() {
        if (timer) { clearInterval(timer); timer = null; }
      }

      // Arrow controls
      if (nextBtn) nextBtn.addEventListener('click', function () { next(); startAuto(); });
      if (prevBtn) prevBtn.addEventListener('click', function () { prev(); startAuto(); });

      // Dot controls
      dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { goTo(i); startAuto(); });
      });

      // Mouse-driven auto-slide: move pointer to right half → next, left half → prev
      var imagePanel = section.querySelector('.rs-image-panel');
      var mouseSlideTimer = null;
      var MOUSE_SLIDE_SPEED = 1800; // ms between slides when mouse-driven

      if (imagePanel) {
        imagePanel.addEventListener('mouseenter', function () {
          paused = true; // pause the default auto-play
        });

        imagePanel.addEventListener('mousemove', function (e) {
          var rect = imagePanel.getBoundingClientRect();
          var relX = e.clientX - rect.left;
          var halfW = rect.width / 2;
          var direction = relX >= halfW ? 'next' : 'prev';

          // Only restart timer if direction changed or timer not running
          if (mouseSlideTimer && mouseSlideTimer._dir === direction) return;

          clearInterval(mouseSlideTimer);
          // Immediately slide once, then repeat
          if (direction === 'next') next(); else prev();
          mouseSlideTimer = setInterval(function () {
            if (direction === 'next') next(); else prev();
          }, MOUSE_SLIDE_SPEED);
          mouseSlideTimer._dir = direction;
        });

        imagePanel.addEventListener('mouseleave', function () {
          paused = false;
          clearInterval(mouseSlideTimer);
          mouseSlideTimer = null;
        });
      }

      // Initialize first slide
      goTo(0);
      startAuto();

      // Store controls for external access
      section._rsSlider = { goTo: goTo, next: next, prev: prev, startAuto: startAuto, stopAuto: stopAuto };
    });
  }

  /* ══════════════════════════════════════════════════════════
     SCROLL ANIMATIONS — Intersection Observer
     ══════════════════════════════════════════════════════════ */
  function setupScrollAnimations() {
    var animElements = document.querySelectorAll('.rs-anim');
    if (!animElements.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('rs-visible');
        }
      });
    }, { threshold: OBSERVER_THRESHOLD });

    animElements.forEach(function (el) { observer.observe(el); });
  }

  /* ══════════════════════════════════════════════════════════
     SIDE NAVIGATION — track active section
     ══════════════════════════════════════════════════════════ */
  function setupSideNav() {
    var sideDots = document.querySelectorAll('.rs-side-dot');
    var sections = document.querySelectorAll('[data-rs-index]');
    if (!sideDots.length || !sections.length) return;

    // Click to scroll
    sideDots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        var target = document.querySelector('[data-rs-index="' + dot.getAttribute('data-target') + '"]');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Track active section
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var idx = entry.target.getAttribute('data-rs-index');
          sideDots.forEach(function (d) { d.classList.remove('rs-active'); });
          var activeDot = document.querySelector('.rs-side-dot[data-target="' + idx + '"]');
          if (activeDot) activeDot.classList.add('rs-active');
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(function (sec) { navObserver.observe(sec); });
  }

  /* ══════════════════════════════════════════════════════════
     TOUCH SWIPE — mobile slider support
     ══════════════════════════════════════════════════════════ */
  function setupTouchSwipe() {
    var panels = document.querySelectorAll('.rs-image-panel');
    panels.forEach(function (panel) {
      var startX = 0;
      var startY = 0;
      var isDragging = false;

      panel.addEventListener('touchstart', function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
      }, { passive: true });

      panel.addEventListener('touchend', function (e) {
        if (!isDragging) return;
        isDragging = false;
        var endX = e.changedTouches[0].clientX;
        var endY = e.changedTouches[0].clientY;
        var dx = endX - startX;
        var dy = endY - startY;

        // Only trigger horizontal swipe (not vertical scroll)
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          var section = panel.closest('.rs-room-section');
          if (section && section._rsSlider) {
            if (dx < 0) section._rsSlider.next();
            else section._rsSlider.prev();
            section._rsSlider.startAuto();
          }
        }
      }, { passive: true });
    });
  }

})();
