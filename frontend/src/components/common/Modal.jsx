export default function Modal({ title, children, onClose, className = "" }) {
  return (
    <div className="modal-backdrop">
      <div className={`modal ${className}`.trim()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}