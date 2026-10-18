// PocketHub - Notes Module
const Notes = (() => {
  let notes = [];
  let currentNoteId = null;

  const notesListEl = document.getElementById('notes-list');
  const searchInput = document.getElementById('notes-search');
  const modal = document.getElementById('note-modal');
  const titleInput = document.getElementById('note-title-input');
  const contentInput = document.getElementById('note-content-input');
  const tagsInput = document.getElementById('note-tags-input');
  const deleteBtn = document.getElementById('delete-note-btn');

  async function loadNotes(query = '') {
    try {
      const url = query ? `/api/notes?search=${encodeURIComponent(query)}` : '/api/notes';
      const res = await fetch(url);
      notes = await res.json();
      render();
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }

  function render() {
    if (!notesListEl) return;
    if (notes.length === 0) {
      notesListEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">📝</div>
          <h3>No notes found</h3>
          <p>Click "+ New Note" to capture your thoughts.</p>
        </div>
      `;
      return;
    }

    notesListEl.innerHTML = notes.map(note => {
      const tags = note.tags
        ? note.tags.split(',').filter(Boolean).map(t => `<span class="tag-badge">#${escapeHtml(t.trim())}</span>`).join('')
        : '';
      const dateStr = new Date(note.updated_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="note-card" data-id="${note.id}">
          <div class="note-card-title">${escapeHtml(note.title)}</div>
          <div class="note-card-snippet">${escapeHtml(note.content || 'Empty note')}</div>
          <div class="note-card-footer">
            <div class="note-tags">${tags}</div>
            <span class="note-date">${dateStr}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers
    notesListEl.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id, 10);
        openEditModal(id);
      });
    });
  }

  function openCreateModal() {
    currentNoteId = null;
    titleInput.value = '';
    contentInput.value = '';
    tagsInput.value = '';
    deleteBtn.style.display = 'none';
    modal.style.display = 'flex';
    titleInput.focus();
  }

  function openEditModal(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    currentNoteId = note.id;
    titleInput.value = note.title;
    contentInput.value = note.content;
    tagsInput.value = note.tags || '';
    deleteBtn.style.display = 'block';
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
    currentNoteId = null;
  }

  async function saveNote() {
    const title = titleInput.value.trim();
    const content = contentInput.value;
    const tags = tagsInput.value.trim();

    try {
      if (currentNoteId) {
        // Update
        const res = await fetch(`/api/notes/${currentNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, tags })
        });
        if (!res.ok) throw new Error('Failed to update note');
        showToast('Note updated');
      } else {
        // Create
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, tags })
        });
        if (!res.ok) throw new Error('Failed to create note');
        showToast('Note created');
      }

      closeModal();
      loadNotes(searchInput ? searchInput.value : '');
    } catch (err) {
      alert('Error saving note: ' + err.message);
    }
  }

  async function deleteNote() {
    if (!currentNoteId) return;
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const res = await fetch(`/api/notes/${currentNoteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      showToast('Note deleted');
      closeModal();
      loadNotes(searchInput ? searchInput.value : '');
    } catch (err) {
      alert('Error deleting note: ' + err.message);
    }
  }

  // Format helper for editor toolbar
  function applyFormatting(action) {
    const textarea = contentInput;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);

    let replacement = '';
    switch (action) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'h1':
        replacement = `\n# ${selected || 'Heading 1'}\n`;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Heading 2'}\n`;
        break;
      case 'bullet':
        replacement = `\n- ${selected || 'List item'}`;
        break;
      case 'checklist':
        replacement = `\n- [ ] ${selected || 'Task item'}`;
        break;
    }

    textarea.setRangeText(replacement, start, end, 'select');
    textarea.focus();
  }

  function init() {
    document.getElementById('new-note-btn')?.addEventListener('click', openCreateModal);
    document.getElementById('close-note-modal')?.addEventListener('click', closeModal);
    document.getElementById('cancel-note-btn')?.addEventListener('click', closeModal);
    document.getElementById('save-note-btn')?.addEventListener('click', saveNote);
    deleteBtn?.addEventListener('click', deleteNote);

    // Toolbar formatting buttons
    document.querySelectorAll('.editor-toolbar .tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyFormatting(btn.dataset.action);
      });
    });

    // Search with debounce
    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadNotes(e.target.value);
      }, 250);
    });

    loadNotes();
  }

  return { init, loadNotes };
})();
