import React from 'react';

export const ChatMessage = ({ role, content }) => {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
      <div className={`max-w-xl p-3 rounded-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
        {content}
      </div>
    </div>
  );
};

export default ChatMessage;
