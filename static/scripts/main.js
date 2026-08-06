(function() {
  var html = document.documentElement;
  var saved = localStorage.getItem('umbrella-theme');

  var LIGHT_THEME_COLOR = '#FAF5EF';
  var DARK_THEME_COLOR = '#191613';

  var themeColor = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
  }

  if (saved === 'dark') applyTheme('dark');
  else if (saved === 'light') applyTheme('light');
  else {
    // respect system preference on first visit
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    }
  }

  var toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      var current = html.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('umbrella-theme', next);
    });
  }

  /* ==== Mobile overlay menu ==== */
  var navToggle = document.querySelector('.nav-toggle');
  var mobileMenu = document.querySelector('.mobile-menu');
  var body = document.body;

  function openMenu() {
    mobileMenu.classList.add('open');
    navToggle.classList.add('open');
    body.classList.add('menu-open');
  }

  function closeMenu() {
    mobileMenu.classList.remove('open');
    navToggle.classList.remove('open');
    body.classList.remove('menu-open');
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      if (mobileMenu.classList.contains('open')) closeMenu();
      else openMenu();
    });

    // close on link click
    mobileMenu.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', closeMenu);
    });

    // close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeMenu();
    });

    // close on resize to desktop
    window.addEventListener('resize', function() {
      if (window.innerWidth > 900) closeMenu();
    });
  }
})();
