import React from 'react';

export const ConfidenceBadge = ({ confidence }) => {
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 uppercase">
      {confidence}
    </span>
  );
};

export default ConfidenceBadge;
