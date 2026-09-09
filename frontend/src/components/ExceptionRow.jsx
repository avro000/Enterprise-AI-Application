import React from 'react';

export const ExceptionRow = ({ exception, onClick }) => {
  return (
    <tr onClick={onClick} className="cursor-pointer hover:bg-gray-50 border-b border-gray-200">
      <td className="p-3 font-medium">{exception?.case_number}</td>
    </tr>
  );
};

export default ExceptionRow;
