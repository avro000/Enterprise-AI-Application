import React from 'react';

export const IntentBadge = ({ intent }) => {
  return (
    <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800">
      {intent}
    </span>
  );
};

export default IntentBadge;
