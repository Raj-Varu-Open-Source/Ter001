// PocketHub - Storage & System Module
const Storage = (() => {
  const barEl = document.getElementById('storage-bar');
  const textEl = document.getElementById('storage-text');
  const rescanBtn = document.getElementById('rescan-btn');

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(0) + ' MB';
    }
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  async function updateStorage() {
    try {
      const res = await fetch('/api/system/storage');
      const data = await res.json();

      if (barEl) {
        barEl.style.width = data.percentUsed + '%';
        if (data.percentUsed > 85) {
          barEl.style.backgroundColor = 'var(--danger)';
        } else {
          barEl.style.backgroundColor = 'var(--primary)';
        }
      }

      if (textEl) {
        textEl.textContent = `${formatBytes(data.freeBytes)} free of ${formatBytes(data.totalBytes)} (${data.percentUsed}% used)`;
      }
    } catch (err) {
      console.warn('Failed to update storage stats:', err);
    }
  }

  async function triggerRescan() {
    if (rescanBtn) rescanBtn.classList.add('spinning');
    try {
      showToast('Scanning storage for new files...');
      const res = await fetch('/api/media/rescan', { method: 'POST' });
      const result = await res.json();
      showToast(`Scan complete: ${result.added} added, ${result.removed} removed`);

      // Refresh media views
      if (typeof Videos !== 'undefined') Videos.loadVideos();
      if (typeof Music !== 'undefined') Music.loadTracks();
      updateStorage();
    } catch (err) {
      alert('Rescan failed: ' + err.message);
    } finally {
      if (rescanBtn) rescanBtn.classList.remove('spinning');
    }
  }

  function init() {
    rescanBtn?.addEventListener('click', triggerRescan);
    document.getElementById('mobile-rescan-btn')?.addEventListener('click', triggerRescan);
    updateStorage();
  }


  return { init, updateStorage, triggerRescan };
})();
