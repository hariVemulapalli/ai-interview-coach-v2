#!/bin/bash

# Git staging strategy for AI Interview Coach refactor
# Run these commands one by one to create clean, logical commits

echo "🔄 AI Interview Coach - Staged Git Commits"
echo "=========================================="

echo "📋 Suggested commit sequence:"
echo ""

echo "1️⃣  COMMIT 1: Backend API Foundation"
echo "   git add backend/app.py backend/requirements.txt"
echo "   git commit -m 'feat: add FastAPI backend with REST endpoints"
echo ""
echo "   - Add FastAPI server with CORS support"
echo "   - Implement question categories and random selection API"
echo "   - Add AI evaluation endpoint using Google Gemini"
echo "   - Include answer history management endpoints'"
echo ""

echo "2️⃣  COMMIT 2: Modern Frontend Structure"
echo "   git add frontend/index.html frontend/style.css"
echo "   git commit -m 'feat: create modern responsive frontend"
echo ""
echo "   - Add mobile-first responsive HTML structure"
echo "   - Implement modern CSS with gradients and animations"
echo "   - Include Font Awesome icons and Google Fonts"
echo "   - Add loading states and modal components'"
echo ""

echo "3️⃣  COMMIT 3: Frontend JavaScript Logic"
echo "   git add frontend/script.js"
echo "   git commit -m 'feat: implement interactive frontend functionality"
echo ""
echo "   - Add API integration for all backend endpoints"
echo "   - Implement real-time question loading and evaluation"
echo "   - Add answer history with filtering and export"
echo "   - Include keyboard shortcuts and error handling'"
echo ""

echo "4️⃣  COMMIT 4: Documentation and Setup"
echo "   git add README.md REFACTORING_COMPLETE.md migrate.sh test_api.sh"
echo "   git commit -m 'docs: update documentation for new architecture"
echo ""
echo "   - Update README with new setup instructions"
echo "   - Add migration guide and testing scripts"
echo "   - Document API endpoints and project structure'"
echo ""

echo "5️⃣  COMMIT 5: Remove Legacy Dependencies (Optional)"
echo "   git rm requirements.txt  # old streamlit requirements"
echo "   git commit -m 'cleanup: remove legacy Streamlit dependencies'"
echo ""

echo "✅ This creates a clean, reviewable commit history!"
echo "Each commit is focused and can be reviewed independently."
