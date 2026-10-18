const { getDb } = require('../db');

function sanitizeTitle(title) {
  if (typeof title === 'string' && title.trim().length > 0) {
    return title.trim();
  }
  return 'Untitled Note';
}


function createNote({ title, content = '', tags = '' }) {
  const db = getDb();
  const safeTitle = sanitizeTitle(title, content);
  const safeContent = typeof content === 'string' ? content : '';
  const safeTags = typeof tags === 'string' ? tags.trim() : '';

  const result = db.run(
    `INSERT INTO notes (title, content, tags, created_at, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [safeTitle, safeContent, safeTags]
  );

  return getNoteById(result.lastInsertRowid);
}

function getNoteById(id) {
  const db = getDb();
  const note = db.get('SELECT * FROM notes WHERE id = ?', [id]);
  return note || null;
}

function listNotes({ search = '', tag = '' } = {}) {
  const db = getDb();
  let query = 'SELECT * FROM notes';
  const params = [];
  const conditions = [];

  if (search && search.trim().length > 0) {
    conditions.push('(title LIKE ? OR content LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (tag && tag.trim().length > 0) {
    conditions.push('tags LIKE ?');
    params.push(`%${tag.trim()}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY updated_at DESC, id DESC';
  return db.all(query, params);
}

function updateNote(id, { title, content, tags }) {
  const db = getDb();
  const existing = getNoteById(id);
  if (!existing) return null;

  const safeTitle = title !== undefined ? sanitizeTitle(title, content ?? existing.content) : existing.title;
  const safeContent = content !== undefined ? String(content) : existing.content;
  const safeTags = tags !== undefined ? String(tags).trim() : existing.tags;

  db.run(
    `UPDATE notes 
     SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [safeTitle, safeContent, safeTags, id]
  );

  return getNoteById(id);
}

function deleteNote(id) {
  const db = getDb();
  const result = db.run('DELETE FROM notes WHERE id = ?', [id]);
  return result.changes > 0;
}

module.exports = {
  createNote,
  getNoteById,
  listNotes,
  updateNote,
  deleteNote,
  sanitizeTitle
};
