import React from 'react';

export const SeverityBadge = ({ severity }) => {
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 capitalize">
      {severity}
    </span>
  );
};

export default SeverityBadge;
