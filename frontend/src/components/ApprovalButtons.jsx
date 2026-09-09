import React from 'react';

export const ApprovalButtons = ({ onApprove, onReject }) => {
  return (
    <div className="flex space-x-2">
      <button onClick={onApprove} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
        Approve
      </button>
      <button onClick={onReject} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700">
        Reject
      </button>
    </div>
  );
};

export default ApprovalButtons;
