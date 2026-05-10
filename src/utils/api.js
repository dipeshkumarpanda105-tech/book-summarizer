import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://book-summarizer.onrender.com/api',
  timeout: 300000, // 5 minutes timeout for large text processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add any auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // You can add auth headers here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      const timeoutError = new Error('Request timeout. Please try again.');
      timeoutError.response = { data: { error: 'Request timeout' } };
      return Promise.reject(timeoutError);
    }
    
    if (error.response) {
      // Server responded with error status - preserve the full error
      const message = error.response.data?.error || 'Server error occurred';
      const enhancedError = new Error(message);
      enhancedError.response = error.response;
      return Promise.reject(enhancedError);
    } else if (error.request) {
      // Request was made but no response received
      const networkError = new Error('Network error. Please check your connection.');
      networkError.response = { data: { error: 'Network error' } };
      return Promise.reject(networkError);
    } else {
      // Something else happened
      const genericError = new Error(error.message || 'An unexpected error occurred');
      genericError.response = { data: { error: error.message } };
      return Promise.reject(genericError);
    }
  }
);

// File upload function for PDFs
export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Process text input
export const processText = async (text) => {
  return await api.post('/process-text', { text });
};

// Generate summary
export const summarizeText = async (text, type = 'short') => {
  return await api.post('/summarize', { text, type });
};

// Extract key points
export const extractKeyPoints = async (text) => {
  return await api.post('/keypoints', { text });
};

// Generate flashcards
export const generateFlashcards = async (text) => {
  return await api.post('/flashcards', { text });
};

// Generate Q&A
export const generateQA = async (text) => {
  return await api.post('/qa', { text });
};

// Process YouTube video
export const processYouTube = async (url) => {
  return await api.post('/youtube', { url });
};

// Process document files (Word, PowerPoint)
export const processDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return await api.post('/document', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Health check function
export const healthCheck = async () => {
  return await api.get('/health');
};

export default api;
