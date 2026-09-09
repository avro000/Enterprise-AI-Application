import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold text-gray-900">404</h1>
      <p className="text-gray-600 mt-2">Page not found</p>
      <Link to="/" className="mt-4 text-primary hover:underline text-sm font-medium">Return to Dashboard</Link>
    </div>
  );
};

export default NotFoundPage;
