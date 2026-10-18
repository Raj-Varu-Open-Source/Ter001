// PocketHub - Videos Module
const Videos = (() => {
  let videos = [];
  const videosListEl = document.getElementById('videos-list');
  const searchInput = document.getElementById('videos-search');
  const dropzone = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('video-file-input');
  const progressContainer = document.getElementById('video-upload-progress');
  const progressFill = document.getElementById('video-progress-fill');
  const progressText = document.getElementById('video-progress-text');
  const videoModal = document.getElementById('video-modal');
  const videoPlayer = document.getElementById('main-video-player');
  const videoModalTitle = document.getElementById('video-modal-title');

  async function loadVideos(query = '') {
    try {
      const url = query ? `/api/media?type=video&search=${encodeURIComponent(query)}` : '/api/media?type=video';
      const res = await fetch(url);
      videos = await res.json();
      render();
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
  }

  function formatFileSize(bytes) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function render() {
    if (!videosListEl) return;
    if (videos.length === 0) {
      videosListEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🎬</div>
          <h3>No videos yet</h3>
          <p>Drag and drop or upload a video above to start building your library.</p>
        </div>
      `;
      return;
    }

    videosListEl.innerHTML = videos.map(video => {
      const thumbSrc = video.thumbnail_path
        ? `/api/media/${video.id}/thumbnail`
        : '';
      const sizeStr = formatFileSize(video.file_size);
      const dateStr = new Date(video.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      });

      return `
        <div class="video-card" data-id="${video.id}">
          <div class="video-thumb-container" onclick="Videos.playVideo(${video.id})">
            ${thumbSrc ? `<img src="${thumbSrc}" class="video-thumb-img" alt="Thumbnail">` : `<div style="font-size:3rem; opacity:0.4;">🎬</div>`}
            <div class="video-play-overlay">▶</div>
          </div>
          <div class="video-card-body">
            <div class="video-title" title="${escapeHtml(video.original_name)}">${escapeHtml(video.original_name)}</div>
            <div class="video-meta">${sizeStr} • ${dateStr}</div>
            <div class="video-actions">
              <button class="action-btn" onclick="Videos.playVideo(${video.id})">▶ Watch</button>
              <a href="/api/media/${video.id}/download" class="action-btn" download>⬇ Download</a>
              <button class="action-btn delete" onclick="Videos.deleteVideo(${video.id})">🗑 Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function playVideo(id) {
    const video = videos.find(v => v.id === id);
    if (!video) return;

    if (typeof Music !== 'undefined' && typeof Music.pause === 'function') {
      Music.pause();
    }

    videoModalTitle.textContent = video.original_name;
    videoPlayer.src = `/api/media/${video.id}/stream`;
    videoModal.style.display = 'flex';
    videoPlayer.play().catch(() => {});
  }

  function closeVideoModal() {
    videoPlayer.pause();
    videoPlayer.src = '';
    videoModal.style.display = 'none';
  }

  async function deleteVideo(id) {
    if (!confirm('Are you sure you want to remove this video from your phone?')) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete video');
      showToast('Video deleted');
      loadVideos(searchInput ? searchInput.value : '');
      Storage.updateStorage();
    } catch (err) {
      alert('Error deleting video: ' + err.message);
    }
  }

  // Client-side canvas snapshot thumbnail capture (zero battery/zero FFmpeg on phone)
  function captureVideoThumbnail(file) {
    return new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.muted = true;
      tempVideo.playsInline = true;

      const objectUrl = URL.createObjectURL(file);
      tempVideo.src = objectUrl;

      tempVideo.onloadeddata = () => {
        tempVideo.currentTime = Math.min(1.0, tempVideo.duration / 2);
      };

      tempVideo.onseeked = () => {
        try {
          const canvas = document.getElementById('thumbnail-canvas') || document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(objectUrl);
            resolve(blob);
          }, 'image/jpeg', 0.75);
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        }
      };

      tempVideo.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };

      // Timeout safety: if video fails to seek within 3 seconds, continue without thumbnail
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }, 3000);
    });
  }


  async function uploadFile(file) {
    if (!file) return;

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = `Preparing upload: ${file.name}...`;

    // 1. Capture thumbnail in browser
    let thumbBlob = null;
    try {
      thumbBlob = await captureVideoThumbnail(file);
    } catch (e) {
      console.warn('Thumbnail generation skipped:', e);
    }

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append('file', file);
    if (thumbBlob) {
      formData.append('thumbnail', thumbBlob, 'thumbnail.jpg');
    }

    // 3. Upload with XMLHttpRequest for real progress tracking
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = percent + '%';
        progressText.textContent = `Uploading ${file.name}... ${percent}%`;
      }
    };

    xhr.onload = () => {
      progressContainer.style.display = 'none';
      if (xhr.status === 201) {
        showToast('Video uploaded successfully!');
        loadVideos(searchInput ? searchInput.value : '');
        Storage.updateStorage();
      } else {
        alert('Upload failed: ' + xhr.responseText);
      }
    };

    xhr.onerror = () => {
      progressContainer.style.display = 'none';
      alert('Upload failed due to a network error.');
    };

    xhr.send(formData);
  }

  function init() {
    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
      }
    });

    // Drag and drop handlers
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    document.getElementById('close-video-modal')?.addEventListener('click', closeVideoModal);

    // Search filter
    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadVideos(e.target.value);
      }, 250);
    });

    loadVideos();
  }

  return { init, loadVideos, playVideo, deleteVideo };
})();
