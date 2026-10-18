// PocketHub - Music Module (1:1 Spotify UI Clone & Persistent Player)
const Music = (() => {
  let tracks = [];
  let allTracks = [];
  let playlists = [];
  let activePlaylist = null; // null = All Tracks
  let currentTrackIndex = -1;
  let isShuffled = false;
  let repeatMode = 'off'; // 'off', 'all', 'one'
  let pendingTrackIdForPlaylist = null;
  let previousVolume = 0.9;

  const audioElement = new Audio();

  // Sub-navigation pills
  const pillAll = document.getElementById('spotify-pill-all');
  const pillPlaylists = document.getElementById('spotify-pill-playlists');
  const pillUpload = document.getElementById('spotify-pill-upload');

  // Subviews
  const tracksSubview = document.getElementById('spotify-tracks-subview');
  const playlistsSubview = document.getElementById('spotify-playlists-subview');
  const uploadSubview = document.getElementById('music-upload-section');

  // Hero & action bar
  const heroCoverIcon = document.getElementById('hero-cover-icon');
  const heroTitle = document.getElementById('hero-title');
  const heroSubtitle = document.getElementById('hero-subtitle');
  const heroTrackCount = document.getElementById('hero-track-count');
  const heroPlayBtn = document.getElementById('spotify-hero-play-btn');
  const playlistActions = document.getElementById('spotify-playlist-actions');
  const deletePlaylistBtn = document.getElementById('spotify-delete-playlist-btn');

  // Shelf & Grids
  const shelfPlaylistList = document.getElementById('spotify-playlist-list');
  const playlistsGrid = document.getElementById('spotify-playlists-grid');
  const musicListEl = document.getElementById('music-list');
  const searchInput = document.getElementById('music-search');

  // Playlist Modals
  const createPlaylistBtn = document.getElementById('spotify-create-playlist-btn');
  const newPlBtn = document.getElementById('spotify-new-pl-btn');
  const modalCreatePlaylist = document.getElementById('modal-create-playlist');
  const newPlaylistNameInput = document.getElementById('new-playlist-name-input');
  const btnCancelPlaylist = document.getElementById('btn-cancel-playlist');
  const btnConfirmPlaylist = document.getElementById('btn-confirm-playlist');

  const modalAddToPlaylist = document.getElementById('modal-add-to-playlist');
  const addToPlaylistOptions = document.getElementById('add-to-playlist-options');
  const btnCloseAddPlaylist = document.getElementById('btn-close-add-playlist');

  // Upload elements
  const dropzone = document.getElementById('music-dropzone');
  const fileInput = document.getElementById('music-file-input');
  const progressContainer = document.getElementById('music-upload-progress');
  const progressFill = document.getElementById('music-progress-fill');
  const progressText = document.getElementById('music-progress-text');

  // Bottom player bar elements
  const playerBar = document.getElementById('audio-player-bar');
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerArt = document.getElementById('player-art');
  const playBtn = document.getElementById('player-play-btn');
  const prevBtn = document.getElementById('player-prev-btn');
  const nextBtn = document.getElementById('player-next-btn');
  const shuffleBtn = document.getElementById('player-shuffle-btn');
  const repeatBtn = document.getElementById('player-repeat-btn');
  const scrubSlider = document.getElementById('player-scrub');
  const currentTimeEl = document.getElementById('player-current-time');
  const totalTimeEl = document.getElementById('player-total-time');
  const volumeSlider = document.getElementById('player-volume');
  const muteBtn = document.getElementById('player-mute-btn');

  function formatDuration(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // --- Sub-View Navigation ---
  function switchSubView(tabName) {
    [pillAll, pillPlaylists, pillUpload].forEach(p => p?.classList.remove('active'));

    if (tracksSubview) tracksSubview.style.display = 'none';
    if (playlistsSubview) playlistsSubview.style.display = 'none';
    if (uploadSubview) uploadSubview.style.display = 'none';

    if (tabName === 'all') {
      pillAll?.classList.add('active');
      if (tracksSubview) tracksSubview.style.display = 'flex';
      selectPlaylist(null);
    } else if (tabName === 'playlists') {
      pillPlaylists?.classList.add('active');
      if (playlistsSubview) playlistsSubview.style.display = 'flex';
      renderPlaylistsGrid();
    } else if (tabName === 'upload') {
      pillUpload?.classList.add('active');
      if (uploadSubview) uploadSubview.style.display = 'flex';
    }
  }

  // --- Data Loading ---
  async function loadAllTracks(query = '') {
    try {
      const url = query ? `/api/media?type=music&search=${encodeURIComponent(query)}` : '/api/media?type=music';
      const res = await fetch(url);
      allTracks = await res.json();
      if (!activePlaylist) {
        tracks = allTracks;
        renderHero();
        renderTracks();
      }
    } catch (err) {
      console.error('Failed to load music tracks:', err);
    }
  }

  async function loadPlaylists() {
    try {
      const res = await fetch('/api/playlists');
      playlists = await res.json();
      renderShelf();
      renderPlaylistsGrid();
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  }

  async function selectPlaylist(playlistId) {
    if (!playlistId) {
      activePlaylist = null;
      tracks = allTracks;
      renderHero();
      renderShelf();
      renderTracks();
      if (tracksSubview) tracksSubview.style.display = 'flex';
      if (playlistsSubview) playlistsSubview.style.display = 'none';
      if (uploadSubview) uploadSubview.style.display = 'none';
      [pillAll, pillPlaylists, pillUpload].forEach(p => p?.classList.remove('active'));
      pillAll?.classList.add('active');
      return;
    }

    try {
      const res = await fetch(`/api/playlists/${playlistId}`);
      if (!res.ok) throw new Error('Playlist not found');
      activePlaylist = await res.json();
      tracks = activePlaylist.tracks || [];

      renderHero();
      renderShelf();
      renderTracks();

      if (tracksSubview) tracksSubview.style.display = 'flex';
      if (playlistsSubview) playlistsSubview.style.display = 'none';
      if (uploadSubview) uploadSubview.style.display = 'none';
      [pillAll, pillPlaylists, pillUpload].forEach(p => p?.classList.remove('active'));
    } catch (err) {
      console.error('Failed to select playlist:', err);
      showToast('Could not load playlist');
    }
  }

  // --- Rendering UI ---
  function renderHero() {
    if (activePlaylist) {
      if (heroCoverIcon) heroCoverIcon.textContent = '📚';
      if (heroTitle) heroTitle.textContent = activePlaylist.name;
      if (heroSubtitle) heroSubtitle.textContent = `Custom Playlist • ${tracks.length} songs`;
      if (heroTrackCount) heroTrackCount.textContent = `${tracks.length} songs`;
      if (playlistActions) playlistActions.style.display = 'block';
    } else {
      if (heroCoverIcon) heroCoverIcon.textContent = '🎵';
      if (heroTitle) heroTitle.textContent = 'All Audio Collection';
      if (heroSubtitle) heroSubtitle.textContent = `PocketHub Hotspot • ${tracks.length} songs`;
      if (heroTrackCount) heroTrackCount.textContent = `${tracks.length} songs`;
      if (playlistActions) playlistActions.style.display = 'none';
    }
    updateHeroPlayBtn();
  }

  function updateHeroPlayBtn() {
    if (!heroPlayBtn) return;
    const isPlayingCurrentList = currentTrackIndex >= 0 && currentTrackIndex < tracks.length && !audioElement.paused;
    heroPlayBtn.textContent = isPlayingCurrentList ? '⏸' : '▶';
  }

  function renderShelf() {
    if (!shelfPlaylistList) return;

    const allItem = `
      <div class="shelf-item ${activePlaylist === null ? 'active' : ''}" onclick="Music.selectPlaylist(null)">
        <div class="shelf-item-cover" style="background: linear-gradient(135deg, #1db954, #191414);">🎵</div>
        <div class="shelf-item-info">
          <div class="shelf-item-name">All Tracks</div>
          <div class="shelf-item-meta">${allTracks.length} songs</div>
        </div>
      </div>
    `;

    const playlistItems = playlists.map(pl => {
      const isActive = activePlaylist && activePlaylist.id === pl.id;
      return `
        <div class="shelf-item ${isActive ? 'active' : ''}" onclick="Music.selectPlaylist(${pl.id})">
          <div class="shelf-item-cover">📚</div>
          <div class="shelf-item-info">
            <div class="shelf-item-name">${escapeHtml(pl.name)}</div>
            <div class="shelf-item-meta">${pl.track_count || 0} songs</div>
          </div>
        </div>
      `;
    }).join('');

    shelfPlaylistList.innerHTML = allItem + playlistItems;
  }

  function renderPlaylistsGrid() {
    if (!playlistsGrid) return;
    if (playlists.length === 0) {
      playlistsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--sp-text-sub);">
          <div style="font-size: 3rem; margin-bottom: 12px;">📚</div>
          <h3>No playlists created yet</h3>
          <p>Create playlists to organize your favorite songs.</p>
        </div>
      `;
      return;
    }

    playlistsGrid.innerHTML = playlists.map(pl => {
      return `
        <div class="spotify-playlist-card" onclick="Music.selectPlaylist(${pl.id})">
          <div class="pl-card-cover">📚</div>
          <div class="pl-card-title">${escapeHtml(pl.name)}</div>
          <div class="pl-card-meta">${pl.track_count || 0} songs</div>
        </div>
      `;
    }).join('');
  }

  function renderTracks() {
    if (!musicListEl) return;
    if (tracks.length === 0) {
      musicListEl.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 48px; color: var(--sp-text-sub);">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🎵</div>
            <h3>No songs in this view</h3>
            <p>${activePlaylist ? 'Add tracks from All Tracks to this playlist.' : 'Upload your music files to get started.'}</p>
          </td>
        </tr>
      `;
      return;
    }

    musicListEl.innerHTML = tracks.map((track, idx) => {
      const isPlaying = currentTrackIndex === idx && !audioElement.paused;
      const isCurrent = currentTrackIndex === idx;

      return `
        <tr class="spotify-track-row ${isCurrent ? 'playing' : ''}" onclick="Music.playTrackIndex(${idx})">
          <td class="col-num">
            ${isPlaying ? '🔊' : (idx + 1)}
          </td>
          <td class="col-title">
            <div style="font-weight: 600; color: ${isCurrent ? 'var(--sp-green)' : '#fff'};">${escapeHtml(track.original_name)}</div>
            <div style="font-size: 0.75rem; color: var(--sp-text-sub);">${(track.file_size / (1024 * 1024)).toFixed(1)} MB • Audio</div>
          </td>
          <td class="col-duration">
            ${track.duration ? formatDuration(track.duration) : '--:--'}
          </td>
          <td class="col-actions">
            ${activePlaylist ? `
              <button class="spotify-del-btn" title="Remove from playlist" onclick="event.stopPropagation(); Music.removeFromPlaylist(${activePlaylist.id}, ${track.id})">✕</button>
            ` : `
              <button class="spotify-add-btn" title="Add to playlist" onclick="event.stopPropagation(); Music.openAddToPlaylistModal(${track.id})">➕</button>
            `}
            <a href="/api/media/${track.id}/download" class="action-btn" download onclick="event.stopPropagation();" title="Download">⬇</a>
            <button class="spotify-del-btn" title="Delete file" onclick="event.stopPropagation(); Music.deleteTrack(${track.id})">🗑</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Playback Logic ---
  function playTrackIndex(idx) {
    if (idx < 0 || idx >= tracks.length) return;

    if (currentTrackIndex === idx) {
      if (audioElement.paused) {
        audioElement.play().catch(() => {});
      } else {
        audioElement.pause();
      }
      renderTracks();
      updateHeroPlayBtn();
      return;
    }

    currentTrackIndex = idx;
    const track = tracks[currentTrackIndex];
    if (playerTitle) playerTitle.textContent = track.original_name;
    if (playerArtist) playerArtist.textContent = activePlaylist ? activePlaylist.name : 'PocketHub Music';
    audioElement.src = `/api/media/${track.id}/stream`;
    audioElement.play().catch(() => {});

    renderTracks();
    updateHeroPlayBtn();
  }

  function playNext() {
    if (tracks.length === 0) return;
    if (isShuffled && tracks.length > 1) {
      let randIdx;
      do {
        randIdx = Math.floor(Math.random() * tracks.length);
      } while (randIdx === currentTrackIndex);
      playTrackIndex(randIdx);
      return;
    }
    const nextIdx = (currentTrackIndex + 1) % tracks.length;
    playTrackIndex(nextIdx);
  }

  function playPrev() {
    if (tracks.length === 0) return;
    if (audioElement.currentTime > 3) {
      audioElement.currentTime = 0;
      return;
    }
    const prevIdx = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playTrackIndex(prevIdx);
  }

  function toggleShuffle() {
    isShuffled = !isShuffled;
    if (shuffleBtn) {
      shuffleBtn.classList.toggle('active', isShuffled);
    }
    showToast(isShuffled ? '🔀 Shuffle ON' : 'Shuffle OFF');
  }

  function cycleRepeat() {
    if (repeatMode === 'off') {
      repeatMode = 'all';
      if (repeatBtn) {
        repeatBtn.textContent = '🔁';
        repeatBtn.classList.add('active');
      }
      showToast('🔁 Repeat ALL');
    } else if (repeatMode === 'all') {
      repeatMode = 'one';
      if (repeatBtn) {
        repeatBtn.textContent = '🔂';
        repeatBtn.classList.add('active');
      }
      showToast('🔂 Repeat ONE');
    } else {
      repeatMode = 'off';
      if (repeatBtn) {
        repeatBtn.textContent = '🔁';
        repeatBtn.classList.remove('active');
      }
      showToast('Repeat OFF');
    }
  }

  // --- Playlist Actions ---
  function openCreatePlaylistModal() {
    if (modalCreatePlaylist) {
      modalCreatePlaylist.style.display = 'flex';
      if (newPlaylistNameInput) {
        newPlaylistNameInput.value = '';
        newPlaylistNameInput.focus();
      }
    }
  }

  function closeCreatePlaylistModal() {
    if (modalCreatePlaylist) modalCreatePlaylist.style.display = 'none';
  }

  async function handleCreatePlaylist() {
    const name = newPlaylistNameInput?.value?.trim();
    if (!name) {
      alert('Please enter a playlist name');
      return;
    }

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error('Failed to create playlist');
      const newPl = await res.json();
      closeCreatePlaylistModal();
      showToast(`Playlist "${name}" created!`);
      await loadPlaylists();
      selectPlaylist(newPl.id);
    } catch (err) {
      alert('Error creating playlist: ' + err.message);
    }
  }

  async function handleDeleteActivePlaylist() {
    if (!activePlaylist) return;
    if (!confirm(`Are you sure you want to delete playlist "${activePlaylist.name}"? (Audio files will remain in your library)`)) return;

    try {
      const res = await fetch(`/api/playlists/${activePlaylist.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete playlist');
      showToast('Playlist deleted');
      await loadPlaylists();
      selectPlaylist(null);
    } catch (err) {
      alert('Error deleting playlist: ' + err.message);
    }
  }

  function openAddToPlaylistModal(trackId) {
    pendingTrackIdForPlaylist = trackId;
    if (!modalAddToPlaylist || !addToPlaylistOptions) return;

    if (playlists.length === 0) {
      addToPlaylistOptions.innerHTML = `
        <p style="color: var(--sp-text-sub); text-align: center; padding: 16px;">
          No playlists available. Create a playlist first!
        </p>
      `;
    } else {
      addToPlaylistOptions.innerHTML = playlists.map(pl => `
        <div class="picker-item" onclick="Music.addTrackToPlaylist(${pl.id}, ${trackId})">
          📚 ${escapeHtml(pl.name)} (${pl.track_count || 0} tracks)
        </div>
      `).join('');
    }

    modalAddToPlaylist.style.display = 'flex';
  }

  function closeAddToPlaylistModal() {
    if (modalAddToPlaylist) modalAddToPlaylist.style.display = 'none';
    pendingTrackIdForPlaylist = null;
  }

  async function addTrackToPlaylist(playlistId, trackId) {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: trackId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add track');
      }
      closeAddToPlaylistModal();
      showToast('Added to playlist! 🎵');
      await loadPlaylists();
    } catch (err) {
      alert(err.message);
    }
  }

  async function removeFromPlaylist(playlistId, trackId) {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove track');
      showToast('Track removed from playlist');
      await loadPlaylists();
      selectPlaylist(playlistId);
    } catch (err) {
      alert('Error removing track: ' + err.message);
    }
  }

  async function deleteTrack(id) {
    if (!confirm('Are you sure you want to permanently delete this audio file?')) return;
    try {
      const res = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete track');
      showToast('Track deleted');
      await loadAllTracks();
      await loadPlaylists();
      if (activePlaylist) {
        selectPlaylist(activePlaylist.id);
      }
      Storage.updateStorage();
    } catch (err) {
      alert('Error deleting audio file: ' + err.message);
    }
  }

  // --- Upload Handling ---
  async function uploadFiles(files) {
    if (!files || files.length === 0) return;

    if (progressContainer) progressContainer.style.display = 'block';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.textContent = `Uploading audio (${i + 1}/${files.length}): ${file.name}...`;

      const formData = new FormData();
      formData.append('file', file);

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
    showToast('All audio uploads completed! 🎧');
    await loadAllTracks();
    await loadPlaylists();
    Storage.updateStorage();
    switchSubView('all');
  }

  // --- Event Setup ---
  function setupPlayerEvents() {
    playBtn?.addEventListener('click', () => {
      if (currentTrackIndex === -1 && tracks.length > 0) {
        playTrackIndex(0);
      } else if (!audioElement.paused) {
        audioElement.pause();
      } else {
        audioElement.play().catch(() => {});
      }
    });

    heroPlayBtn?.addEventListener('click', () => {
      if (tracks.length === 0) return;
      if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
        if (audioElement.paused) {
          audioElement.play().catch(() => {});
        } else {
          audioElement.pause();
        }
      } else {
        playTrackIndex(0);
      }
    });

    prevBtn?.addEventListener('click', playPrev);
    nextBtn?.addEventListener('click', playNext);
    shuffleBtn?.addEventListener('click', toggleShuffle);
    repeatBtn?.addEventListener('click', cycleRepeat);

    muteBtn?.addEventListener('click', () => {
      if (audioElement.volume > 0) {
        previousVolume = audioElement.volume;
        audioElement.volume = 0;
        if (volumeSlider) volumeSlider.value = 0;
        if (muteBtn) muteBtn.textContent = '🔇';
      } else {
        audioElement.volume = previousVolume || 0.8;
        if (volumeSlider) volumeSlider.value = audioElement.volume;
        if (muteBtn) muteBtn.textContent = '🔊';
      }
    });

    audioElement.addEventListener('play', () => {
      if (playBtn) playBtn.textContent = '⏸';
      updateHeroPlayBtn();
      renderTracks();
    });

    audioElement.addEventListener('pause', () => {
      if (playBtn) playBtn.textContent = '▶';
      updateHeroPlayBtn();
      renderTracks();
    });

    audioElement.addEventListener('ended', () => {
      if (repeatMode === 'one') {
        audioElement.currentTime = 0;
        audioElement.play().catch(() => {});
      } else if (repeatMode === 'all' || isShuffled || currentTrackIndex + 1 < tracks.length) {
        playNext();
      } else {
        // Stop playback
        if (playBtn) playBtn.textContent = '▶';
        updateHeroPlayBtn();
      }
    });

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
      if (muteBtn) muteBtn.textContent = audioElement.volume === 0 ? '🔇' : '🔊';
    });
  }

  function init() {
    // Subnav pills
    pillAll?.addEventListener('click', () => switchSubView('all'));
    pillPlaylists?.addEventListener('click', () => switchSubView('playlists'));
    pillUpload?.addEventListener('click', () => switchSubView('upload'));

    // Modals
    createPlaylistBtn?.addEventListener('click', openCreatePlaylistModal);
    newPlBtn?.addEventListener('click', openCreatePlaylistModal);
    btnCancelPlaylist?.addEventListener('click', closeCreatePlaylistModal);
    btnConfirmPlaylist?.addEventListener('click', handleCreatePlaylist);
    newPlaylistNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCreatePlaylist();
      if (e.key === 'Escape') closeCreatePlaylistModal();
    });

    btnCloseAddPlaylist?.addEventListener('click', closeAddToPlaylistModal);
    deletePlaylistBtn?.addEventListener('click', handleDeleteActivePlaylist);

    // Upload
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
        const query = e.target.value.toLowerCase().trim();
        if (activePlaylist) {
          tracks = (activePlaylist.tracks || []).filter(t => t.original_name.toLowerCase().includes(query));
          renderTracks();
        } else {
          loadAllTracks(query);
        }
      }, 200);
    });

    setupPlayerEvents();
    loadAllTracks();
    loadPlaylists();
  }

  function pause() {
    if (!audioElement.paused) {
      audioElement.pause();
    }
  }

  return {
    init,
    loadAllTracks,
    loadPlaylists,
    selectPlaylist,
    playTrackIndex,
    playNext,
    playPrev,
    deleteTrack,
    openAddToPlaylistModal,
    addTrackToPlaylist,
    removeFromPlaylist,
    pause
  };
})();
