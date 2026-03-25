export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop">
      <div className="modal confirm-modal">
        <div className="confirm-header">
          <div className="confirm-icon">!</div>
          <div>
            <h3>Confirm Action</h3>
            <p>{message}</p>
          </div>
        </div>
        <div className="confirm-actions">
          <button className="btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}