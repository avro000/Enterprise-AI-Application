import React from 'react';

export const Pagination = ({ total = 0, limit = 20, offset = 0, onChange }) => {
  return (
    <div className="flex justify-between items-center py-3 text-sm text-gray-600">
      <span>Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
      <div className="space-x-2">
        <button disabled={offset === 0} className="px-2.5 py-1 border rounded disabled:opacity-50">Previous</button>
        <button disabled={offset + limit >= total} className="px-2.5 py-1 border rounded disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default Pagination;
