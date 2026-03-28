import { useState, useEffect, useRef } from 'react';
import { Trash2, Edit2, MoreVertical } from 'lucide-react';

const AuthorityActionsMenu = ({ row, handlers }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative flex justify-center" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150
          ${open ? 'text-orange-700 bg-orange-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-48 bg-white rounded-xl border border-gray-200 py-1.5 shadow-xl overflow-hidden"
          style={{ animation: 'nocDropIn 0.15s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setOpen(false); handlers?.onEditAuthority?.(row); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Edit2 className="w-4 h-4 flex-shrink-0" />
            Edit Authority
          </button>
          {handlers?.onDeleteAuthority && (
            <button
              onClick={() => { setOpen(false); handlers?.onDeleteAuthority?.(row); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              Delete Authority
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes nocDropIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AuthorityActionsMenu;