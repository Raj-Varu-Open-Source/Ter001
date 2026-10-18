// PocketHub - Core Application Controller

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation handling
  const navButtons = document.querySelectorAll('.nav-item');
  const views = {
    notes: document.getElementById('notes-view'),
    trilium: document.getElementById('view-trilium'),
    videos: document.getElementById('videos-view'),
    music: document.getElementById('music-view')
  };

  // Trilium Dynamic Host Resolution & Frame Management
  const triliumFrame = document.getElementById('trilium-frame');
  const triliumNewTabLink = document.getElementById('trilium-new-tab-link');
  const triliumReloadBtn = document.getElementById('trilium-reload-btn');

  function getTriliumUrl() {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8080`;
  }

  function initTriliumView() {
    const triliumUrl = getTriliumUrl();
    if (triliumNewTabLink) {
      triliumNewTabLink.href = triliumUrl;
    }
  }

  function loadTriliumFrameIfNeeded() {
    if (triliumFrame && (!triliumFrame.src || triliumFrame.src === 'about:blank' || triliumFrame.getAttribute('src') === 'about:blank')) {
      triliumFrame.src = getTriliumUrl();
    }
  }

  if (triliumReloadBtn && triliumFrame) {
    triliumReloadBtn.addEventListener('click', () => {
      triliumFrame.src = getTriliumUrl();
    });
  }

  initTriliumView();

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Update button active state
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update view active state
      Object.keys(views).forEach(tab => {
        if (views[tab]) {
          if (tab === targetTab) {
            views[tab].classList.add('active');
            if (tab === 'trilium') {
              loadTriliumFrameIfNeeded();
            }
          } else {
            views[tab].classList.remove('active');
          }
        }
      });
    });
  });

  // Initialize modules
  Notes.init();
  Videos.init();
  Music.init();
  Storage.init();

  console.log('📱 PocketHub client initialized successfully.');
});
