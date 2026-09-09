import React from 'react';

export const StatusBadge = ({ status }) => {
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 capitalize">
      {status}
    </span>
  );
};

export default StatusBadge;
