# Automated Book Summarization Tool

An AI-powered web application that helps students and researchers quickly understand large texts like books, PDFs, and research papers by generating summaries and study materials.

## 🚀 Features

- **PDF Upload**: Upload PDF files for automatic text extraction
- **Manual Text Input**: Paste or type text directly into the application
- **AI-Powered Analysis**: Generate multiple types of study materials:
  - Short & Detailed Summaries
  - Key Points Extraction
  - Interactive Flashcards (Q&A format)
  - Exam-style Questions & Answers
- **Modern UI**: Clean, responsive interface with Tailwind CSS
- **Export Options**: Copy to clipboard or download results as text files
- **Real-time Processing**: Loading states and error handling

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **React Dropzone** - File upload functionality
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **OpenAI API** - AI processing (GPT-3.5-turbo)
- **PDF-Parse** - PDF text extraction
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **OpenAI API Key** (for AI functionality)

## 🚀 Quick Setup

### 1. Clone/Download the Project
```bash
# If using git (not applicable here, but for reference)
git clone <repository-url>
cd book-summarizer
```

### 2. Install Dependencies

#### Backend Setup
```bash
cd server
npm install
```

#### Frontend Setup
```bash
cd ../client
npm install
```

### 3. Environment Configuration

#### Backend Environment
1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Edit the `.env` file and add your OpenAI API key:
```env
# OpenAI API Configuration
OPENAI_API_KEY=your_actual_openai_api_key_here
OPENAI_API_URL=https://api.openai.com/v1/chat/completions

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

**Important**: Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)

#### Frontend Environment (Optional)
```bash
cd client
# Create .env file if you want to override API URL
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### 4. Run the Application

#### Start Backend Server
```bash
cd server
npm run dev
```
The backend will start on `http://localhost:5000`

#### Start Frontend (in a new terminal)
```bash
cd client
npm start
```
The frontend will start on `http://localhost:3000`

### 5. Access the Application
Open your browser and navigate to: **http://localhost:3000**

## 📁 Project Structure

```
book-summarizer/
├── client/                 # React frontend
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── ActionButtons.js
│   │   │   ├── FileUpload.js
│   │   │   ├── Header.js
│   │   │   ├── ResultDisplay.js
│   │   │   └── TextInput.js
│   │   ├── utils/          # Utility functions
│   │   │   └── api.js      # API calls
│   │   ├── App.js          # Main app component
│   │   ├── index.css       # Global styles
│   │   └── index.js        # Entry point
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
├── server/                 # Node.js backend
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   └── server.js           # Express server
└── README.md               # This file
```

## 🎯 How to Use

### 1. Upload Content
- **Option A**: Upload a PDF file (max 10MB)
- **Option B**: Paste or type text manually (min 50 characters)

### 2. Generate Study Materials
Choose from the following options:
- **Generate Summary**: Creates concise or detailed summaries
- **Extract Key Points**: Bullet points of main ideas
- **Generate Flashcards**: Q&A format for studying
- **Generate Q&A**: Exam-style questions with answers

### 3. Export Results
- Copy to clipboard
- Download as text file

## 🔧 API Endpoints

### Backend API Routes
- `POST /api/upload` - Upload and process PDF files
- `POST /api/process-text` - Process manual text input
- `POST /api/summarize` - Generate text summaries
- `POST /api/keypoints` - Extract key points
- `POST /api/flashcards` - Generate flashcards
- `POST /api/qa` - Generate Q&A pairs
- `GET /api/health` - Health check endpoint

## 🐛 Troubleshooting

### Common Issues

#### 1. OpenAI API Errors
**Problem**: "Failed to process request with AI service"
**Solution**: 
- Verify your OpenAI API key is correct
- Check if you have sufficient API credits
- Ensure the `.env` file is properly configured

#### 2. PDF Upload Issues
**Problem**: "Failed to process PDF file"
**Solution**:
- Ensure the file is a valid PDF
- Check file size is under 10MB
- Try re-uploading the file

#### 3. Connection Errors
**Problem**: "Network error" or "Connection refused"
**Solution**:
- Ensure both frontend and backend are running
- Check if ports 3000 and 5000 are available
- Verify firewall settings

#### 4. CORS Issues
**Problem**: Browser console shows CORS errors
**Solution**:
- Ensure `FRONTEND_URL` in `.env` matches your frontend URL
- Restart the backend server after changing environment variables

### Development Tips

#### Backend Development
```bash
cd server
npm run dev  # Uses nodemon for auto-restart
```

#### Frontend Development
```bash
cd client
npm start   # Hot reload enabled
```

## 🔒 Security Considerations

- API keys are stored in environment variables (not in code)
- File uploads are limited to PDF format and 10MB size
- Input validation on both frontend and backend
- CORS configured for specific frontend URL

## 🚀 Production Deployment

### Environment Setup
1. Set `NODE_ENV=production` in backend `.env`
2. Build the frontend: `npm run build` (in client directory)
3. Use a process manager like PM2 for the backend
4. Configure reverse proxy (nginx/Apache) if needed

### Environment Variables for Production
```env
NODE_ENV=production
OPENAI_API_KEY=your_production_api_key
PORT=5000
FRONTEND_URL=https://yourdomain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenAI for the powerful AI API
- React and Tailwind CSS communities
- PDF-Parse library for text extraction
- All contributors and users

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify your environment configuration
3. Ensure all dependencies are installed
4. Check browser console for error messages

---

**Happy Learning! 📚✨**
