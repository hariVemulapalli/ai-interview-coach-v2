from fastapi import FastAPI, HTTPException, Cookie, Response
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
from uuid import uuid4
import time

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Interview Coach API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

# Get the directory paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

# Mount static files
app.mount("/static", StaticFiles(directory=os.path.join(project_root, "frontend")), name="static")

# Configure Gemini AI
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("❌ Gemini API key not found in environment variables.")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash")

# Load questions
try:
    questions_path = os.path.join(project_root, "questions.json")
    with open(questions_path, "r") as f:
        questions_by_category = json.load(f)
except FileNotFoundError:
    questions_by_category = {}

# Pydantic models
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

# SESSION-BASED STORAGE (instead of global)
session_data = {}
SESSION_TIMEOUT = 1800  # Will erase sessions immediately for simplicity

def cleanup_old_sessions():
    """Remove sessions older than timeout"""
    current_time = time.time()
    expired = [sid for sid, data in session_data.items() 
               if current_time - data.get('created', 0) > SESSION_TIMEOUT]
    for sid in expired:
        del session_data[sid]

def get_or_create_session(session_id: Optional[str] = None):
    """Get existing session or create new one"""
    cleanup_old_sessions()
    
    if not session_id or session_id not in session_data:
        session_id = str(uuid4())
        session_data[session_id] = {
            'history': [],
            'created': time.time()
        }
    return session_id

@app.get("/")
async def read_root():
    """Serve the main HTML page"""
    return FileResponse(os.path.join(project_root, "frontend", "index.html"))

@app.get("/api/categories")
async def get_categories():
    """Get all available question categories"""
    return {"categories": list(questions_by_category.keys())}

@app.get("/api/question/{category}")
async def get_random_question(category: str, session_id: Optional[str] = Cookie(None)):
    """Get a random question from a specific category"""
    if category not in questions_by_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    session_id = get_or_create_session(session_id)
    question = random.choice(questions_by_category[category])
    
    response = Response(content=json.dumps({
        "question": question, 
        "category": category
    }), media_type="application/json")
    response.set_cookie("session_id", session_id, max_age=SESSION_TIMEOUT)
    return response

@app.post("/api/evaluate")
async def evaluate_answer(request: EvaluationRequest, session_id: Optional[str] = Cookie(None)):
    """Evaluate a user's answer using AI"""
    session_id = get_or_create_session(session_id)
    
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
        feedback = response.text
        
        # Create response with session cookie
        json_response = Response(
            content=json.dumps({"feedback": feedback}),
            media_type="application/json"
        )
        json_response.set_cookie("session_id", session_id, max_age=SESSION_TIMEOUT)
        return json_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error evaluating answer: {str(e)}")

@app.post("/api/history")
async def add_to_history(entry: HistoryEntry, session_id: Optional[str] = Cookie(None)):
    """Add an entry to the user's session history"""
    session_id = get_or_create_session(session_id)
    session_data[session_id]['history'].append(entry.dict())
    
    response = Response(content=json.dumps({"status": "success"}), media_type="application/json")
    response.set_cookie("session_id", session_id, max_age=SESSION_TIMEOUT)
    return response

@app.get("/api/history")
async def get_history(category: Optional[str] = None, session_id: Optional[str] = Cookie(None)):
    """Get user's session history, optionally filtered by category"""
    session_id = get_or_create_session(session_id)
    user_history = session_data[session_id]['history']
    
    if category and category != "All":
        filtered_history = [h for h in user_history if h["category"] == category]
        response_data = {"history": filtered_history}
    else:
        response_data = {"history": user_history}
    
    response = Response(content=json.dumps(response_data), media_type="application/json")
    response.set_cookie("session_id", session_id, max_age=SESSION_TIMEOUT)
    return response

@app.delete("/api/history")
async def clear_history(session_id: Optional[str] = Cookie(None)):
    """Clear user's session history"""
    session_id = get_or_create_session(session_id)
    session_data[session_id]['history'] = []
    
    response = Response(content=json.dumps({"status": "success"}), media_type="application/json")
    response.set_cookie("session_id", session_id, max_age=SESSION_TIMEOUT)
    return response

@app.delete("/api/history/{index}")
async def delete_history_item(index: int, session_id: Optional[str] = Cookie(None)):
    """Delete a specific history item by index"""
    session_id = get_or_create_session(session_id)
    user_history = session_data[session_id]['history']
    
    if 0 <= index < len(user_history):
        user_history.pop(index)
        response_data = {"status": "success"}
    else:
        raise HTTPException(status_code=404, detail="History item not found")
    
    response = Response(content=json.dumps(response_data), media_type="application/json")
    response.set_cookie("session_id", session_id, max_age=SESSION_TIMEOUT)
    return response

class BatchDeleteRequest(BaseModel):
    indices: List[int]

@app.delete("/api/history/batch")
async def delete_history_batch(request: BatchDeleteRequest, session_id: Optional[str] = Cookie(None)):
    """Delete multiple history items by indices"""
    session_id = get_or_create_session(session_id)
    user_history = session_data[session_id]['history']
    
    # Sort indices in descending order to avoid index shifting issues
    sorted_indices = sorted(request.indices, reverse=True)
    
    # Validate all indices are within range
    for index in sorted_indices:
        if not (0 <= index < len(user_history)):
            raise HTTPException(status_code=400, detail=f"Invalid index: {index}")
    
    # Delete items starting from highest index
    for index in sorted_indices:
        user_history.pop(index)
    
    response = Response(content=json.dumps({"status": "success"}), media_type="application/json")
    response.set_cookie("session_id", session_id, max_age=SESSION_TIMEOUT)
    return response

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    """Serve the main HTML file for any unmatched routes"""
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    return FileResponse(os.path.join(project_root, "frontend", "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
