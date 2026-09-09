import React from 'react';

export const EmptyState = ({ title = 'No data available', message = 'Check back later.' }) => {
  return (
    <div className="text-center p-8 border border-dashed rounded-lg bg-gray-50">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{message}</p>
    </div>
  );
};

export default EmptyState;
