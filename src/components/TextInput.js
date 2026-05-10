import React, { useState } from 'react';
import { Send, FileText } from 'lucide-react';
import { processText } from '../utils/api';

const TextInput = ({ onTextProcessed }) => {
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    if (text.trim().length < 50) {
      setError('Please enter at least 50 characters for meaningful analysis');
      return;
    }

    setError('');
    setProcessing(true);

    try {
      const result = await processText(text.trim());
      onTextProcessed(result.text);
    } catch (err) {
      setError('Failed to process text. Please try again.');
      console.error('Text processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = () => {
    setText('');
    setError('');
  };

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Text Manually</h2>
        <p className="text-gray-600">Paste or type your text content for analysis</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter your book content, research paper, or any text you want to analyze..."
            className="input-field resize-none custom-scrollbar"
            rows={12}
            disabled={processing}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {text.length} characters
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={processing || !text.trim()}
            className="btn-primary flex-1 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <div className="loading-spinner mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Analyze Text
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={handleClear}
            disabled={processing || !text.trim()}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Tips for better results:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Enter at least 50-100 words for meaningful analysis</li>
              <li>Include complete sentences and paragraphs</li>
              <li>For best results, use well-structured content</li>
              <li>The AI works best with educational or informative text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextInput;
