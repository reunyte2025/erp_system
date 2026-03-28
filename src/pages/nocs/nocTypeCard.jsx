import { Tag, Trash2, Edit2, Clock } from 'lucide-react';

// ── Date formatter ─────────────────────────────────────────────────────────
const fmtDate = (ds) => {
  if (!ds) return '—';
  try {
    return new Date(ds).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
};

const TYPE_COLORS = [
  { bg: 'bg-blue-50',    border: 'border-blue-200',   icon: 'bg-blue-500',    text: 'text-blue-700'    },
  { bg: 'bg-teal-50',    border: 'border-teal-200',   icon: 'bg-teal-500',    text: 'text-teal-700'    },
  { bg: 'bg-purple-50',  border: 'border-purple-200', icon: 'bg-purple-500',  text: 'text-purple-700'  },
  { bg: 'bg-orange-50',  border: 'border-orange-200', icon: 'bg-orange-500',  text: 'text-orange-700'  },
  { bg: 'bg-emerald-50', border: 'border-emerald-200',icon: 'bg-emerald-500', text: 'text-emerald-700' },
  { bg: 'bg-rose-50',    border: 'border-rose-200',   icon: 'bg-rose-500',    text: 'text-rose-700'    },
];

const NocTypeCard = ({ project: type, actionHandlers }) => {
  const c = TYPE_COLORS[(type?.id || 0) % TYPE_COLORS.length];

  return (
    /**
     * h-full  → fills the CardGrid cell (which is stretch-height by default)
     * flex flex-col → lets us push the footer to the bottom with mt-auto
     */
    <div
      className={`
        group relative h-full flex flex-col
        ${c.bg} border ${c.border}
        rounded-2xl p-5
        hover:shadow-md hover:-translate-y-0.5
        transition-all duration-200
      `}
    >
      {/* ── Action buttons (top-right, appear on hover) ── */}
      <div
        className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => actionHandlers?.onEditNocType?.(type)}
          className="w-7 h-7 rounded-lg bg-white/80 backdrop-blur-sm text-blue-600 hover:bg-blue-100 border border-blue-200 flex items-center justify-center transition-colors shadow-sm"
          title="Edit"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        {actionHandlers?.onDeleteNocType && (
          <button
            onClick={() => actionHandlers?.onDeleteNocType?.(type)}
            className="w-7 h-7 rounded-lg bg-white/80 backdrop-blur-sm text-red-500 hover:bg-red-100 border border-red-200 flex items-center justify-center transition-colors shadow-sm"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Icon ── */}
      <div className={`w-10 h-10 ${c.icon} rounded-xl flex items-center justify-center mb-3 shadow-sm flex-shrink-0`}>
        <Tag className="w-5 h-5 text-white" />
      </div>

      {/* ── Name ── */}
      <h3 className={`font-bold text-sm ${c.text} leading-snug pr-16 flex-shrink-0`}>
        {type?.name || 'Unnamed Type'}
      </h3>

      {/* ── Description — always 2 lines, truncated with … ── */}
      <p
        className="text-xs text-gray-500 leading-relaxed mt-1.5 flex-shrink-0"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '2.5rem',   /* reserves space even when description is empty */
        }}
      >
        {type?.description || <span className="italic text-gray-300">No description</span>}
      </p>

      {/* ── Spacer — pushes footer to bottom ── */}
      <div className="flex-1" />

      {/* ── Footer — always at the bottom of every card ── */}
      {(type?.processing_time || type?.created_at) && (
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-black/5 flex-shrink-0">
          {type?.processing_time ? (
            <>
              <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 font-medium">{type.processing_time}</span>
            </>
          ) : (
            <span className="text-xs text-gray-400">Added {fmtDate(type.created_at)}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default NocTypeCard;