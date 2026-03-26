/* ==========================================================================
   Farm Adventures — Premium Mobile Slider JS
   Netflix-style 3D depth cards · Touch gestures · Lazy loading
   Active only at ≤ 768 px
   ========================================================================== */
(function () {
    'use strict';

    var MOBILE_BP = 768;
    var initialized = false;
    var track, dots, counter, cards, hint;
    var currentIndex = 0;
    var totalCards = 0;
    var rafId = null;

    document.addEventListener('DOMContentLoaded', function () {
        if (window.innerWidth <= MOBILE_BP) {
            buildSlider();
        }
        window.addEventListener('resize', onResize);
    });

    /* ══════════════════════════════════════════
       RESIZE HANDLER
       ══════════════════════════════════════════ */
    var resizeTimer;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (window.innerWidth <= MOBILE_BP && !initialized) {
                buildSlider();
            }
        }, 200);
    }

    /* ══════════════════════════════════════════
       BUILD SLIDER — Read desktop cards, clone into slider
       ══════════════════════════════════════════ */
    function buildSlider() {
        var container = document.getElementById('famSlider');
        if (!container) return;

        track = container.querySelector('.fam-slider__track');
        if (!track) return;

        // Read experience data from desktop cards
        var desktopCards = document.querySelectorAll('.fa-cards .fa-exp');
        if (!desktopCards.length) return;

        totalCards = desktopCards.length;

        // Build cards
        var fragment = document.createDocumentFragment();

        desktopCards.forEach(function (dCard, i) {
            var img = dCard.querySelector('.fa-exp__img');
            var numEl = dCard.querySelector('.fa-exp__number');
            var titleEl = dCard.querySelector('.fa-exp__title');
            var descEl = dCard.querySelector('.fa-exp__desc');

            var card = document.createElement('div');
            // First card starts active
            card.className = 'fam-card' + (i === 0 ? ' is-active' : '');
            card.setAttribute('data-index', i);

            // Padded number
            var num = numEl ? numEl.textContent.trim() : String(i + 1).padStart(2, '0');
            var title = titleEl ? titleEl.textContent.trim() : '';
            var desc = descEl ? descEl.textContent.trim() : '';
            var imgSrc = img ? img.getAttribute('src') : '';
            var imgAlt = img ? (img.getAttribute('alt') || title) : title;

            // First card: use src directly for instant render
            // Other cards: use data-src for lazy loading
            var imgAttr = (i === 0)
                ? 'src="' + imgSrc + '"'
                : 'data-src="' + imgSrc + '"';

            card.innerHTML =
                '<div class="fam-card__img-wrap">' +
                    '<img class="fam-card__img" ' + imgAttr + ' alt="' + imgAlt + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" width="400" height="500">' +
                    '<div class="fam-card__overlay"></div>' +
                '</div>' +
                '<div class="fam-card__text">' +
                    '<span class="fam-card__number">' + num + '</span>' +
                    '<h3 class="fam-card__title">' + title + '</h3>' +
                    '<div class="fam-card__divider"></div>' +
                    '<p class="fam-card__desc">' + desc + '</p>' +
                '</div>';

            fragment.appendChild(card);
        });

        track.appendChild(fragment);

        // Build pagination dots
        var dotsWrap = container.querySelector('.fam-slider__dots');
        if (dotsWrap) {
            var dotsFrag = document.createDocumentFragment();
            for (var d = 0; d < totalCards; d++) {
                var dot = document.createElement('button');
                dot.className = 'fam-slider__dot' + (d === 0 ? ' is-active' : '');
                dot.setAttribute('aria-label', 'Go to card ' + (d + 1));
                dot.setAttribute('data-index', d);
                dotsFrag.appendChild(dot);
            }
            dotsWrap.appendChild(dotsFrag);
        }

        // Cache elements
        cards = track.querySelectorAll('.fam-card');
        dots = container.querySelectorAll('.fam-slider__dot');
        counter = container.querySelector('.fam-slider__counter');
        hint = container.querySelector('.fam-slider__hint');

        // Ensure first card is active and counter shows 01
        currentIndex = 0;
        updateCounter(0);

        // Reset scroll to start (first card)
        track.scrollLeft = 0;

        // Setup lazy loading
        setupLazyLoad();

        // Immediately load first 3 images (2nd and 3rd use data-src)
        for (var k = 1; k < Math.min(3, cards.length); k++) {
            loadImage(cards[k].querySelector('.fam-card__img'));
        }

        // Dot clicks
        if (dotsWrap) {
            dotsWrap.addEventListener('click', function (e) {
                var dotBtn = e.target.closest('.fam-slider__dot');
                if (!dotBtn) return;
                var idx = parseInt(dotBtn.getAttribute('data-index'), 10);
                scrollToCard(idx);
            });
        }

        // Native CSS scroll-snap handles smooth swiping.
        // We only listen for scroll events to update active card state.

        // Scroll listener for active state
        track.addEventListener('scroll', onTrackScroll, { passive: true });

        initialized = true;
    }

    /* ══════════════════════════════════════════
       SCROLL HANDLER — Detect active card
       ══════════════════════════════════════════ */
    function onTrackScroll() {
        if (rafId) return;
        rafId = requestAnimationFrame(function () {
            rafId = null;
            var scrollLeft = track.scrollLeft;
            var trackWidth = track.offsetWidth;
            var best = 0;
            var bestDist = Infinity;

            for (var i = 0; i < cards.length; i++) {
                var cardLeft = cards[i].offsetLeft - track.offsetLeft;
                var cardCenter = cardLeft + cards[i].offsetWidth / 2;
                var viewCenter = scrollLeft + trackWidth / 2;
                var dist = Math.abs(cardCenter - viewCenter);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = i;
                }
            }

            if (best !== currentIndex) {
                setActive(best);
            }
        });
    }

    /* ══════════════════════════════════════════
       SET ACTIVE CARD
       ══════════════════════════════════════════ */
    function setActive(idx) {
        currentIndex = idx;

        // Update card classes
        for (var i = 0; i < cards.length; i++) {
            if (i === idx) {
                cards[i].classList.add('is-active');
            } else {
                cards[i].classList.remove('is-active');
            }
        }

        // Update dots
        for (var d = 0; d < dots.length; d++) {
            if (d === idx) {
                dots[d].classList.add('is-active');
            } else {
                dots[d].classList.remove('is-active');
            }
        }

        // Update counter
        updateCounter(idx);

        // Hide hint after first swipe
        if (hint && idx > 0) {
            hint.classList.add('is-hidden');
        }
    }

    /* ══════════════════════════════════════════
       SCROLL TO CARD (dot tap)
       ══════════════════════════════════════════ */
    function scrollToCard(idx) {
        if (idx < 0 || idx >= cards.length) return;
        var cardLeft = cards[idx].offsetLeft - track.offsetLeft;
        var scrollPad = parseInt(getComputedStyle(track).paddingLeft, 10) || 20;
        track.scrollTo({
            left: cardLeft - scrollPad,
            behavior: 'smooth'
        });
    }

    /* ══════════════════════════════════════════
       COUNTER UPDATE
       ══════════════════════════════════════════ */
    function updateCounter(idx) {
        if (!counter) return;
        var cur = counter.querySelector('.fam-slider__counter-current');
        if (cur) cur.textContent = String(idx + 1).padStart(2, '0');
    }

    /* ══════════════════════════════════════════
       LAZY LOADING — IntersectionObserver
       ══════════════════════════════════════════ */
    function setupLazyLoad() {
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all
            var imgs = track.querySelectorAll('.fam-card__img[data-src]');
            imgs.forEach(function (img) { loadImage(img); });
            return;
        }

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    loadImage(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: track,
            rootMargin: '0px 200px 0px 200px',
            threshold: 0.01
        });

        var imgs = track.querySelectorAll('.fam-card__img[data-src]');
        imgs.forEach(function (img) { observer.observe(img); });
    }

    function loadImage(img) {
        if (!img || !img.getAttribute('data-src')) return;
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
    }

})();
