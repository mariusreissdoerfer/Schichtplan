import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Löschen', danger = true }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className={`flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
