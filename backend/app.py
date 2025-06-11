from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import json
import random
import os
from dotenv import load_dotenv
import google.generativeai as genai
from typing import List, Dict, Optional

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Interview Coach API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Configure Gemini AI
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("❌ Gemini API key not found in environment variables.")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash")

# Load questions
try:
    with open("../questions.json", "r") as f:
        questions_by_category = json.load(f)
except FileNotFoundError:
    questions_by_category = {}

# Pydantic models for request/response
class EvaluationRequest(BaseModel):
    answer: str
    style: str = "Detailed"

class EvaluationResponse(BaseModel):
    feedback: str

class QuestionResponse(BaseModel):
    question: str
    category: str

class HistoryEntry(BaseModel):
    category: str
    question: str
    answer: str
    feedback: str
    feedback_style: str

# In-memory storage for demo (in production, use a proper database)
user_history: List[Dict] = []

@app.get("/")
async def read_root():
    """Serve the main HTML page"""
    return FileResponse("../frontend/index.html")

@app.get("/api/categories")
async def get_categories():
    """Get all available question categories"""
    return {"categories": list(questions_by_category.keys())}

@app.get("/api/question/{category}")
async def get_random_question(category: str):
    """Get a random question from a specific category"""
    if category not in questions_by_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    question = random.choice(questions_by_category[category])
    return QuestionResponse(question=question, category=category)

@app.post("/api/evaluate")
async def evaluate_answer(request: EvaluationRequest):
    """Evaluate a user's answer using AI"""
    try:
        style_instructions = {
            "Detailed": "Provide a thorough and detailed analysis.",
            "Concise": "Give a brief and concise evaluation.",
            "Friendly": "Offer feedback in a friendly and encouraging tone."
        }
        
        style_instruction = style_instructions.get(request.style, style_instructions["Detailed"])
        
        prompt = f"""
You are an expert interview coach.

Here is a candidate's answer to a behavioral interview question:
"{request.answer}"

Evaluate the response on:
- Clarity (1-5)
- STAR format use (1-5)
- Impactfulness (1-5)

{style_instruction}

Then provide short, actionable feedback on how to improve.
"""
        
        response = model.generate_content(prompt)
        return EvaluationResponse(feedback=response.text)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating answer: {str(e)}")

@app.post("/api/history")
async def add_to_history(entry: HistoryEntry):
    """Add an entry to the user's history"""
    user_history.append(entry.dict())
    return {"status": "success"}

@app.get("/api/history")
async def get_history(category: Optional[str] = None):
    """Get user's history, optionally filtered by category"""
    if category and category != "All":
        filtered_history = [h for h in user_history if h["category"] == category]
        return {"history": filtered_history}
    return {"history": user_history}

@app.delete("/api/history")
async def clear_history():
    """Clear user's history"""
    global user_history
    user_history = []
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
