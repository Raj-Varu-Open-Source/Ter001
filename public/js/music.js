// PocketHub - Music Module & Persistent Audio Player
const Music = (() => {
  let tracks = [];
  let currentTrackIndex = -1;
  const audioElement = new Audio();

  const musicListEl = document.getElementById('music-list');
  const searchInput = document.getElementById('music-search');
  const dropzone = document.getElementById('music-dropzone');
  const fileInput = document.getElementById('music-file-input');
  const progressContainer = document.getElementById('music-upload-progress');
  const progressFill = document.getElementById('music-progress-fill');
  const progressText = document.getElementById('music-progress-text');

  // Bottom player bar elements
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playBtn = document.getElementById('player-play-btn');
  const prevBtn = document.getElementById('player-prev-btn');
  const nextBtn = document.getElementById('player-next-btn');
  const scrubSlider = document.getElementById('player-scrub');
  const currentTimeEl = document.getElementById('player-current-time');
  const totalTimeEl = document.getElementById('player-total-time');
  const volumeSlider = document.getElementById('player-volume');

  async function loadTracks(query = '') {
    try {
      const url = query ? `/api/media?type=music&search=${encodeURIComponent(query)}` : '/api/media?type=music';
      const res = await fetch(url);
      tracks = await res.json();
      render();
    } catch (err) {
      console.error('Failed to load music tracks:', err);
    }
  }

  function formatDuration(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function render() {
    if (!musicListEl) return;
    if (tracks.length === 0) {
      musicListEl.innerHTML = `
        <div style="text-align: center; padding: 48px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">🎵</div>
          <h3>No audio tracks found</h3>
          <p>Drop audio files above to build your music library.</p>
        </div>
      `;
      return;
    }

    musicListEl.innerHTML = tracks.map((track, idx) => {
      const isPlaying = currentTrackIndex === idx && !audioElement.paused;
      return `
        <div class="track-row" data-id="${track.id}">
          <button class="track-play-btn" onclick="Music.playTrackIndex(${idx})">
            ${isPlaying ? '⏸' : '▶'}
          </button>
          <div class="track-row-info" onclick="Music.playTrackIndex(${idx})" style="cursor:pointer;">
            <div class="track-row-title">${escapeHtml(track.original_name)}</div>
            <div class="track-row-meta">Audio • ${(track.file_size / (1024 * 1024)).toFixed(1)} MB</div>
          </div>
          <div class="video-actions">
            <a href="/api/media/${track.id}/download" class="action-btn" download>⬇</a>
            <button class="action-btn delete" onclick="Music.deleteTrack(${track.id})">🗑</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function playTrackIndex(idx) {
    if (idx < 0 || idx >= tracks.length) return;

    if (currentTrackIndex === idx) {
      // Toggle play/pause
      if (audioElement.paused) {
        audioElement.play();
      } else {
        audioElement.pause();
      }
      return;
    }

    currentTrackIndex = idx;
    const track = tracks[currentTrackIndex];
    playerTitle.textContent = track.original_name;
    playerArtist.textContent = 'PocketHub Music';
    audioElement.src = `/api/media/${track.id}/stream`;
    audioElement.play().catch(() => {});
    render();
  }

  function playNext() {
    if (tracks.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    playTrackIndex(nextIdx);
  }

  function playPrev() {
    if (tracks.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrackIndex(prevIdx);
  }

  async function deleteTrack(id) {
    if (!confirm('Are you sure you want to remove this audio file?')) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete track');
      showToast('Track removed');
      loadTracks(searchInput ? searchInput.value : '');
      Storage.updateStorage();
    } catch (err) {
      alert('Error deleting audio file: ' + err.message);
    }
  }

  async function uploadFile(file) {
    if (!file) return;

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = `Uploading audio: ${file.name}...`;

    const formData = new FormData();
    formData.append('file', file);

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
        showToast('Audio track uploaded!');
        loadTracks(searchInput ? searchInput.value : '');
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

  function setupPlayerEvents() {
    playBtn?.addEventListener('click', () => {
      if (currentTrackIndex === -1 && tracks.length > 0) {
        playTrackIndex(0);
      } else if (!audioElement.paused) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
    });

    prevBtn?.addEventListener('click', playPrev);
    nextBtn?.addEventListener('click', playNext);

    audioElement.addEventListener('play', () => {
      if (playBtn) playBtn.textContent = '⏸';
      render();
    });

    audioElement.addEventListener('pause', () => {
      if (playBtn) playBtn.textContent = '▶';
      render();
    });

    audioElement.addEventListener('ended', playNext);

    audioElement.addEventListener('timeupdate', () => {
      if (!isNaN(audioElement.duration) && audioElement.duration > 0) {
        const pct = (audioElement.currentTime / audioElement.duration) * 100;
        if (scrubSlider) scrubSlider.value = pct;
        if (currentTimeEl) currentTimeEl.textContent = formatDuration(audioElement.currentTime);
        if (totalTimeEl) totalTimeEl.textContent = formatDuration(audioElement.duration);
      }
    });

    scrubSlider?.addEventListener('input', (e) => {
      if (!isNaN(audioElement.duration) && audioElement.duration > 0) {
        const newTime = (e.target.value / 100) * audioElement.duration;
        audioElement.currentTime = newTime;
      }
    });

    volumeSlider?.addEventListener('input', (e) => {
      audioElement.volume = parseFloat(e.target.value);
    });
  }

  function init() {
    dropzone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        uploadFile(e.target.files[0]);
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
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadTracks(e.target.value);
      }, 250);
    });

    setupPlayerEvents();
    loadTracks();
  }

  function pause() {
    if (!audioElement.paused) {
      audioElement.pause();
    }
  }

  return { init, loadTracks, playTrackIndex, deleteTrack, pause };
})();

