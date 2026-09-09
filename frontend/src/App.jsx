import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-3xl font-bold text-gray-900">OpsPilot AI</h1>
                  <p className="mt-2 text-gray-600">Enterprise Operations Intelligence & Action Platform</p>
                  <div className="mt-4 inline-block rounded-full bg-blue-100 px-4 py-1 text-sm font-medium text-blue-800">
                    Phase 0 Scaffolding Ready
                  </div>
                </div>
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
