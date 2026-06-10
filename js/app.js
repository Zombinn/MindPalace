/* ============================================================
   MindPalace — Main Application
   Initialization, routing, and sidebar
   ============================================================ */

/* ============================================================
   MindPalace — Main Application v2
   ============================================================ */

const App = (() => {
  let currentRoute = '/';

  const NAV_ITEMS = [
    { route: '/', label: '仪表盘', icon: '🎯' },
    { route: '/daily', label: '每日任务', icon: '☀️' },
    { route: '/phases', label: '阶段管理', icon: '📅' },
    { route: '/jobs', label: '求职看板', icon: '📋' },
  ];

  function buildSidebar() {
    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo"><span>◆</span> MindPalace</div>
        </div>
        <nav class="sidebar-nav">
          ${NAV_ITEMS.map(item => `
            <a class="nav-item" data-route="${item.route}" href="#${item.route}">
              <span class="nav-icon">${item.icon}</span>${item.label}
            </a>
          `).join('')}
        </nav>
        <div class="sidebar-footer">
          <span>v3.0</span>
          <button class="theme-toggle" id="theme-toggle" title="切换主题">🌙</button>
        </div>
      </aside>
    `;
  }

  function init() {
    const root = document.getElementById('app');
    root.innerHTML = `
      <div class="app-layout">
        ${buildSidebar()}
        <main class="main-content">
          <button class="mobile-menu-btn" id="mobile-menu-btn">☰</button>
          <div id="app-body"></div>
        </main>
      </div>
    `;

    const theme = Store.getSetting('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.getElementById('theme-toggle').textContent = '☀️';
    }

    bindEvents();
    handleRoute();
    window.addEventListener('hashchange', handleRoute);
  }

  function handleRoute() {
    currentRoute = window.location.hash.slice(1) || '/';
    render();
  }

  function navigate(route) {
    window.location.hash = route;
  }

  function render() {
    Views.render(currentRoute);

    const menuBtn = document.getElementById('mobile-menu-btn');
    if (menuBtn) {
      menuBtn.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
      });
    }

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark-theme');
    Store.setSetting('theme', isDark ? 'dark' : 'light');
    document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
  }

  function bindEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(o => o.remove());
      }
    });
  }

  return { init, navigate, render };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
