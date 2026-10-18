// PocketHub - Videos Module (1:1 YouTube UI Clone & Theater Watch Mode)
const Videos = (() => {
  let videos = [];
  let currentPlayingVideo = null;
  const likedVideoIds = new Set();

  // Top bar & sub-navigation chips
  const chipAll = document.getElementById('yt-chip-all');
  const chipUpload = document.getElementById('yt-chip-upload');
  const searchInput = document.getElementById('videos-search');

  // Subviews
  const browseSubview = document.getElementById('yt-browse-subview');
  const watchSubview = document.getElementById('yt-watch-view');
  const uploadSubview = document.getElementById('video-upload-section');

  // Browse grid
  const videoGrid = document.getElementById('yt-video-grid');

  // Watch Theater elements
  const videoPlayer = document.getElementById('main-video-player');
  const watchTitle = document.getElementById('yt-watch-title');
  const watchMetaLine = document.getElementById('yt-watch-meta-line');
  const watchDesc = document.getElementById('yt-watch-desc');
  const likeBtn = document.getElementById('yt-like-btn');
  const likeLabel = document.getElementById('yt-like-label');
  const downloadBtn = document.getElementById('yt-download-btn');
  const deleteBtn = document.getElementById('yt-delete-btn');
  const closeTheaterBtn = document.getElementById('yt-close-theater-btn');
  const upNextList = document.getElementById('yt-up-next-list');

  // Upload studio elements
  const dropzone = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('video-file-input');
  const progressContainer = document.getElementById('video-upload-progress');
  const progressFill = document.getElementById('video-progress-fill');
  const progressText = document.getElementById('video-progress-text');

  function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '0 B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatDuration(sec) {
    if (!sec || isNaN(sec)) return '';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // --- Subview Switching ---
  function switchSubView(tabName) {
    [chipAll, chipUpload].forEach(c => c?.classList.remove('active'));

    if (browseSubview) browseSubview.style.display = 'none';
    if (watchSubview) watchSubview.style.display = 'none';
    if (uploadSubview) uploadSubview.style.display = 'none';

    if (tabName === 'all') {
      chipAll?.classList.add('active');
      if (browseSubview) browseSubview.style.display = 'flex';
      if (videoPlayer && !videoPlayer.paused) {
        videoPlayer.pause();
      }
    } else if (tabName === 'watch') {
      if (watchSubview) watchSubview.style.display = 'flex';
    } else if (tabName === 'upload') {
      chipUpload?.classList.add('active');
      if (uploadSubview) uploadSubview.style.display = 'flex';
      if (videoPlayer && !videoPlayer.paused) {
        videoPlayer.pause();
      }
    }
  }

  // --- Data Loading ---
  async function loadVideos(query = '') {
    try {
      const url = query ? `/api/media?type=video&search=${encodeURIComponent(query)}` : '/api/media?type=video';
      const res = await fetch(url);
      videos = await res.json();
      renderBrowseGrid();
      if (currentPlayingVideo) {
        renderUpNext();
      }
    } catch (err) {
      console.error('Failed to load videos:', err);
    }
  }

  // --- Browse Grid Rendering ---
  function renderBrowseGrid() {
    if (!videoGrid) return;

    if (videos.length === 0) {
      videoGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--yt-text-sub);">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">🎬</div>
          <h3>No videos found</h3>
          <p>Drop video files into the Upload Studio to begin your YouTube collection.</p>
        </div>
      `;
      return;
    }

    videoGrid.innerHTML = videos.map(video => {
      const thumbSrc = video.thumbnail_path ? `/api/media/${video.id}/thumbnail` : '';
      const sizeStr = formatFileSize(video.file_size);
      const dateStr = new Date(video.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      const durationBadge = video.duration ? `<span class="yt-duration-badge">${formatDuration(video.duration)}</span>` : `<span class="yt-duration-badge">HD</span>`;

      return `
        <div class="yt-card" onclick="Videos.playVideo(${video.id})">
          <div class="yt-thumb-box">
            ${thumbSrc ? `<img src="${thumbSrc}" class="yt-thumb-img" alt="Thumbnail" loading="lazy">` : `<div style="font-size:3.5rem; opacity:0.3;">🎬</div>`}
            ${durationBadge}
          </div>
          <div class="yt-card-details">
            <div class="yt-channel-avatar">🎬</div>
            <div class="yt-card-info">
              <div class="yt-card-title" title="${escapeHtml(video.original_name)}">${escapeHtml(video.original_name)}</div>
              <div class="yt-channel-name">PocketHub Media</div>
              <div class="yt-card-meta">${sizeStr} • ${dateStr}</div>
              <div class="yt-card-actions">
                <a href="/api/media/${video.id}/download" class="action-btn" download onclick="event.stopPropagation();" title="Download video">⬇ Download</a>
                <button class="action-btn delete" onclick="event.stopPropagation(); Videos.deleteVideo(${video.id});" title="Delete video">🗑</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Watch Theater Mode ---
  function playVideo(id) {
    const video = videos.find(v => v.id === id);
    if (!video) return;

    currentPlayingVideo = video;

    // Pause music if Spotify is playing
    if (typeof Music !== 'undefined' && typeof Music.pause === 'function') {
      Music.pause();
    }

    // Populate Theater Player & Meta
    if (videoPlayer) {
      videoPlayer.src = `/api/media/${video.id}/stream`;
      videoPlayer.play().catch(() => {});
    }

    if (watchTitle) watchTitle.textContent = video.original_name;

    const sizeStr = formatFileSize(video.file_size);
    const dateStr = new Date(video.created_at).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    if (watchMetaLine) watchMetaLine.textContent = `${sizeStr} • Uploaded on ${dateStr}`;
    if (watchDesc) watchDesc.textContent = `Streaming directly from Android device storage (${video.file_path}). Supported by pure Node.js HTTP 206 Partial Content Range streaming.`;

    if (downloadBtn) {
      downloadBtn.href = `/api/media/${video.id}/download`;
    }

    if (deleteBtn) {
      deleteBtn.onclick = () => deleteVideo(video.id);
    }

    // Like state
    updateLikeButton();

    // Populate Up Next sidebar
    renderUpNext();

    // Transition view
    switchSubView('watch');
  }

  function updateLikeButton() {
    if (!likeBtn || !likeLabel || !currentPlayingVideo) return;
    const isLiked = likedVideoIds.has(currentPlayingVideo.id);
    likeLabel.textContent = isLiked ? 'Liked' : 'Like';
    likeBtn.style.color = isLiked ? 'var(--yt-red)' : 'inherit';
  }

  function toggleLike() {
    if (!currentPlayingVideo) return;
    if (likedVideoIds.has(currentPlayingVideo.id)) {
      likedVideoIds.delete(currentPlayingVideo.id);
      showToast('Removed from liked videos');
    } else {
      likedVideoIds.add(currentPlayingVideo.id);
      showToast('Added to liked videos! 👍');
    }
    updateLikeButton();
  }

  function closeTheater() {
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.src = '';
    }
    currentPlayingVideo = null;
    switchSubView('all');
  }

  function renderUpNext() {
    if (!upNextList) return;

    const remainingVideos = videos.filter(v => !currentPlayingVideo || v.id !== currentPlayingVideo.id);

    if (remainingVideos.length === 0) {
      upNextList.innerHTML = `
        <div style="color: var(--yt-text-sub); font-size: 0.85rem; padding: 12px 0;">
          No other videos in your library.
        </div>
      `;
      return;
    }

    upNextList.innerHTML = remainingVideos.map(video => {
      const thumbSrc = video.thumbnail_path ? `/api/media/${video.id}/thumbnail` : '';
      const sizeStr = formatFileSize(video.file_size);
      const durationBadge = video.duration ? `<span class="yt-duration-badge">${formatDuration(video.duration)}</span>` : `<span class="yt-duration-badge">HD</span>`;

      return `
        <div class="yt-up-next-card" onclick="Videos.playVideo(${video.id})">
          <div class="yt-up-next-thumb">
            ${thumbSrc ? `<img src="${thumbSrc}" alt="Thumbnail" loading="lazy">` : `<div style="font-size:2rem; opacity:0.3;">🎬</div>`}
            ${durationBadge}
          </div>
          <div class="yt-up-next-info">
            <div class="yt-up-next-title" title="${escapeHtml(video.original_name)}">${escapeHtml(video.original_name)}</div>
            <div class="yt-up-next-channel">PocketHub Media</div>
            <div class="yt-up-next-meta">${sizeStr}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Deletion ---
  async function deleteVideo(id) {
    if (!confirm('Are you sure you want to permanently delete this video?')) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete video');
      showToast('Video deleted');

      if (currentPlayingVideo && currentPlayingVideo.id === id) {
        closeTheater();
      }

      await loadVideos(searchInput ? searchInput.value : '');
      Storage.updateStorage();
    } catch (err) {
      alert('Error deleting video: ' + err.message);
    }
  }

  // --- Zero-CPU Client-Side Canvas Video Frame Thumbnail Capture ---
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

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      }, 3000);
    });
  }

  // --- Upload Handling ---
  async function uploadFiles(files) {
    if (!files || files.length === 0) return;

    if (progressContainer) progressContainer.style.display = 'block';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.textContent = `Processing (${i + 1}/${files.length}): ${file.name}...`;

      let thumbBlob = null;
      try {
        thumbBlob = await captureVideoThumbnail(file);
      } catch (e) {
        console.warn('Thumbnail generation skipped:', e);
      }

      const formData = new FormData();
      formData.append('file', file);
      if (thumbBlob) {
        formData.append('thumbnail', thumbBlob, 'thumbnail.jpg');
      }

      await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/media/upload');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && progressFill && progressText) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = percent + '%';
            progressText.textContent = `Uploading (${i + 1}/${files.length}): ${file.name}... ${percent}%`;
          }
        };

        xhr.onload = () => {
          resolve();
        };

        xhr.onerror = () => {
          resolve();
        };

        xhr.send(formData);
      });
    }

    if (progressContainer) progressContainer.style.display = 'none';
    showToast('Video upload completed! 🎬');
    await loadVideos();
    Storage.updateStorage();
    switchSubView('all');
  }

  // --- Initialization ---
  function init() {
    // Chips navigation
    chipAll?.addEventListener('click', () => switchSubView('all'));
    chipUpload?.addEventListener('click', () => switchSubView('upload'));

    // Theater controls
    closeTheaterBtn?.addEventListener('click', closeTheater);
    likeBtn?.addEventListener('click', toggleLike);

    // Auto-advance in theater mode when video ends
    videoPlayer?.addEventListener('ended', () => {
      if (currentPlayingVideo && videos.length > 1) {
        const remaining = videos.filter(v => v.id !== currentPlayingVideo.id);
        if (remaining.length > 0) {
          playVideo(remaining[0].id);
        }
      }
    });

    // Upload dropzone
    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadFiles(e.target.files);
      }
    });

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
        uploadFiles(e.dataTransfer.files);
      }
    });

    // Search
    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadVideos(e.target.value.toLowerCase().trim());
      }, 250);
    });

    loadVideos();
  }

  return {
    init,
    loadVideos,
    playVideo,
    closeTheater,
    deleteVideo
  };
})();
