import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, Youtube, File } from 'lucide-react';
import { uploadPDF, processYouTube, processDocument } from '../utils/api';

const FileUpload = ({ onTextProcessed }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [activeTab, setActiveTab] = useState('file');

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFile = useCallback(async (file) => {
    console.log('handleFile called with file:', file.name, 'type:', file.type, 'size:', file.size);
    
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (!allowedTypes.includes(file.type)) {
      console.error('File type not allowed:', file.type);
      setError('Please upload a PDF, Word, or PowerPoint file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      console.error('File too large:', file.size, 'bytes');
      setError('File size must be less than 50MB');
      return;
    }

    console.log('Starting file processing...');
    setError('');
    setUploading(true);
    setUploadedFile(file.name);

    try {
      if (file.type === 'application/pdf') {
        console.log('Processing PDF file...');
        const result = await uploadPDF(file);
        console.log('PDF processing result:', result);
        onTextProcessed(result.text);
      } else {
        console.log('Processing document file...');
        const result = await processDocument(file);
        console.log('Document processing result:', result);
        onTextProcessed(result.text);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to process document. Please try again.');
      setUploadedFile(null);
    } finally {
      console.log('File processing completed');
      setUploading(false);
    }
  }, [onTextProcessed]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleYouTubeSubmit = async (e) => {
    e.preventDefault();

    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    // More permissive URL validation - accept various YouTube formats
    const validPatterns = [
      'youtube.com/watch',
      'youtu.be/',
      'youtube.com/live/',
      'youtube.com/shorts/',
      'youtube.com/embed/'
    ];

    const isValidUrl = validPatterns.some(pattern => youtubeUrl.includes(pattern));

    if (!isValidUrl) {
      setError('Please enter a valid YouTube URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID)');
      return;
    }

    setError('');
    setUploading(true);

    try {
      console.log('Processing YouTube URL:', youtubeUrl.trim());
      const result = await processYouTube(youtubeUrl.trim());

      if (result && result.text) {
        onTextProcessed(result.text);
        setUploadedFile(`YouTube: ${result.title || result.videoId || 'Video'}`);
        
        // Show warning if using video description fallback
        if (result.warning) {
          setError(result.warning);
          // Clear error after 5 seconds
          setTimeout(() => setError(''), 5000);
        }
        
        console.log('YouTube content extracted successfully:', result);
      } else {
        throw new Error('No transcript data received');
      }
    } catch (err) {
      // Use the backend error message if available
      const errorMessage = err.message || 'Failed to process YouTube video. Please try again.';
      setError(errorMessage);
      console.error('YouTube processing error:', err);
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setError('');
    setYoutubeUrl('');
  };

  return (
    <div className="card max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Content</h2>
        <p className="text-gray-600">Upload files, paste YouTube links, or enter text to analyze</p>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 ${
              activeTab === 'file'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <File className="w-4 h-4 inline mr-1" />
            Files
          </button>
          <button
            onClick={() => setActiveTab('youtube')}
            className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-all duration-200 ${
              activeTab === 'youtube'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Youtube className="w-4 h-4 inline mr-1" />
            YouTube
          </button>
        </div>
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <label htmlFor="file-upload" className="absolute inset-0 w-full h-full cursor-pointer flex items-center justify-center">
            <input
              type="file"
              id="file-upload"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => handleChange(e)}
              disabled={uploading}
            />
          </label>

          {!uploadedFile && !uploading && (
            <>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-600 mb-2">
                <span className="font-medium">Click to upload</span> or drag and drop
              </div>
              <div className="text-sm text-gray-500">PDF, Word, PowerPoint files (MAX. 50MB)</div>
            </>
          )}

          {uploading && (
            <div className="flex flex-col items-center">
              <div className="loading-spinner mb-4"></div>
              <div className="text-gray-600">Processing file...</div>
              <div className="text-sm text-gray-500 mt-2">Extracting text from document</div>
            </div>
          )}

          {uploadedFile && !uploading && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium text-gray-700">{uploadedFile}</span>
              </div>
              <button
                onClick={clearFile}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                <X className="w-4 h-4 inline" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* YouTube Tab */}
      {activeTab === 'youtube' && (
        <div className="border-2 border-dashed rounded-lg p-6">
          <div className="mb-4">
            <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL
            </label>
            <div className="relative">
              <input
                type="text"
                id="youtube-url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={uploading}
              />
            </div>
          </div>

          <button
            onClick={handleYouTubeSubmit}
            disabled={uploading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {uploading ? (
              <>
                <div className="loading-spinner inline-block w-4 h-4 mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4 mr-2" />
                Process YouTube Video
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <X className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center text-sm text-gray-500">
        <FileText className="w-4 h-4 mr-2" />
        Supported formats: PDF, Word, PowerPoint &#8226; Maximum file size: 50MB
      </div>
    </div>
  );
};

export default FileUpload;
