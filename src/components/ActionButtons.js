import React from 'react';
import { FileText, List, BookOpen, HelpCircle } from 'lucide-react';

const ActionButtons = ({ onSummarize, onKeyPoints, onFlashcards, onQA, loading }) => {
  const buttons = [
    {
      id: 'summary',
      label: 'Generate Summary',
      icon: FileText,
      onClick: () => onSummarize('short'),
      loading: loading.summary,
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'Create a concise summary of the text'
    },
    {
      id: 'keypoints',
      label: 'Extract Key Points',
      icon: List,
      onClick: onKeyPoints,
      loading: loading.keyPoints,
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Get bullet points of main ideas'
    },
    {
      id: 'flashcards',
      label: 'Generate Flashcards',
      icon: BookOpen,
      onClick: onFlashcards,
      loading: loading.flashcards,
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'Create Q&A style flashcards'
    },
    {
      id: 'qa',
      label: 'Generate Q&A',
      icon: HelpCircle,
      onClick: onQA,
      loading: loading.qa,
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'Create exam-style questions'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <button
            key={button.id}
            onClick={button.onClick}
            disabled={button.loading}
            className={`card text-left p-4 transition-all duration-200 ${button.loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 cursor-pointer'}`}
          >
            <div className="flex items-center mb-3">
              <div className={`p-2 rounded-lg ${button.color.replace('hover:bg-', 'bg-').replace('600', '100')} mr-3`}>
                <Icon className={`w-5 h-5 ${button.color.replace('hover:bg-', 'text-').replace('600', '600')}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{button.label}</h3>
                <p className="text-xs text-gray-600 mt-1">{button.description}</p>
              </div>
            </div>
            
            {button.loading ? (
              <div className="flex items-center text-primary-600">
                <div className="loading-spinner mr-2"></div>
                <span className="text-sm">Processing...</span>
              </div>
            ) : (
              <div className="text-sm text-primary-600 font-medium">
                Click to generate →
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ActionButtons;
