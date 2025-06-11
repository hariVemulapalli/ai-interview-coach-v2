# 🎤 AI Interview Coach

A modern web application for practicing behavioral interview questions with AI-powered feedback. This tool helps job seekers sharpen their answers using the STAR method.

## 🚀 Features

- 🎲 Random or category-based question selection
- 📝 Instant AI-generated feedback (Clarity, STAR use, Impact)
- 📜 Answer history
- 💾 Export all your answers and feedback as a .txt file
- 🗂️ Filter saved answers by category
- ✍️ Add custom questions
- 🎛️ Choose feedback style (Detailed, Concise, Friendly)
- 📱 Works perfectly on desktop, tablet, and mobile devices

## 🧰 Tech Stack & Tools

This application uses a modern web architecture:

- **Backend**: Python, FastAPI (RESTful API server)
- **Frontend**: HTML, CSS, JavaScript - Modern, responsive UI
- **AI Integration**: Google Gemini AI for answer evaluation
- **Styling**: Custom CSS with modern design principles
- **Source Code Management**: GitHub for source code hosting and CI/CD process
- **Deployment**: Render for hosting the live application

⚠️ **Note**: This app is hosted on Render’s free tier and may take a few seconds to load after inactivity due to cold starts.

## 📦 Setup Instructions

### Prerequisites

- Python 3.8+
- Google Gemini API key (free tier is acceptable)

### 1. Backend Setup
bash:
``` bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Create a .env file with:
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Frontend Setup

The frontend files are already in the `frontend` directory and will be served by the FastAPI backend.

### 3. Running the Application
bash:
```bash
# From the backend directory
python app.py
```

The application will be available at: `http://localhost:8000`

## API Endpoints

- `GET /` - Serves the main HTML page
- `GET /api/categories` - Get all question categories
- `GET /api/question/{category}` - Get random question from category
- `POST /api/evaluate` - Evaluate user's answer
- `GET /api/history` - Get user's answer history
- `POST /api/history` - Add entry to history
- `DELETE /api/history` - Clear history

### 📁 File Structure

```
├── backend/
│   ├── app.py              # FastAPI application
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── index.html         # Main HTML page
│   ├── style.css          # CSS styles
│   └── script.js          # JavaScript functionality
├── questions.json         # Question database
└── README.md             # This file
```

## Key Improvements from Streamlit Version (initial version of the application)

1. **Better Performance**: No server-side rendering delays
2. **Modern UI**: Clean, responsive design with smooth interactions
3. **Better UX**: Real-time updates, loading indicators, keyboard shortcuts
4. **Scalability**: Easy to deploy and scale the API separately
5. **Mobile-First**: Fully responsive design for all devices

## Development

To modify the application:

1. **Backend changes**: Edit `backend/app.py` and restart the server
2. **Frontend changes**: Edit files in `frontend/` directory - changes are reflected immediately
3. **Styling**: Modify `frontend/style.css` for visual changes
4. **Functionality**: Update `frontend/script.js` for behavior changes
5. **Question database**: Update `questions.json` to add, edit, or remove questions

Built with ❤️ by Hari Vemulapalli
