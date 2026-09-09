import React from 'react';

export const FileUpload = ({ onUpload }) => {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <p className="text-sm text-gray-500">Drag and drop files here or click to browse</p>
    </div>
  );
};

export default FileUpload;
