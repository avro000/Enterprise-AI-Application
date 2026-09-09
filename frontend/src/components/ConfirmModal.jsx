import React from 'react';

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-gray-600 text-sm mt-2">{message}</p>
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onCancel} className="px-3 py-1.5 border rounded text-sm">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm">Confirm</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
