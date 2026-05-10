import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import TextInput from './components/TextInput';
import ResultDisplay from './components/ResultDisplay';
import ActionButtons from './components/ActionButtons';
import Header from './components/Header';
import { processText, summarizeText, extractKeyPoints, generateFlashcards, generateQA } from './utils/api';
import './index.css';

function App() {
  const [currentText, setCurrentText] = useState('');
  const [results, setResults] = useState({
    summary: null,
    keyPoints: null,
    flashcards: null,
    qa: null
  });
  const [loading, setLoading] = useState({
    summary: false,
    keyPoints: false,
    flashcards: false,
    qa: false
  });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('input');

  const handleTextProcessed = (text) => {
    setCurrentText(text);
    setResults({
      summary: null,
      keyPoints: null,
      flashcards: null,
      qa: null
    });
    setError('');
    setActiveTab('results');
  };

  const handleSummarize = async (type = 'short') => {
    if (!currentText) {
      setError('Please upload a file or enter text first');
      return;
    }

    setLoading(prev => ({ ...prev, summary: true }));
    setError('');
    
    try {
      const result = await summarizeText(currentText, type);
      setResults(prev => ({ ...prev, summary: result.summary }));
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate summary. Please try again.';
      setError(`Summary failed: ${errorMessage}`);
      console.error('Summary error:', err);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  };

  const handleKeyPoints = async () => {
    if (!currentText) {
      setError('Please upload a file or enter text first');
      return;
    }

    setLoading(prev => ({ ...prev, keyPoints: true }));
    setError('');
    
    try {
      const result = await extractKeyPoints(currentText);
      setResults(prev => ({ ...prev, keyPoints: result.keyPoints }));
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to extract key points. Please try again.';
      setError(`Key points failed: ${errorMessage}`);
      console.error('Key points error:', err);
    } finally {
      setLoading(prev => ({ ...prev, keyPoints: false }));
    }
  };

  const handleFlashcards = async () => {
    if (!currentText) {
      setError('Please upload a file or enter text first');
      return;
    }

    setLoading(prev => ({ ...prev, flashcards: true }));
    setError('');
    
    try {
      const result = await generateFlashcards(currentText);
      setResults(prev => ({ ...prev, flashcards: result.flashcards }));
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate flashcards. Please try again.';
      setError(`Flashcards failed: ${errorMessage}`);
      console.error('Flashcards error:', err);
    } finally {
      setLoading(prev => ({ ...prev, flashcards: false }));
    }
  };

  const handleQA = async () => {
    if (!currentText) {
      setError('Please upload a file or enter text first');
      return;
    }

    setLoading(prev => ({ ...prev, qa: true }));
    setError('');
    
    try {
      const result = await generateQA(currentText);
      setResults(prev => ({ ...prev, qa: result.qa }));
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to generate Q&A. Please try again.';
      setError(`Q&A failed: ${errorMessage}`);
      console.error('Q&A error:', err);
    } finally {
      setLoading(prev => ({ ...prev, qa: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white rounded-lg p-1 shadow-sm max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-200 ${
              activeTab === 'input'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Input
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-200 ${
              activeTab === 'results'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={!currentText}
          >
            Results
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Input Tab */}
        {activeTab === 'input' && (
          <div className="space-y-8 animate-fade-in">
            <FileUpload onTextProcessed={handleTextProcessed} />
            <div className="text-center text-gray-500 text-lg font-medium">or</div>
            <TextInput onTextProcessed={handleTextProcessed} />
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && currentText && (
          <div className="space-y-6 animate-fade-in">
            <ActionButtons
              onSummarize={handleSummarize}
              onKeyPoints={handleKeyPoints}
              onFlashcards={handleFlashcards}
              onQA={handleQA}
              loading={loading}
            />
            
            <ResultDisplay results={results} loading={loading} />
          </div>
        )}

        {/* Welcome State */}
        {!currentText && activeTab === 'results' && (
          <div className="text-center py-16">
            <div className="text-gray-400 text-lg mb-4">No content to process</div>
            <button
              onClick={() => setActiveTab('input')}
              className="btn-primary"
            >
              Upload File or Enter Text
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
