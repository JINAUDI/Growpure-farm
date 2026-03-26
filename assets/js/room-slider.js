/**
 * Royal Stays — Dual-image vertical toggle
 * Runs inside the existing Slick slider (cs_single_room_slider_1)
 */
(function ($) {
    'use strict';

    $(document).ready(function () {
        var TOGGLE_MS = 3500;

        function startToggle($slide) {
            var $wrap = $slide.find('.rs-dual-wrap');
            var $dots = $slide.find('.rs-img-dot');
            if (!$wrap.length) return;

            var timer = setInterval(function () {
                if ($wrap.hasClass('show-second')) {
                    $wrap.removeClass('show-second');
                    $dots.removeClass('active').eq(0).addClass('active');
                } else {
                    $wrap.addClass('show-second');
                    $dots.removeClass('active').eq(1).addClass('active');
                }
            }, TOGGLE_MS);

            $slide.data('rsTimer', timer);
        }

        function stopToggle($slide) {
            var t = $slide.data('rsTimer');
            if (t) { clearInterval(t); $slide.removeData('rsTimer'); }
            $slide.find('.rs-dual-wrap').removeClass('show-second');
            $slide.find('.rs-img-dot').removeClass('active').eq(0).addClass('active');
        }

        // Manual dot click
        $(document).on('click', '.rs-img-dot', function () {
            var $dot  = $(this);
            var $slide = $dot.closest('.cs_single_room_thumbnail');
            var $wrap  = $slide.find('.rs-dual-wrap');
            var $dots  = $slide.find('.rs-img-dot');
            var idx    = $dots.index($dot);

            stopToggle($slide);
            if (idx === 1) $wrap.addClass('show-second');
            $dots.removeClass('active').eq(idx).addClass('active');
            startToggle($slide);
        });

        // Hook into Slick afterChange — start toggle on new active slide
        var $slider = $('.cs_single_room_slider_1');
        if ($slider.length) {
            $slider.on('afterChange', function (e, slick, current) {
                // Stop all
                $slider.find('.cs_single_room_thumbnail').each(function () {
                    stopToggle($(this));
                });
                // Start on active
                var $active = $slider.find('.slick-active .cs_single_room_thumbnail');
                if (!$active.length) {
                    $active = $slider.find('.cs_single_room_thumbnail').eq(current);
                }
                startToggle($active);
            });

            // Start on initial slide after Slick init
            setTimeout(function () {
                var $first = $slider.find('.slick-active .cs_single_room_thumbnail');
                if (!$first.length) {
                    $first = $slider.find('.cs_single_room_thumbnail').first();
                }
                startToggle($first);
            }, 1000);
        }
    });
})(jQuery);
