const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const bodyParser = require('body-parser');
const path = require('path');
const { YoutubeTranscript } = require('youtube-transcript');
const ytdl = require('ytdl-core');
const mammoth = require('mammoth');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, PowerPoint, and video files are allowed'), false);
    }
  }
});

// AI Service Integration
class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
    // Maximum tokens for context (leaving room for prompt + output)
    this.maxContextTokens = 12000;
    // Approximate characters per token (conservative estimate)
    this.charsPerToken = 4;
    this.maxTextLength = this.maxContextTokens * this.charsPerToken; // ~48000 chars
  }

  // Truncate text to fit within token limits
  truncateText(text) {
    if (!text || text.length <= this.maxTextLength) {
      return text;
    }

    console.log(`⚠️ Text too long (${text.length} chars), truncating to ${this.maxTextLength} chars`);
    
    // Try to truncate at a sentence boundary
    const truncated = text.substring(0, this.maxTextLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > this.maxTextLength * 0.8) {
      // If we can find a sentence end in the last 20%, use that
      return truncated.substring(0, lastSentenceEnd + 1) + '\n\n[Content truncated due to length...]';
    }
    
    return truncated + '\n\n[Content truncated due to length...]';
  }

  async makeRequest(prompt, text) {
    try {
      const axios = require('axios');
      
      // Truncate text if too long
      const truncatedText = this.truncateText(text);
      
      const response = await axios.post(this.apiUrl, {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing and summarizing educational content. Provide clear, concise, and accurate responses.'
          },
          {
            role: 'user',
            content: `${prompt}\n\nText to analyze:\n${truncatedText}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('AI Service Error:', error.response?.data || error.message);
      
      // Handle specific OpenAI API errors
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;
        if (apiError.code === 'context_length_exceeded' || apiError.message?.includes('maximum context length')) {
          throw new Error('Text is too long for processing. Please try with a shorter video or document.');
        } else if (apiError.code === 'insufficient_quota') {
          throw new Error('OpenAI API quota exceeded. Please check your API key billing or add credits to your account.');
        } else if (apiError.code === 'invalid_api_key') {
          throw new Error('Invalid OpenAI API key. Please check your API key configuration.');
        } else if (apiError.code === 'rate_limit_exceeded') {
          throw new Error('OpenAI API rate limit exceeded. Please try again in a few moments.');
        } else {
          throw new Error(`OpenAI API error: ${apiError.message || 'Unknown error'}`);
        }
      }
      
      throw new Error('Failed to process request with AI service');
    }
  }

  async summarizeText(text, type = 'short') {
    const prompt = type === 'short' 
      ? 'Provide a comprehensive summary of the following text in 200-300 words. Include all main concepts, key findings, and important details. Use clear, well-structured paragraphs with proper formatting.'
      : 'Provide an extensive detailed summary of the following text in 500-700 words. Include all main arguments, supporting evidence, detailed explanations, and comprehensive analysis. Use proper headings and structured format.';
    
    return await this.makeRequest(prompt, text);
  }

  async extractKeyPoints(text) {
    const prompt = 'Extract all important key points from the following text and present them as a detailed bulleted list. Each point should be comprehensive and include relevant details. Focus on main concepts, arguments, findings, definitions, examples, and important relationships. Use proper bullet point formatting with sub-points where needed.';
    
    return await this.makeRequest(prompt, text);
  }

  async generateFlashcards(text) {
    const prompt = 'Generate comprehensive flashcards from the following text. Format each flashcard exactly as "Question: [question]\nAnswer: [answer]". Separate different flashcards with "\n\n". Create 10-15 high-quality questions that test understanding of key concepts, definitions, important details, examples, and applications. Ensure each answer is detailed and informative.';
    
    return await this.makeRequest(prompt, text);
  }

  async generateQA(text) {
    const prompt = 'Generate comprehensive exam-style questions with detailed answers based on the following text. Create exactly 6 questions: 2 multiple choice, 2 short answer, and 2 essay questions. Format each as:\n\n**Question [number]: [Type]**\n[Question text]\n\n**Answer:**\n[Detailed answer]\n\nEnsure proper formatting with clear question numbers, types, and complete answers. Do not include "Answer not found" or incomplete responses.';
    
    return await this.makeRequest(prompt, text);
  }
}

const aiService = new AIService();

// Utility function to chunk large text
function chunkText(text, maxChunkSize = 3000) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/);
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length < maxChunkSize) {
      currentChunk += sentence + '. ';
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence + '. ';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  console.log('Health check request received');
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Upload and process PDF
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('PDF upload request received');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, 'Type:', req.file.mimetype, 'Size:', req.file.size);

    const pdfData = await pdfParse(req.file.buffer);
    console.log('PDF parsed successfully. Pages:', pdfData.numpages, 'Text length:', pdfData.text?.length);
    
    const text = pdfData.text;

    res.json({
      success: true,
      text: text,
      pageCount: pdfData.numpages,
      info: pdfData.info
    });
  } catch (error) {
    console.error('PDF processing error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to process PDF file: ' + error.message });
  }
});

// Process text input
app.post('/api/process-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided' });
    }

    res.json({
      success: true,
      text: text.trim()
    });
  } catch (error) {
    console.error('Text processing error:', error);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

// Helper function to extract YouTube video ID from various URL formats
function extractVideoId(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Clean the URL - remove query params and hash
  // Handle cases like:
  // - https://youtu.be/VIDEO_ID?si=xxx
  // - https://www.youtube.com/watch?v=VIDEO_ID&si=xxx
  // - https://youtube.com/shorts/VIDEO_ID?feature=share

  try {
    // Remove any trailing query params and hash
    let cleanUrl = url.split('?')[0].split('#')[0];

    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/$/, '');

    console.log('Original URL:', url);
    console.log('Cleaned URL:', cleanUrl);

    // Pattern 1: youtu.be/VIDEO_ID (short URLs)
    const shortUrlMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})$/);
    if (shortUrlMatch) {
      console.log('✅ Matched youtu.be short URL pattern');
      return shortUrlMatch[1];
    }

    // Pattern 2: youtube.com/watch?v=VIDEO_ID (standard)
    const standardMatch = cleanUrl.match(/youtube\.com\/watch$/);
    if (standardMatch) {
      // Extract v parameter from original URL
      const vMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (vMatch) {
        console.log('✅ Matched youtube.com/watch?v= pattern');
        return vMatch[1];
      }
    }

    // Pattern 3: youtube.com/live/VIDEO_ID
    const liveMatch = cleanUrl.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})$/);
    if (liveMatch) {
      console.log('✅ Matched youtube.com/live/ pattern');
      return liveMatch[1];
    }

    // Pattern 4: youtube.com/shorts/VIDEO_ID
    const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})$/);
    if (shortsMatch) {
      console.log('✅ Matched youtube.com/shorts/ pattern');
      return shortsMatch[1];
    }

    // Pattern 5: youtube.com/embed/VIDEO_ID
    const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})$/);
    if (embedMatch) {
      console.log('✅ Matched youtube.com/embed/ pattern');
      return embedMatch[1];
    }

    // Pattern 6: youtube.com/v/VIDEO_ID
    const vMatch = cleanUrl.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})$/);
    if (vMatch) {
      console.log('✅ Matched youtube.com/v/ pattern');
      return vMatch[1];
    }

    // Pattern 7: Just the video ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
      console.log('✅ Matched raw video ID pattern');
      return cleanUrl;
    }

    console.log('❌ No pattern matched for URL:', url);
    return null;
  } catch (error) {
    console.error('Error extracting video ID:', error);
    return null;
  }
}

// Helper function to check if video is live
async function checkIfLive(videoId) {
  try {
    const info = await ytdl.getInfo(videoId);
    return info.videoDetails.isLiveContent || info.videoDetails.liveBroadcastDetails?.isLiveNow;
  } catch (error) {
    console.log('Could not check live status:', error.message);
    return false;
  }
}

// YouTube video processing endpoint with comprehensive error handling
app.post('/api/youtube', async (req, res) => {
  // Add timeout to prevent hanging requests
  const timeout = setTimeout(() => {
    console.error('❌ YouTube API request timed out');
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Request timed out. Please try again.',
        errorType: 'TIMEOUT'
      });
    }
  }, 30000); // 30 second timeout

  try {
    console.log('========================================');
    console.log('🎯 API HIT: /api/youtube');
    console.log('Request body:', req.body);
    console.log('========================================');

    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      console.error('❌ No URL provided or invalid format');
      clearTimeout(timeout);
      return res.status(400).json({
        error: 'YouTube URL is required',
        errorType: 'MISSING_URL'
      });
    }

    console.log('📺 Processing URL:', url);

    // Extract video ID using improved method
    const videoId = extractVideoId(url);

    if (!videoId) {
      console.error('❌ Failed to extract video ID from URL:', url);
      clearTimeout(timeout);
      return res.status(400).json({
        error: 'Invalid YouTube URL format. Please use a standard YouTube video URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID)',
        errorType: 'INVALID_URL_FORMAT'
      });
    }

    console.log('✅ Video ID extracted:', videoId);

    // Get video info for fallback
    let videoInfo = null;
    let videoTitle = '';
    let videoDescription = '';
    
    try {
      console.log('📋 Fetching video info...');
      videoInfo = await ytdl.getInfo(videoId);
      videoTitle = videoInfo.videoDetails.title || 'Unknown Video';
      videoDescription = videoInfo.videoDetails.description || '';
      console.log('✅ Video info retrieved:', videoTitle);
    } catch (infoError) {
      console.log('⚠️ Could not fetch video info:', infoError.message);
    }

    // Check if video is live
    console.log('🔴 Checking if video is live...');
    let isLive = false;
    if (videoInfo) {
      isLive = videoInfo.videoDetails.isLiveContent || 
                videoInfo.videoDetails.liveBroadcastDetails?.isLiveNow;
    }

    if (isLive) {
      console.error('❌ Live video detected:', videoId);
      clearTimeout(timeout);
      return res.status(400).json({
        error: 'Live videos are not supported. Please wait for the live stream to end and try again.',
        errorType: 'LIVE_VIDEO_NOT_SUPPORTED',
        videoId: videoId
      });
    }

    // Try to get transcript with fallback
    console.log('📝 Fetching transcript for video:', videoId);
    let transcript = null;
    let transcriptSource = '';
    let lastError = null;

    // Method 1: Try default transcript
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptSource = 'default';
      console.log('✅ Default transcript found');
    } catch (defaultError) {
      console.log('⚠️ Default transcript not available:', defaultError.message);
      lastError = defaultError;

      // Method 2: Try English transcript
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
        transcriptSource = 'english';
        console.log('✅ English transcript found');
      } catch (englishError) {
        console.log('⚠️ English transcript not available:', englishError.message);
        lastError = englishError;

        // Method 3: Try auto-generated English
        try {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en-US' });
          transcriptSource = 'auto-generated';
          console.log('✅ Auto-generated English transcript found');
        } catch (autoGenError) {
          console.log('⚠️ Auto-generated not available:', autoGenError.message);
          lastError = autoGenError;

          // Method 4: Try any available language
          try {
            if (videoInfo && videoInfo.player_response?.captions?.captionTracks) {
              const availableLangs = videoInfo.player_response.captions.captionTracks;
              
              if (availableLangs.length > 0) {
                const firstLang = availableLangs[0].languageCode;
                console.log('🌍 Trying language:', firstLang);
                transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: firstLang });
                transcriptSource = `language-${firstLang}`;
                console.log('✅ Transcript found in language:', firstLang);
              } else {
                throw new Error('No caption tracks available');
              }
            } else {
              throw new Error('No caption tracks found');
            }
          } catch (anyLangError) {
            console.log('⚠️ All transcript attempts failed:', anyLangError.message);
            lastError = anyLangError;
          }
        }
      }
    }

    // Check if we got a valid transcript
    if (transcript && transcript.length > 0) {
      const transcriptText = transcript.map(item => item.text).join(' ').trim();
      
      if (transcriptText && transcriptText.length > 0) {
        console.log('========================================');
        console.log('✅ Transcript extracted successfully!');
        console.log('Video ID:', videoId);
        console.log('Title:', videoTitle);
        console.log('Source:', transcriptSource);
        console.log('Transcript length:', transcriptText.length, 'characters');
        console.log('Segments:', transcript.length);
        console.log('========================================');
        
        clearTimeout(timeout);
        return res.json({
          success: true,
          text: transcriptText,
          videoId: videoId,
          title: videoTitle,
          transcriptSource: transcriptSource,
          segments: transcript.length,
          url: `https://www.youtube.com/watch?v=${videoId}`
        });
      }
    }

    // If we reach here, transcript extraction failed
    console.log('⚠️ Transcript not available, trying fallback to video description...');
    
    // Fallback: Use video title and description
    let fallbackText = videoTitle;
    if (videoDescription && videoDescription.length > 0) {
      // Limit description to first 2000 characters to avoid too much text
      const shortDescription = videoDescription.substring(0, 2000);
      fallbackText += '\n\nDescription:\n' + shortDescription;
      if (videoDescription.length > 2000) {
        fallbackText += '...';
      }
    }

    if (fallbackText && fallbackText.length > 10) {
      console.log('✅ Using video title and description as fallback');
      console.log('Fallback text length:', fallbackText.length, 'characters');
      
      clearTimeout(timeout);
      return res.json({
        success: true,
        text: fallbackText,
        videoId: videoId,
        title: videoTitle,
        transcriptSource: 'video-description',
        segments: 0,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        warning: 'Transcript not available. Using video title and description instead.'
      });
    }

    // If even fallback fails
    console.error('❌ No content available for video:', videoId);
    clearTimeout(timeout);
    return res.status(400).json({
      error: 'Transcript not available for this video. The video may not have captions or description.',
      errorType: 'TRANSCRIPT_NOT_AVAILABLE',
      videoId: videoId,
      suggestion: 'Try a different video with captions enabled, or paste the video text manually.'
    });

  } catch (error) {
    console.error('========================================');
    console.error('❌ YouTube processing error:', error.message);
    console.error('Error stack:', error.stack);
    console.error('========================================');
    
    clearTimeout(timeout);
    
    // Always send a response
    if (!res.headersSent) {
      let errorType = 'UNKNOWN_ERROR';
      let userMessage = 'Failed to process YouTube video. Please try again.';

      if (error.message.includes('disabled') || error.message.includes('Transcripts are disabled')) {
        errorType = 'TRANSCRIPTS_DISABLED';
        userMessage = 'Transcripts are disabled for this video. Please try a different video or paste the text directly.';
      } else if (error.message.includes('not available') || error.message.includes('No transcript')) {
        errorType = 'TRANSCRIPTS_NOT_AVAILABLE';
        userMessage = 'No transcripts available for this video. The video may not have captions.';
      } else if (error.message.includes('Video unavailable') || error.message.includes('private')) {
        errorType = 'VIDEO_UNAVAILABLE';
        userMessage = 'This video is unavailable. It may be private, deleted, or region-restricted.';
      } else if (error.message.includes('rate limit') || error.message.includes('Too many requests')) {
        errorType = 'RATE_LIMITED';
        userMessage = 'Too many requests. Please wait a moment and try again.';
      }

      return res.status(500).json({
        error: userMessage,
        errorType: errorType,
        technicalDetails: error.message,
        suggestion: 'Try a different YouTube video with captions enabled, or paste the video text directly into the text input area.'
      });
    }
  }
});

// Document processing endpoint (Word, PowerPoint)
app.post('/api/document', upload.single('file'), async (req, res) => {
  try {
    console.log('Document upload request received');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    console.log('File received:', file.originalname, 'Type:', file.mimetype, 'Size:', file.size);
    
    let text = '';

    if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
      // Process Word document
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value;
        
        if (!text || text.trim().length === 0) {
          text = 'No text content found in Word document. The document may be empty or contain only images.';
        }
      } catch (wordError) {
        console.error('Word document parsing error:', wordError);
        text = 'Failed to extract text from Word document. The file may be corrupted or in an unsupported format.';
      }
    } else if (file.mimetype.includes('powerpoint') || file.mimetype.includes('presentation')) {
      // Process PowerPoint file using a simple text extraction approach
      try {
        // For PowerPoint files, we'll extract text using a basic approach
        // PowerPoint files are essentially ZIP files containing XML
        const JSZip = require('jszip');
        const zip = new JSZip();
        
        const pptxContent = await zip.loadAsync(file.buffer);
        let slideTexts = [];
        
        // Extract text from slide XML files
        const slideFiles = Object.keys(pptxContent.files).filter(filename => 
          filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')
        );
        
        for (const slideFile of slideFiles) {
          const slideXml = await pptxContent.file(slideFile).async('string');
          // Extract text content from XML (simplified approach)
          const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g);
          if (textMatches) {
            const slideText = textMatches.map(match => 
              match.replace(/<a:t>|<\/a:t>/g, '')
            ).join(' ');
            if (slideText.trim()) {
              const slideNumber = slideFile.match(/slide(\d+)\.xml/)[1];
              slideTexts.push(`Slide ${slideNumber}: ${slideText}`);
            }
          }
        }
        
        text = slideTexts.join('\n\n');
        
        if (!text || text.trim().length === 0) {
          text = 'No text content found in PowerPoint slides. The slides may only contain images, graphics, or use complex formatting.';
        }
      } catch (pptxError) {
        console.error('PowerPoint parsing error:', pptxError);
        text = 'PowerPoint text extraction failed. Please convert the PowerPoint to PDF or copy the text manually.';
      }
    } else {
      return res.status(400).json({ error: 'Unsupported document format' });
    }

    console.log('Document processed successfully. Text length:', text?.length);
    
    res.json({
      success: true,
      text: text,
      fileName: file.originalname,
      fileType: file.mimetype
    });
  } catch (error) {
    console.error('Document processing error:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to process document file: ' + error.message });
  }
});

// Summarize endpoint
app.post('/api/summarize', async (req, res) => {
  try {
    const { text, type } = req.body;
    
    console.log('========================================');
    console.log('📝 /api/summarize endpoint hit');
    console.log('Text length:', text ? text.length : 0);
    console.log('Type:', type || 'short');
    console.log('========================================');
    
    if (!text) {
      console.error('❌ No text provided');
      return res.status(400).json({ error: 'No text provided' });
    }

    if (text.length < 100) {
      console.error('❌ Text too short:', text.length, 'characters');
      return res.status(400).json({ error: 'Text is too short. Please provide at least 100 characters.' });
    }

    const summary = await aiService.summarizeText(text, type);
    
    console.log('✅ Summary generated successfully');
    
    res.json({
      success: true,
      summary: summary,
      type: type || 'short'
    });
  } catch (error) {
    console.error('========================================');
    console.error('❌ Summarization error:', error.message);
    console.error('Error details:', error.response?.data || error);
    console.error('========================================');
    res.status(500).json({ error: error.message || 'Failed to generate summary' });
  }
});

// Key points endpoint
app.post('/api/keypoints', async (req, res) => {
  try {
    const { text } = req.body;
    
    console.log('========================================');
    console.log('🔑 /api/keypoints endpoint hit');
    console.log('Text length:', text ? text.length : 0);
    console.log('========================================');
    
    if (!text) {
      console.error('❌ No text provided');
      return res.status(400).json({ error: 'No text provided' });
    }

    const keyPoints = await aiService.extractKeyPoints(text);
    
    console.log('✅ Key points extracted successfully');
    
    res.json({
      success: true,
      keyPoints: keyPoints
    });
  } catch (error) {
    console.error('========================================');
    console.error('❌ Key points extraction error:', error.message);
    console.error('Error details:', error.response?.data || error);
    console.error('========================================');
    res.status(500).json({ error: error.message || 'Failed to extract key points' });
  }
});

// Flashcards endpoint
app.post('/api/flashcards', async (req, res) => {
  try {
    const { text } = req.body;
    
    console.log('========================================');
    console.log('🎴 /api/flashcards endpoint hit');
    console.log('Text length:', text ? text.length : 0);
    console.log('========================================');
    
    if (!text) {
      console.error('❌ No text provided');
      return res.status(400).json({ error: 'No text provided' });
    }

    const flashcards = await aiService.generateFlashcards(text);
    
    console.log('✅ Flashcards generated successfully');
    
    res.json({
      success: true,
      flashcards: flashcards
    });
  } catch (error) {
    console.error('========================================');
    console.error('❌ Flashcard generation error:', error.message);
    console.error('Error details:', error.response?.data || error);
    console.error('========================================');
    res.status(500).json({ error: error.message || 'Failed to generate flashcards' });
  }
});

// Q&A endpoint
app.post('/api/qa', async (req, res) => {
  try {
    const { text } = req.body;
    
    console.log('========================================');
    console.log('❓ /api/qa endpoint hit');
    console.log('Text length:', text ? text.length : 0);
    console.log('========================================');
    
    if (!text) {
      console.error('❌ No text provided');
      return res.status(400).json({ error: 'No text provided' });
    }

    const qa = await aiService.generateQA(text);
    
    console.log('✅ Q&A generated successfully');
    
    res.json({
      success: true,
      qa: qa
    });
  } catch (error) {
    console.error('========================================');
    console.error('❌ Q&A generation error:', error.message);
    console.error('Error details:', error.response?.data || error);
    console.error('========================================');
    res.status(500).json({ error: error.message || 'Failed to generate Q&A' });
  }
});

// Root endpoint for basic check
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Book Summarizer API Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large. Maximum size is 50MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('WARNING: OPENAI_API_KEY not found in environment variables');
  }
});

module.exports = app;
