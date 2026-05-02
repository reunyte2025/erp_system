/**
 * ============================================================================
 * NOTES COMPONENT  —  src/components/Notes.jsx
 * ============================================================================
 * Reusable Notes section. Drop into any detail page.
 *
 * Usage:
 *   import Notes from '../../components/Notes';
 *   import { NOTE_ENTITY } from '../../services/notes';
 *   <Notes entityType={NOTE_ENTITY.QUOTATION} entityId={quotation.id} />
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote, Plus, Trash2, Loader2, AlertCircle, User, Clock, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';
import { createNote, getAllNotes, deleteNote } from '../services/notes';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtNoteDate = (ds) => {
  if (!ds) return '';
  try {
    return new Date(ds).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return ''; }
};

// ── NoteItem ─────────────────────────────────────────────────────────────────

function NoteItem({ note, onDelete, deleting }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        background: hovered ? '#fafffe' : '#fafafa',
        border: `1px solid ${hovered ? '#b2f5ea' : '#f1f5f9'}`,
        borderRadius: 10,
        padding: '11px 14px',
        transition: 'border-color .15s, background .15s',
        boxShadow: hovered ? '0 2px 8px rgba(15,118,110,.07)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button — appears on hover */}
      <button
        title="Delete note"
        onClick={() => onDelete(note.id)}
        disabled={deleting === note.id}
        style={{
          position: 'absolute', top: 9, right: 10,
          background: hovered ? '#fef2f2' : 'none',
          border: 'none', cursor: 'pointer',
          color: hovered ? '#dc2626' : '#fca5a5',
          padding: 4, borderRadius: 6,
          display: 'flex', alignItems: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity .15s, color .15s, background .15s',
        }}
      >
        {deleting === note.id
          ? <Loader2 size={13} style={{ animation: 'notes_spin .6s linear infinite' }} />
          : <Trash2 size={13} />}
      </button>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'linear-gradient(135deg,#0f766e,#14b8a6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <User size={12} color="#fff" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>
          {note.created_by_name || 'User'}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto' }}>
          <Clock size={10} /> {fmtNoteDate(note.created_at)}
        </span>
      </div>

      {/* Note text */}
      <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'Outfit','Inter',sans-serif" }}>
        {note.note}
      </p>
    </div>
  );
}

// ── Pagination bar (matches Projects section design exactly) ─────────────────

const PAGE_SIZE = 4;

function NotesPaginationBar({ currentPage, totalPages, totalItems, onPrev, onNext, onViewAll }) {
  const from = totalItems === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to   = Math.min(currentPage * PAGE_SIZE, totalItems);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 16, paddingTop: 16, borderTop: '2px solid #e5e7eb',
    }}>
      {/* Item count */}
      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
        {totalItems === 0 ? 'No notes' : `${from}–${to} of ${totalItems}`}
      </span>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 8, border: 'none', background: 'none',
            fontSize: 12, fontWeight: 500, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            color: currentPage === 1 ? '#d1d5db' : '#4b5563',
            fontFamily: "'Outfit','Inter',sans-serif", transition: 'background .15s',
          }}
          onMouseEnter={e => { if (currentPage !== 1) e.currentTarget.style.background = '#f3f4f6'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <ChevronLeft size={14} /> Prev
        </button>

        {/* Page bubbles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <div
              key={page}
              style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
                background: page === currentPage ? '#0f766e' : '#f3f4f6',
                color:      page === currentPage ? '#fff'    : '#9ca3af',
                boxShadow:  page === currentPage ? '0 1px 4px rgba(15,118,110,.3)' : 'none',
                transition: 'all .15s',
              }}
            >
              {page}
            </div>
          ))}
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={currentPage === totalPages}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 12px', borderRadius: 8, border: 'none', background: 'none',
            fontSize: 12, fontWeight: 500,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            color: currentPage === totalPages ? '#d1d5db' : '#0f766e',
            fontFamily: "'Outfit','Inter',sans-serif", transition: 'background .15s',
          }}
          onMouseEnter={e => { if (currentPage !== totalPages) e.currentTarget.style.background = '#f0fdfa'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          Next <ChevronRight size={14} />
        </button>

        {/* View All */}
        <button
          onClick={onViewAll}
          title="View all notes"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8, border: '1px solid #99f6e4',
            background: '#f0fdfa', color: '#0f766e',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Outfit','Inter',sans-serif", transition: 'background .15s, border-color .15s',
            marginLeft: 4,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ccfbf1'; e.currentTarget.style.borderColor = '#14b8a6'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.borderColor = '#99f6e4'; }}
        >
          <Eye size={13} /> View All
        </button>
      </div>
    </div>
  );
}

// ── View All Notes Modal ──────────────────────────────────────────────────────

function ViewAllNotesModal({ notes, onClose, onDelete, deleting }) {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: "'Outfit','Inter',sans-serif",
      }}
    >
      <style>{`@keyframes notes_slide_in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 600,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,.22)',
          animation: 'notes_slide_in .2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div style={{
          flexShrink: 0,
          background: 'linear-gradient(135deg,#0f766e,#0d9488)',
          padding: '18px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <StickyNote size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>All Notes</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 13 }}>
              No notes yet
            </div>
          ) : (
            notes.map(note => (
              <NoteItem key={note.id} note={note} onDelete={onDelete} deleting={deleting} />
            ))
          )}
        </div>
      </div>
    </div>
  , document.body);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Notes({ entityType, entityId }) {
  const [notes,        setNotes]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchErr,     setFetchErr]     = useState('');
  const [composing,    setComposing]    = useState(false);
  const [noteText,     setNoteText]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [saveErr,      setSaveErr]      = useState('');
  const [deleting,     setDeleting]     = useState(null);
  const [currentPage,  setCurrentPage]  = useState(1);
  const [viewAllOpen,  setViewAllOpen]  = useState(false);
  const textareaRef = useRef(null);

  const fetchNotes = useCallback(async () => {
    if (!entityType || !entityId) return;
    setLoading(true); setFetchErr('');
    try {
      const res = await getAllNotes(entityType, entityId);
      setNotes(res?.data || []);
    } catch (e) {
      setFetchErr(e?.response?.data?.errors || e.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    if (composing) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [composing]);

  const handleSave = async () => {
    const text = noteText.trim();
    if (!text) return;
    setSaving(true); setSaveErr('');
    try {
      const res = await createNote(entityType, entityId, text);
      if (res?.status === 'success' && res?.data) {
        setNotes(prev => [res.data, ...prev]);
      } else {
        await fetchNotes();
      }
      setNoteText(''); setComposing(false);
      setCurrentPage(1); // jump to first page so new note is visible
    } catch (e) {
      setSaveErr(e?.response?.data?.errors || e.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setNoteText(''); setSaveErr(''); setComposing(false); };

  const handleDelete = async (noteId) => {
    setDeleting(noteId);
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (e) {
      console.error('Delete note failed:', e.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        @keyframes notes_spin { to { transform: rotate(360deg); } }
        @keyframes notes_slide_in { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16,
        overflow: 'hidden', fontFamily: "'Outfit','Inter',sans-serif", marginTop: 24,
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg,#f0fdfa 0%,#f8fafc 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg,#0f766e,#14b8a6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <StickyNote size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em' }}>
              Notes
            </span>
            {notes.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0f766e', background: '#ccfbf1', borderRadius: 20, padding: '2px 8px' }}>
                {notes.length}
              </span>
            )}
          </div>
          {!composing && (
            <button
              onClick={() => setComposing(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', background: '#0f766e', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Outfit','Inter',sans-serif",
              }}
            >
              <Plus size={13} /> Add Note
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Fetch error */}
          {fetchErr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>
              <AlertCircle size={14} /> {fetchErr}
            </div>
          )}

          {/* Compose area */}
          {composing && (
            <div style={{
              background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12,
              padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
              animation: 'notes_slide_in .18s ease',
            }}>
              <textarea
                ref={textareaRef}
                placeholder="Write your note here…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                style={{
                  width: '100%', minHeight: 80, padding: '9px 12px',
                  border: '1.5px solid #e2e8f0', borderRadius: 8,
                  fontSize: 13, fontFamily: "'Outfit','Inter',sans-serif", color: '#1e293b',
                  resize: 'vertical', outline: 'none', background: '#fff',
                  boxSizing: 'border-box', lineHeight: 1.6,
                }}
              />
              {saveErr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#dc2626' }}>
                  <AlertCircle size={13} /> {saveErr}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCancel} disabled={saving}
                  style={{ padding: '7px 16px', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: "'Outfit','Inter',sans-serif" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!noteText.trim() || saving}
                  style={{
                    padding: '7px 18px', border: 'none', borderRadius: 8,
                    fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: "'Outfit','Inter',sans-serif",
                    background: (!noteText.trim() || saving) ? '#99f6e4' : '#0f766e',
                    cursor: (!noteText.trim() || saving) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  {saving
                    ? <><Loader2 size={12} style={{ animation: 'notes_spin .6s linear infinite' }} /> Saving…</>
                    : 'Save Note'}
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 0', gap: 8, fontSize: 13, color: '#64748b' }}>
              <Loader2 size={18} color="#0f766e" style={{ animation: 'notes_spin .7s linear infinite' }} />
              Loading notes…
            </div>
          )}

          {/* Notes list with pagination */}
          {!loading && (() => {
            const totalPages = Math.max(1, Math.ceil(notes.length / PAGE_SIZE));
            const safePage   = Math.min(currentPage, totalPages);
            const paginated  = notes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

            return (
              <>
                {paginated.map(note => (
                  <NoteItem key={note.id} note={note} onDelete={handleDelete} deleting={deleting} />
                ))}

                {/* Empty state */}
                {!fetchErr && notes.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdfa', border: '1.5px dashed #99f6e4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <StickyNote size={20} color="#14b8a6" />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>No notes yet</span>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Click "Add Note" to add your first note</span>
                  </div>
                )}

                {/* Pagination bar — only when there are notes */}
                {notes.length > 0 && (
                  <NotesPaginationBar
                    currentPage={safePage}
                    totalPages={totalPages}
                    totalItems={notes.length}
                    onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
                    onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    onViewAll={() => setViewAllOpen(true)}
                  />
                )}
              </>
            );
          })()}

        </div>
      </div>

      {/* View All Notes Modal */}
      {viewAllOpen && (
        <ViewAllNotesModal
          notes={notes}
          onClose={() => setViewAllOpen(false)}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}
    </>
  );
}