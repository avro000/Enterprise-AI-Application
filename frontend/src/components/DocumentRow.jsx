import React from 'react';

export const DocumentRow = ({ document, onDelete }) => {
  return (
    <tr className="border-b border-gray-200">
      <td className="p-3">{document?.filename}</td>
    </tr>
  );
};

export default DocumentRow;
