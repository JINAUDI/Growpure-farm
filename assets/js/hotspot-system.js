/**
 * Hero Hotspot System
 * -------------------
 * Positions hotspots relative to the ACTUAL rendered image bounds,
 * not the container. Accounts for object-fit: cover cropping.
 *
 * Reference resolution: 1920 × 1080
 * Coordinate system: normalised % of image natural dimensions
 *
 * Anchor = marker position (% of image)
 * Boundary = polygon zone on the image that the hotspot represents
 *            (used for future click-area / interaction, NOT for
 *            repositioning the marker)
 */
(function () {
  'use strict';

  /* ── Config: hotspot anchors ── */
  var HOTSPOT_DATA = {
    safari:          { x: 10.8,  y: 58.7 },
    farm_area:       { x: 27.8,  y: 75.7 },
    sunny_sanctuary: { x: 66.4,  y: 62.6 },
    royal_cottage:   { x: 49.8,  y: 60.6 }
  };

  var container = document.querySelector('.cs_hotspots_container');
  if (!container) return;

  var wrapper = container.parentElement;   // the aspect-ratio div
  var img = wrapper ? wrapper.querySelector('img') : null;
  if (!img) return;

  var hotspots = container.querySelectorAll('.cs_hotspot');
  if (!hotspots.length) return;

  /* ── Image-relative positioning ── */

  /**
   * Calculate how object-fit: cover maps the image into the container.
   * Returns scale, rendered size, and offset of the image origin
   * relative to the container origin.
   */
  function getCoverTransform() {
    var cW = wrapper.clientWidth;
    var cH = wrapper.clientHeight;
    var nW = img.naturalWidth  || 1920;
    var nH = img.naturalHeight || 1080;

    var scale = Math.max(cW / nW, cH / nH);
    var renderedW = nW * scale;
    var renderedH = nH * scale;

    // object-position: center (default) — image is centred in container
    var offsetX = (renderedW - cW) / 2;
    var offsetY = (renderedH - cH) / 2;

    return {
      scale: scale,
      renderedW: renderedW,
      renderedH: renderedH,
      offsetX: offsetX,
      offsetY: offsetY,
      containerW: cW,
      containerH: cH
    };
  }

  /**
   * Convert image-% coordinate → container-% coordinate.
   * This accounts for any cropping/offset from object-fit: cover.
   */
  function imgPctToContainerPct(xPct, yPct, t) {
    // Position in the rendered (scaled) image, in px
    var imgX = (xPct / 100) * t.renderedW;
    var imgY = (yPct / 100) * t.renderedH;

    // Subtract the offset to get position within the container
    var containerX = imgX - t.offsetX;
    var containerY = imgY - t.offsetY;

    // Convert to container %
    return {
      x: (containerX / t.containerW) * 100,
      y: (containerY / t.containerH) * 100
    };
  }

  /**
   * Reposition all hotspots based on current image rendering.
   */
  function repositionAll() {
    var t = getCoverTransform();

    hotspots.forEach(function (el) {
      var data = HOTSPOT_DATA[el.id];
      if (!data) return;

      var pct = imgPctToContainerPct(data.x, data.y, t);
      el.style.left = pct.x + '%';
      el.style.top  = pct.y + '%';
    });
  }

  /* ── Run on image load + resize ── */
  function onReady() {
    repositionAll();
  }

  if (img.complete && img.naturalWidth > 0) {
    onReady();
  } else {
    img.addEventListener('load', onReady);
  }

  // Throttled resize
  var resizeRAF = null;
  window.addEventListener('resize', function () {
    if (resizeRAF) return;
    resizeRAF = requestAnimationFrame(function () {
      repositionAll();
      resizeRAF = null;
    });
  });

  /* ── Click interaction ── */
  hotspots.forEach(function (hs) {
    hs.addEventListener('click', function (e) {
      e.stopPropagation();
      var wasActive = hs.classList.contains('active');
      closeAll();
      if (!wasActive) {
        hs.classList.add('active');
      }
    });
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.cs_hotspot')) {
      closeAll();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAll();
    }
  });

  function closeAll() {
    hotspots.forEach(function (hs) {
      hs.classList.remove('active');
    });
  }
})();
