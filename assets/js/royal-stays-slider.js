/**
 * Royal Stays — Swiper Slider
 * Main slider with parallax background + vertical thumbnail nav
 */
(function () {
    'use strict';

    const mainSelector  = '.rs-main-slider';
    const navSelector   = '.rs-nav-slider';
    const interleaveOffset = 0.5;

    // Main Slider
    const mainSlider = new Swiper(mainSelector, {
        loop: true,
        speed: 1000,
        autoplay: {
            delay: 4000,
            disableOnInteraction: false
        },
        loopAdditionalSlides: 10,
        grabCursor: true,
        watchSlidesProgress: true,
        navigation: {
            nextEl: '.rs-btn-next',
            prevEl: '.rs-btn-prev'
        },
        on: {
            init: function () {
                this.autoplay.stop();
            },
            imagesReady: function () {
                this.el.classList.remove('loading');
                this.autoplay.start();
            },
            slideChangeTransitionEnd: function () {
                const captions = this.el.querySelectorAll('.rs-slide-caption');
                captions.forEach(function (c) { c.classList.remove('show'); });
                const active = this.slides[this.activeIndex];
                if (active) {
                    const cap = active.querySelector('.rs-slide-caption');
                    if (cap) cap.classList.add('show');
                }
            },
            progress: function () {
                for (let i = 0; i < this.slides.length; i++) {
                    const slideProgress = this.slides[i].progress;
                    const innerOffset   = this.width * interleaveOffset;
                    const innerTranslate = slideProgress * innerOffset;
                    const bg = this.slides[i].querySelector('.rs-slide-bg');
                    if (bg) bg.style.transform = 'translateX(' + innerTranslate + 'px)';
                }
            },
            touchStart: function () {
                for (let i = 0; i < this.slides.length; i++) {
                    this.slides[i].style.transition = '';
                }
            },
            setTransition: function (speed) {
                for (let i = 0; i < this.slides.length; i++) {
                    this.slides[i].style.transition = speed + 'ms';
                    const bg = this.slides[i].querySelector('.rs-slide-bg');
                    if (bg) bg.style.transition = speed + 'ms';
                }
            }
        }
    });

    // Thumbnail Navigation Slider
    const navSlider = new Swiper(navSelector, {
        loop: true,
        loopAdditionalSlides: 10,
        speed: 1000,
        spaceBetween: 5,
        slidesPerView: 5,
        centeredSlides: true,
        touchRatio: 0.2,
        slideToClickedSlide: true,
        direction: 'vertical',
        breakpoints: {
            0: {
                direction: 'horizontal',
                slidesPerView: 3,
                spaceBetween: 4
            },
            992: {
                direction: 'vertical',
                slidesPerView: 5,
                spaceBetween: 5
            }
        },
        on: {
            imagesReady: function () {
                this.el.classList.remove('loading');
            },
            click: function () {
                mainSlider.autoplay.stop();
            }
        }
    });

    // Link sliders
    mainSlider.controller.control = navSlider;
    navSlider.controller.control  = mainSlider;
})();
