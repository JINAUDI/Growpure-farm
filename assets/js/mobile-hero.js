/**
 * Mobile Hero — Light/Dark Mode Controller
 * Ultra-smooth cinematic day/evening transitions with directional horizon swap.
 * Sun exits right, moon enters left (and vice versa).
 * GPU-accelerated transform3d + visibility management + state lock.
 * Only runs on viewports ≤ 768px.
 */
(function () {
  'use strict';

  var LIGHT_DIR = 'assets/mobile-hero/light/';
  var DARK_DIR = 'assets/mobile-hero/dark/';
  var STORAGE_KEY = 'mobileHeroMode';

  var hero = document.getElementById('mobileHero');
  if (!hero) return;

  var toggle = document.getElementById('mobileThemeToggle');
  var lightLayer = hero.querySelector('.mobile-hero__img--light');
  var darkLayer = hero.querySelector('.mobile-hero__img--dark');
  var modeLabel = hero.querySelector('.mobile-hero__mode-label');

  // Celestial icon elements
  var celestialIcon = document.getElementById('celestialDrawerIcon');
  var celestialSun = hero.querySelector('.mobile-hero__celestial-sun');
  var celestialMoon = hero.querySelector('.mobile-hero__celestial-moon');

  // Info drawer elements
  var infoDrawer = document.getElementById('infoDrawer');
  var drawerBackdrop = document.getElementById('drawerBackdrop');
  var drawerClose = document.getElementById('drawerClose');

  var LABEL_LIGHT = 'Switch to Evening Experience';
  var LABEL_DARK = 'Switch to Day Experience';

  // State lock — prevents toggling during animation
  var isAnimating = false;

  // ──────────────────────────────────────────────
  // Sound Generation (Web Audio API)
  // ──────────────────────────────────────────────
  var audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function playChime(isDark) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    var now = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isDark) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.4);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);

      var osc2 = ctx.createOscillator();
      var gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.08);
      gain2.gain.setValueAtTime(0.04, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    }
  }

  // ──────────────────────────────────────────────
  // Image Loading from Manifest
  // ──────────────────────────────────────────────
  function loadManifest(dir, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dir + 'manifest.json?t=' + Date.now(), true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var files = JSON.parse(xhr.responseText);
            if (Array.isArray(files) && files.length > 0) {
              callback(files);
              return;
            }
          } catch (e) { /* fall through */ }
        }
        callback([]);
      }
    };
    xhr.send();
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function setLayerImage(layer, dir, files) {
    if (!files || files.length === 0) {
      layer.style.backgroundImage = '';
      layer.classList.add('fallback');
      return;
    }
    layer.classList.remove('fallback');
    var file = pickRandom(files);
    var url = dir + file;
    var img = new Image();
    img.onload = function () {
      layer.style.backgroundImage = 'url(' + url + ')';
    };
    img.onerror = function () {
      layer.classList.add('fallback');
    };
    img.src = url;
  }

  // ──────────────────────────────────────────────
  // Orbital Animation Engine (requestAnimationFrame)
  // True trigonometric arc motion, time-based deltas,
  // easeInOut easing, GPU-composited transform3d.
  // ──────────────────────────────────────────────

  // Animation config
  var ORBIT_RADIUS = 160;   // px — arc radius for the orbital path
  var ORBIT_Y_SCALE = 0.44; // flatten the arc vertically (elliptical)
  var EXIT_DURATION = 2200;  // ms — body exit animation
  var ENTRY_DURATION = 2400; // ms — body entry animation
  var ENTRY_DELAY = 180;     // ms — delay before entry starts (overlap)

  // Active animation frame ID (for cancellation)
  var orbitalAnimFrame = null;

  // Math helpers
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  // Apply orbital position + visual properties to an element
  // direction: 1 = exit right, -1 = exit left (entry is reversed)
  function applyOrbitalState(el, progress, isExit, direction, sunStyle) {
    // progress: 0 → 1 (eased)
    var eased = easeInOutQuad(progress);

    // Orbital arc: start angle → end angle
    // Exit: arc from 0 (center) to π/2 (horizon right/left)
    // Entry: arc from π/2 (horizon) to 0 (center)
    var angle;
    if (isExit) {
      angle = eased * (Math.PI / 2);
    } else {
      angle = (1 - eased) * (Math.PI / 2);
    }

    // Trigonometric position along arc
    var x = Math.round(direction * ORBIT_RADIUS * Math.sin(angle));
    var y = Math.round(ORBIT_RADIUS * ORBIT_Y_SCALE * (1 - Math.cos(angle)));

    // Scale: shrinks as it moves to horizon
    var scale;
    if (isExit) {
      scale = lerp(1, 0.78, eased);
    } else {
      scale = lerp(0.78, 1, eased);
    }

    // Opacity: fades at horizon
    var opacity;
    if (isExit) {
      opacity = lerp(1, 0, eased);
    } else {
      opacity = lerp(0, 1, eased);
    }

    // Brightness: dims at horizon
    var brightness;
    if (isExit) {
      brightness = lerp(1, 0.6, eased);
    } else {
      brightness = lerp(0.6, 1, eased);
    }

    // Glow strength
    var glowStrength;
    if (isExit) {
      glowStrength = lerp(10, 0, eased);
    } else {
      glowStrength = lerp(0, 10, eased);
    }

    // Build glow color
    var glowColor;
    if (sunStyle) {
      var glowAlpha = lerp(isExit ? 0.6 : 0, isExit ? 0 : 0.6, eased);
      glowColor = 'rgba(255, 200, 50, ' + glowAlpha.toFixed(3) + ')';
    } else {
      var glowAlpha = lerp(isExit ? 0.5 : 0, isExit ? 0 : 0.5, eased);
      glowColor = 'rgba(200, 210, 240, ' + glowAlpha.toFixed(3) + ')';
    }

    // Apply — GPU-composited properties only
    el.style.transform = 'translate3d(' + x + 'px, ' + y + 'px, 0) scale(' + scale.toFixed(4) + ')';
    el.style.opacity = clamp01(opacity).toFixed(4);
    el.style.filter = 'brightness(' + brightness.toFixed(3) + ') drop-shadow(0 0 ' + Math.round(glowStrength) + 'px ' + glowColor + ')';

    // Visibility management
    if (isExit && eased > 0.98) {
      el.style.visibility = 'hidden';
    } else {
      el.style.visibility = 'visible';
    }
  }

  function setCelestialStatic(isDark) {
    // Set static state without animation (for initial load)
    if (!celestialSun || !celestialMoon) return;

    // Remove any idle classes
    celestialSun.classList.remove('idle');
    celestialMoon.classList.remove('idle');

    if (isDark) {
      // Sun hidden off-screen right, moon visible at anchor
      celestialSun.style.opacity = '0';
      celestialSun.style.visibility = 'hidden';
      celestialSun.style.transform = 'translate3d(' + ORBIT_RADIUS + 'px, ' + Math.round(ORBIT_RADIUS * ORBIT_Y_SCALE) + 'px, 0) scale(0.78)';
      celestialSun.style.filter = 'brightness(0.6) drop-shadow(0 0 0 transparent)';
      celestialMoon.style.opacity = '1';
      celestialMoon.style.visibility = 'visible';
      celestialMoon.style.transform = 'translate3d(0, 0, 0) scale(1)';
      celestialMoon.style.filter = 'brightness(1) drop-shadow(0 0 10px rgba(200, 210, 240, 0.5))';
      celestialMoon.classList.add('idle');
    } else {
      // Moon hidden off-screen left, sun visible at anchor
      celestialSun.style.opacity = '1';
      celestialSun.style.visibility = 'visible';
      celestialSun.style.transform = 'translate3d(0, 0, 0) scale(1)';
      celestialSun.style.filter = 'brightness(1) drop-shadow(0 0 10px rgba(255, 200, 50, 0.6))';
      celestialMoon.style.opacity = '0';
      celestialMoon.style.visibility = 'hidden';
      celestialMoon.style.transform = 'translate3d(' + (-ORBIT_RADIUS) + 'px, ' + Math.round(ORBIT_RADIUS * ORBIT_Y_SCALE) + 'px, 0) scale(0.78)';
      celestialMoon.style.filter = 'brightness(0.6) drop-shadow(0 0 0 transparent)';
      celestialSun.classList.add('idle');
    }
  }

  function animateCelestial(isDark) {
    if (!celestialSun || !celestialMoon) return;

    // Cancel any running orbital animation
    if (orbitalAnimFrame) {
      cancelAnimationFrame(orbitalAnimFrame);
      orbitalAnimFrame = null;
    }

    // Remove idle classes
    celestialSun.classList.remove('idle');
    celestialMoon.classList.remove('idle');

    // Determine exiting / entering elements and directions
    var exitEl, enterEl, exitIsSun, enterIsSun;
    if (isDark) {
      // Day → Evening: sun exits right (+1), moon enters from left (-1 direction for arc)
      exitEl = celestialSun;
      enterEl = celestialMoon;
      exitIsSun = true;
      enterIsSun = false;
    } else {
      // Evening → Day: moon exits right (+1), sun enters from left (-1 direction for arc)
      exitEl = celestialMoon;
      enterEl = celestialSun;
      exitIsSun = false;
      enterIsSun = true;
    }

    // Make entering element visible at start position
    enterEl.style.visibility = 'visible';
    enterEl.style.opacity = '0';

    var startTime = null;
    var totalDuration = Math.max(EXIT_DURATION, ENTRY_DURATION + ENTRY_DELAY);

    function tick(currentTime) {
      if (!startTime) startTime = currentTime;
      var elapsed = currentTime - startTime;

      // --- Exit animation progress ---
      var exitProgress = clamp01(elapsed / EXIT_DURATION);
      applyOrbitalState(exitEl, exitProgress, true, 1, exitIsSun);

      // --- Entry animation progress (with delay) ---
      var entryElapsed = elapsed - ENTRY_DELAY;
      if (entryElapsed > 0) {
        var entryProgress = clamp01(entryElapsed / ENTRY_DURATION);
        applyOrbitalState(enterEl, entryProgress, false, -1, enterIsSun);
      }

      // Continue or finalize
      if (elapsed < totalDuration) {
        orbitalAnimFrame = requestAnimationFrame(tick);
      } else {
        // Animation complete — set final resting states
        orbitalAnimFrame = null;

        // Exiting body: fully hidden at horizon
        exitEl.style.opacity = '0';
        exitEl.style.visibility = 'hidden';
        exitEl.style.transform = 'translate3d(' + ORBIT_RADIUS + 'px, ' + Math.round(ORBIT_RADIUS * ORBIT_Y_SCALE) + 'px, 0) scale(0.78)';
        exitEl.style.filter = 'brightness(0.6) drop-shadow(0 0 0 transparent)';

        // Entering body: fully visible at center
        enterEl.style.opacity = '1';
        enterEl.style.visibility = 'visible';
        enterEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
        if (enterIsSun) {
          enterEl.style.filter = 'brightness(1) drop-shadow(0 0 10px rgba(255, 200, 50, 0.6))';
        } else {
          enterEl.style.filter = 'brightness(1) drop-shadow(0 0 10px rgba(200, 210, 240, 0.5))';
        }

        // Enable idle floating animation
        enterEl.classList.add('idle');

        // Unlock toggling
        isAnimating = false;
      }
    }

    // Kick off the animation loop
    orbitalAnimFrame = requestAnimationFrame(tick);
  }

  // ──────────────────────────────────────────────
  // Info Drawer — Open / Close
  // ──────────────────────────────────────────────
  function openDrawer() {
    if (!infoDrawer) return;
    infoDrawer.classList.add('open');
    infoDrawer.setAttribute('aria-hidden', 'false');
    if (drawerBackdrop) drawerBackdrop.classList.add('active');
    document.body.classList.add('drawer-open');
  }

  function closeDrawer() {
    if (!infoDrawer) return;
    infoDrawer.classList.remove('open');
    infoDrawer.setAttribute('aria-hidden', 'true');
    if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    document.body.classList.remove('drawer-open');
  }

  // ──────────────────────────────────────────────
  // Mode Switching
  // ──────────────────────────────────────────────
  function setMode(isDark, animate) {
    if (isDark) {
      hero.classList.remove('mode-light');
      hero.classList.add('mode-dark');
      lightLayer.classList.remove('active');
      darkLayer.classList.add('active');
      if (toggle) toggle.checked = true;
      if (modeLabel) modeLabel.textContent = LABEL_DARK;
      hero.setAttribute('aria-label', 'Growpure Farm in the evening');
    } else {
      hero.classList.remove('mode-dark');
      hero.classList.add('mode-light');
      darkLayer.classList.remove('active');
      lightLayer.classList.add('active');
      if (toggle) toggle.checked = false;
      if (modeLabel) modeLabel.textContent = LABEL_LIGHT;
      hero.setAttribute('aria-label', 'Growpure Farm in daylight');
    }

    // Celestial icon animation
    if (animate) {
      isAnimating = true;
      animateCelestial(isDark);
      playChime(isDark);
    } else {
      setCelestialStatic(isDark);
    }

    try { localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light'); } catch (e) { }
  }

  // ──────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────
  function init() {
    loadManifest(LIGHT_DIR, function (lightFiles) {
      setLayerImage(lightLayer, LIGHT_DIR, lightFiles);
    });

    loadManifest(DARK_DIR, function (darkFiles) {
      setLayerImage(darkLayer, DARK_DIR, darkFiles);
    });

    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { }
    var isDark = saved === 'dark';
    setMode(isDark, false);

    // Toggle listener — state-locked during animation
    if (toggle) {
      toggle.addEventListener('change', function () {
        if (isAnimating) {
          // Revert checkbox to previous state
          this.checked = !this.checked;
          return;
        }
        setMode(this.checked, true);
      });
    }

    // Celestial icon → open info drawer
    if (celestialIcon) {
      celestialIcon.addEventListener('click', function () {
        if (!isAnimating) openDrawer();
      });
      celestialIcon.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isAnimating) openDrawer();
        }
      });
    }

    // Drawer close listeners
    if (drawerClose) {
      drawerClose.addEventListener('click', closeDrawer);
    }
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', closeDrawer);
    }
  }

  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
