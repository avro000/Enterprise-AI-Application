import React from 'react';

export const SourceCard = ({ source }) => {
  return (
    <div className="text-xs bg-gray-50 border border-gray-200 rounded p-2 my-1">
      <span className="font-semibold">{source?.type || 'Source'}:</span> {source?.name || source?.table || ''}
    </div>
  );
};

export default SourceCard;
