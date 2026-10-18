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
  const triliumFrameWrapper = document.getElementById('trilium-frame-wrapper');
  const triliumOfflineCard = document.getElementById('trilium-offline-card');
  const triliumNewTabLink = document.getElementById('trilium-new-tab-link');
  const triliumDirectBtn = document.getElementById('trilium-direct-btn');
  const triliumReloadBtn = document.getElementById('trilium-reload-btn');
  const triliumRetryBtn = document.getElementById('trilium-retry-btn');
  const triliumStatusDesc = document.getElementById('trilium-status-desc');

  function getTriliumUrl() {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8080`;
  }

  function initTriliumView() {
    const triliumUrl = getTriliumUrl();
    if (triliumNewTabLink) {
      triliumNewTabLink.href = triliumUrl;
    }
    if (triliumDirectBtn) {
      triliumDirectBtn.href = triliumUrl;
    }
  }

  async function checkTriliumConnection() {
    const triliumUrl = getTriliumUrl();
    if (triliumStatusDesc) {
      triliumStatusDesc.textContent = `Connecting to ${triliumUrl}...`;
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      await fetch(triliumUrl, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);

      if (triliumStatusDesc) {
        triliumStatusDesc.textContent = '✅ Trilium server is online on port 8080.';
      }
      if (triliumFrameWrapper) {
        triliumFrameWrapper.style.display = 'block';
        if (triliumFrame && (!triliumFrame.src || triliumFrame.src === 'about:blank' || triliumFrame.getAttribute('src') === 'about:blank')) {
          triliumFrame.src = triliumUrl;
        }
      }
    } catch (_) {
      if (triliumStatusDesc) {
        triliumStatusDesc.textContent = 'Trilium server is offline or starting up. Run ./setup-trilium.sh in Termux if not installed.';
      }
      if (triliumFrameWrapper) {
        triliumFrameWrapper.style.display = 'none';
      }
    }
  }

  if (triliumReloadBtn) {
    triliumReloadBtn.addEventListener('click', () => {
      checkTriliumConnection();
      if (triliumFrame) {
        triliumFrame.src = getTriliumUrl();
      }
    });
  }

  if (triliumRetryBtn) {
    triliumRetryBtn.addEventListener('click', () => {
      checkTriliumConnection();
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
              checkTriliumConnection();
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
