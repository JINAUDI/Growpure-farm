/**
 * Mobile Bottom Menu — Circular Expanding Animation
 * Reads nav links from the existing header, builds a bottom menu.
 * Only runs on ≤768px. Desktop untouched.
 */
(function () {
    'use strict';

    var MQ = '(max-width: 768px)';
    var menuEl = null;
    var isOpen = false;
    var scrollPos = 0;

    // ── Build the menu HTML ────────────────────────────────────────
    function buildMenu() {
        if (document.querySelector('.mob-menu')) return;

        // Read nav links from header
        var navLists = document.querySelectorAll('.cs_nav_list');
        var links = [];

        navLists.forEach(function (ul) {
            var items = ul.children;
            for (var i = 0; i < items.length; i++) {
                var li = items[i];
                var a = li.querySelector(':scope > a');
                if (!a) continue;

                var item = {
                    text: a.textContent.trim(),
                    href: a.getAttribute('href') || '#',
                    children: []
                };

                // Check for submenu
                var subUl = li.querySelector(':scope > ul');
                if (subUl) {
                    var subItems = subUl.querySelectorAll(':scope > li > a');
                    subItems.forEach(function (subA) {
                        item.children.push({
                            text: subA.textContent.trim(),
                            href: subA.getAttribute('href') || '#'
                        });
                    });
                }

                links.push(item);
            }
        });

        if (links.length === 0) return;

        // Build HTML
        var nav = document.createElement('nav');
        nav.className = 'mob-menu';
        nav.setAttribute('aria-label', 'Mobile navigation');

        var container = document.createElement('div');
        container.className = 'mob-menu__container';

        var list = document.createElement('ul');
        list.className = 'mob-menu__list';

        links.forEach(function (item) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = item.href;
            a.textContent = item.text;

            // If parent has children and href is non-navigating, make it reveal children
            if (item.children.length > 0 && (!item.href || item.href === '' || item.href === '#' || item.href === 'javascript:void(0)')) {
                a.href = '#';
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    var sub = this.nextElementSibling;
                    if (sub) {
                        sub.style.display = sub.style.display === 'block' ? 'none' : 'block';
                    }
                });
            }

            li.appendChild(a);

            if (item.children.length > 0) {
                var subUl = document.createElement('ul');
                subUl.className = 'mob-menu__sub';
                subUl.style.display = 'none';

                item.children.forEach(function (child) {
                    var subLi = document.createElement('li');
                    var subA = document.createElement('a');
                    subA.href = child.href;
                    subA.textContent = child.text;
                    subLi.appendChild(subA);
                    subUl.appendChild(subLi);
                });

                li.appendChild(subUl);
            }

            list.appendChild(li);
        });

        container.appendChild(list);

        // Toggle button
        var btn = document.createElement('button');
        btn.className = 'mob-menu__toggle';
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', 'Open menu');
        btn.innerHTML =
            '<span class="mob-menu__hamburger">' +
            '<span class="mob-menu__hamburger-group">' +
            '<span class="mob-menu__hamburger-label"></span>' +
            '<span class="mob-menu__sr-only">Menu</span>' +
            '</span>' +
            '</span>';

        btn.addEventListener('click', toggleMenu);

        nav.appendChild(container);
        nav.appendChild(btn);

        document.body.appendChild(nav);
        menuEl = nav;
    }

    // ── Toggle menu state ──────────────────────────────────────────
    function toggleMenu() {
        isOpen = !isOpen;

        if (isOpen) {
            scrollPos = window.scrollY;
            menuEl.classList.add('mob-menu--open');
            document.body.classList.add('mob-menu-lock');
            document.body.style.top = -scrollPos + 'px';
            menuEl.querySelector('.mob-menu__toggle').setAttribute('aria-label', 'Close menu');

            // Hide page content for a11y
            var siblings = document.body.children;
            for (var i = 0; i < siblings.length; i++) {
                if (siblings[i] !== menuEl && siblings[i].tagName !== 'SCRIPT') {
                    siblings[i].setAttribute('aria-hidden', 'true');
                    siblings[i].setAttribute('inert', '');
                }
            }
        } else {
            closeMenu();
        }
    }

    function closeMenu() {
        isOpen = false;
        menuEl.classList.remove('mob-menu--open');
        document.body.classList.remove('mob-menu-lock');
        document.body.style.top = '';
        window.scrollTo(0, scrollPos);
        menuEl.querySelector('.mob-menu__toggle').setAttribute('aria-label', 'Open menu');

        // Restore page content
        var siblings = document.body.children;
        for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] !== menuEl && siblings[i].tagName !== 'SCRIPT') {
                siblings[i].removeAttribute('aria-hidden');
                siblings[i].removeAttribute('inert');
            }
        }
    }

    // ── Escape key to close ────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) {
            closeMenu();
        }
    });

    // ── Media Query Gate ───────────────────────────────────────────
    function handleMQ(mq) {
        if (mq.matches) {
            if (document.readyState === 'complete') {
                buildMenu();
            } else {
                window.addEventListener('load', buildMenu);
            }
        } else {
            // Desktop — remove menu and reset
            if (menuEl) {
                if (isOpen) closeMenu();
                menuEl.parentNode.removeChild(menuEl);
                menuEl = null;
            }
        }
    }

    var mql = window.matchMedia(MQ);
    handleMQ(mql);

    if (mql.addEventListener) {
        mql.addEventListener('change', handleMQ);
    } else if (mql.addListener) {
        mql.addListener(handleMQ);
    }
})();
