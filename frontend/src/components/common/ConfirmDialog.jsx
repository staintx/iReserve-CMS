export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-body">
          <p>{message}</p>
          <div className="modal-actions">
            <button className="btn" onClick={onConfirm}>Confirm</button>
            <button className="btn-outline" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}