import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Book Summarizer</h1>
              <p className="text-sm text-gray-600">AI-powered text analysis and study tools</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-primary-600">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Powered by AI</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
