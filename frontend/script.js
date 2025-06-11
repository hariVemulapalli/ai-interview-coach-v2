// API Configuration
const API_BASE_URL = `${window.location.origin}/api`;

// Global state
let currentQuestion = '';
let currentCategory = '';
let questionHistory = [];

// DOM Elements
const categorySelect = document.getElementById('category-select');
const customQuestionInput = document.getElementById('custom-question');
const newQuestionBtn = document.getElementById('new-question-btn');
const currentQuestionDiv = document.getElementById('current-question');
const questionSourceDiv = document.getElementById('question-source');
const userAnswerTextarea = document.getElementById('user-answer');
const feedbackStyleSelect = document.getElementById('feedback-style');
const evaluateBtn = document.getElementById('evaluate-btn');
const feedbackSection = document.getElementById('feedback-section');
const feedbackContent = document.getElementById('feedback-content');
const historyFilter = document.getElementById('history-filter');
const historyContent = document.getElementById('history-content');
const exportBtn = document.getElementById('export-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const expandHistoryBtn = document.getElementById('expand-history-btn');
const loadingModal = document.getElementById('loading-modal');

// Answer history modal elements
const archiveModal = document.getElementById('archive-modal');
const closeArchiveModalBtn = document.getElementById('close-archive-modal');
const archiveModalFilter = document.getElementById('archive-modal-filter');
const archiveModalContent = document.getElementById('archive-modal-content');
const archiveModalExportBtn = document.getElementById('archive-modal-export');
const archiveModalClearBtn = document.getElementById('archive-modal-clear');
const expandAllBtn = document.getElementById('expand-all-btn');
const collapseAllBtn = document.getElementById('collapse-all-btn');

// Auto-reset session on page load
async function autoResetSession() {
    try {
        // FIRST: Clear backend data via API call
        const response = await fetch(`${API_BASE_URL}/history`, { 
            method: 'DELETE',
            credentials: 'include'  // Important: include cookies for session
        });
        
        if (response.ok) {
            console.log('✅ Backend session cleared successfully');
        } else {
            console.log('⚠️ Backend clear failed, but continuing...');
        }
        
        // THEN: Clear frontend UI data
        questionHistory = [];
        currentQuestion = '';
        currentCategory = '';
        
        // Clear form elements
        if (userAnswerTextarea) userAnswerTextarea.value = '';
        if (customQuestionInput) customQuestionInput.value = '';
        
        // Hide feedback section
        if (typeof hideFeedback === 'function') {
            hideFeedback();
        }
        
        // Clear history display
        if (historyContent) {
            historyContent.innerHTML = '';
        }
        
        console.log('✅ Complete session reset finished');
        
    } catch (error) {
        console.log('⚠️ Auto-reset failed (this is normal on first visit):', error);
    }
}

// Initialize the application
async function init() {
    try {
        // First, reset the session for a clean start
        await autoResetSession();
        await loadCategories();
        await loadHistory();
        setupEventListeners();
        
        // Load initial question if categories are available
        if (categorySelect.options.length > 0) {
            await getNewQuestion();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize the application. Please check your connection.');
    }
}

// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const data = await response.json();
        
        categorySelect.innerHTML = '';
        data.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        
        // Update history filter
        updateHistoryFilter(data.categories);
        
        if (data.categories.length > 0) {
            currentCategory = data.categories[0];
        }
    } catch (error) {
        throw new Error('Failed to load categories');
    }
}

// Update history filter options
function updateHistoryFilter(categories) {
    const currentValue = historyFilter.value;
    historyFilter.innerHTML = '<option value="All">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        historyFilter.appendChild(option);
    });
    
    // Add Custom option
    const customOption = document.createElement('option');
    customOption.value = 'Custom';
    customOption.textContent = 'Custom';
    historyFilter.appendChild(customOption);
    
    // Restore previous selection if it still exists
    if (currentValue && [...historyFilter.options].some(opt => opt.value === currentValue)) {
        historyFilter.value = currentValue;
    }
    
    // Update archive modal filter as well
    updateArchiveModalFilter(categories);
}

// Update archive modal filter options
function updateArchiveModalFilter(categories) {
    const currentValue = archiveModalFilter.value;
    archiveModalFilter.innerHTML = '<option value="All">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        archiveModalFilter.appendChild(option);
    });
    
    // Add Custom option
    const customOption = document.createElement('option');
    customOption.value = 'Custom';
    customOption.textContent = 'Custom';
    archiveModalFilter.appendChild(customOption);
    
    // Restore previous selection if it still exists
    if (currentValue && [...archiveModalFilter.options].some(opt => opt.value === currentValue)) {
        archiveModalFilter.value = currentValue;
    }
}

// Get a new random question
async function getNewQuestion() {
    if (!currentCategory) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/question/${currentCategory}`);
        const data = await response.json();
        
        currentQuestion = data.question;
        displayQuestion(data.question, data.category, false);
        
        // Clear custom question input
        customQuestionInput.value = '';
    } catch (error) {
        console.error('Error getting new question:', error);
        showError('Failed to get a new question. Please try again.');
    }
}

// Display question in the UI
function displayQuestion(question, category, isCustom = false) {
    currentQuestionDiv.textContent = question;
    questionSourceDiv.textContent = isCustom ? 'Custom Question' : `Category: ${category}`;
    
    // Clear previous answer and feedback
    userAnswerTextarea.value = '';
    hideFeedback();
}

// Evaluate user's answer
async function evaluateAnswer() {
    const answer = userAnswerTextarea.value.trim();
    if (!answer) {
        showError('Please enter your answer before evaluating.');
        return;
    }
    
    if (!getCurrentQuestion()) {
        showError('No question selected. Please select a question first.');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE_URL}/evaluate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                answer: answer,
                style: feedbackStyleSelect.value
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to evaluate answer');
        }
        
        const data = await response.json();
        
        // Display feedback
        showFeedback(data.feedback);
        
        // Add to history
        const historyEntry = {
            category: isCustomQuestion() ? 'Custom' : currentCategory,
            question: getCurrentQuestion(),
            answer: answer,
            feedback: data.feedback,
            feedback_style: feedbackStyleSelect.value
        };
        
        await addToHistory(historyEntry);
        questionHistory.unshift(historyEntry);
        updateHistoryDisplay();
        
    } catch (error) {
        console.error('Error evaluating answer:', error);
        showError('Failed to evaluate answer. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Get current question (custom or selected)
function getCurrentQuestion() {
    const customQ = customQuestionInput.value.trim();
    return customQ || currentQuestion;
}

// Check if current question is custom
function isCustomQuestion() {
    return customQuestionInput.value.trim() !== '';
}

// Show feedback section
function showFeedback(feedback) {
    // Convert Markdown to HTML and display
    feedbackContent.innerHTML = marked.parse(feedback);
    feedbackSection.style.display = 'block';
    feedbackSection.scrollIntoView({ behavior: 'smooth' });
}

// Hide feedback section
function hideFeedback() {
    feedbackSection.style.display = 'none';
}

// Add entry to history
async function addToHistory(entry) {
    try {
        await fetch(`${API_BASE_URL}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(entry)
        });
    } catch (error) {
        console.error('Error adding to history:', error);
    }
}

// Load history from API
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/history`);
        const data = await response.json();
        questionHistory = data.history || [];
        updateHistoryDisplay();
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Update history display
function updateHistoryDisplay() {
    const filterValue = historyFilter.value;
    let filteredHistory = questionHistory;
    
    if (filterValue !== 'All') {
        filteredHistory = questionHistory.filter(entry => entry.category === filterValue);
    }
    
    if (filteredHistory.length === 0) {
        historyContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>Your past answers will appear here after evaluation.</p>
            </div>
        `;
        return;
    }
    
    historyContent.innerHTML = '';
    filteredHistory.forEach((entry, index) => {
        const historyItem = createHistoryItem(entry, filteredHistory.length - index);
        historyContent.appendChild(historyItem);
    });
}

// Create history item element
function createHistoryItem(entry, questionNumber) {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    const styleInfo = entry.feedback_style ? ` (${entry.feedback_style})` : '';
    
    // Create the content with Markdown rendering for feedback
    const headerDiv = document.createElement('div');
    headerDiv.className = 'history-item-header';
    headerDiv.style.cursor = 'pointer';
    headerDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Q${questionNumber} [${entry.category}]${styleInfo}</span>
            <i class="fas fa-chevron-down" style="font-size: 0.8rem; color: #64748b; transition: transform 0.3s ease;"></i>
        </div>
    `;
    
    // Add click event for collapse/expand
    headerDiv.addEventListener('click', () => {
        toggleSidebarHistoryItem(div);
    });
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'history-item-content';
    contentDiv.innerHTML = `
        <strong>Question:</strong> ${escapeHtml(entry.question)}<br><br>
        <strong>Your Answer:</strong> ${escapeHtml(entry.answer)}<br><br>
        <strong>AI Feedback:</strong><br>
        <div class="feedback-markdown">${marked.parse(entry.feedback)}</div>
    `;
    
    div.appendChild(headerDiv);
    div.appendChild(contentDiv);
    
    return div;
}

// Toggle sidebar history item collapse/expand
function toggleSidebarHistoryItem(historyItem) {
    const chevron = historyItem.querySelector('.fa-chevron-down');
    const content = historyItem.querySelector('.history-item-content');
    
    if (historyItem.classList.contains('collapsed')) {
        // Expanding
        historyItem.classList.remove('collapsed');
        chevron.style.transform = 'rotate(0deg)';
    } else {
        // Collapsing
        historyItem.classList.add('collapsed');
        chevron.style.transform = 'rotate(-90deg)';
    }
}

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export history as text file
function exportHistory() {
    if (questionHistory.length === 0) {
        showError('No history to export.');
        return;
    }
    
    let exportText = 'AI Interview Coach - Answer History\n';
    exportText += '=' .repeat(50) + '\n\n';
    
    questionHistory.forEach((entry, index) => {
        const questionNumber = questionHistory.length - index;
        const styleInfo = entry.feedback_style ? ` (${entry.feedback_style})` : '';
        
        exportText += `Question ${questionNumber} [${entry.category}]${styleInfo}\n`;
        exportText += '-'.repeat(30) + '\n';
        exportText += `Question: ${entry.question}\n\n`;
        exportText += `Your Answer:\n${entry.answer}\n\n`;
        exportText += `AI Feedback:\n${entry.feedback}\n\n`;
        exportText += '='.repeat(50) + '\n\n';
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview_answers.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Clear history
async function clearHistory() {
    if (!confirm('Are you sure you want to clear all your answer history? This action cannot be undone.')) {
        return;
    }
    
    try {
        await fetch(`${API_BASE_URL}/history`, { method: 'DELETE' });
        questionHistory = [];
        updateHistoryDisplay();
    } catch (error) {
        console.error('Error clearing history:', error);
        showError('Failed to clear history. Please try again.');
    }
}

// Show/hide loading modal
function showLoading(show) {
    if (show) {
        loadingModal.style.display = 'flex';
        // Force a reflow to ensure the display change takes effect
        loadingModal.offsetHeight;
        // Add the show class for animation
        loadingModal.classList.add('show');
    } else {
        // Remove the show class for exit animation
        loadingModal.classList.remove('show');
        // Wait for animation to complete before hiding
        setTimeout(() => {
            if (!loadingModal.classList.contains('show')) {
                loadingModal.style.display = 'none';
            }
        }, 300); // Match the CSS transition duration
    }
}

// Show archive modal
function showArchiveModal() {
    archiveModal.style.display = 'flex';
    // Force a reflow to ensure the display change takes effect
    archiveModal.offsetHeight;
    // Add the show class for animation
    archiveModal.classList.add('show');
    updateArchiveModalDisplay();
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

// Hide archive modal
function hideArchiveModal() {
    // Remove the show class for exit animation
    archiveModal.classList.remove('show');
    // Wait for animation to complete before hiding
    setTimeout(() => {
        if (!archiveModal.classList.contains('show')) {
            archiveModal.style.display = 'none';
        }
    }, 300); // Match the CSS transition duration
    // Restore body scroll
    document.body.style.overflow = '';
}

// Update archive modal display
function updateArchiveModalDisplay() {
    const filterValue = archiveModalFilter.value;
    let filteredHistory = questionHistory;
    
    if (filterValue !== 'All') {
        filteredHistory = questionHistory.filter(entry => entry.category === filterValue);
    }
    
    if (filteredHistory.length === 0) {
        archiveModalContent.innerHTML = `
            <div class="empty-state" style="padding: 60px 20px;">
                <i class="fas fa-clipboard-list" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                <p style="font-size: 1.1rem; color: #64748b;">No answers found for the selected filter.</p>
                <p style="color: #9ca3af; margin-top: 10px;">Try selecting a different category or answer some questions first.</p>
            </div>
        `;
        return;
    }
    
    archiveModalContent.innerHTML = '';
    filteredHistory.forEach((entry, index) => {
        const historyItem = createArchiveModalHistoryItem(entry, filteredHistory.length - index);
        archiveModalContent.appendChild(historyItem);
    });
}

// Create history item element for archive modal (larger format)
function createArchiveModalHistoryItem(entry, questionNumber) {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    const styleInfo = entry.feedback_style ? ` (${entry.feedback_style})` : '';
    
    // Create the header with collapse/expand functionality
    const headerDiv = document.createElement('div');
    headerDiv.className = 'history-item-header';
    headerDiv.innerHTML = `
        <div class="question-title">
            <i class="fas fa-question-circle" style="color: #667eea;"></i>
            Question ${questionNumber} [${entry.category}]${styleInfo}
        </div>
        <div class="collapse-toggle">
            <i class="fas fa-chevron-down"></i>
        </div>
    `;
    
    // Add click event for collapse/expand
    headerDiv.addEventListener('click', () => {
        toggleHistoryItem(div);
    });
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'history-item-content';
    contentDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong><i class="fas fa-brain" style="margin-right: 6px; color: #667eea;"></i>Question:</strong>
            <div style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #667eea;">${escapeHtml(entry.question)}</div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <strong><i class="fas fa-user" style="margin-right: 6px; color: #10b981;"></i>Your Answer:</strong>
            <div style="margin-top: 8px; padding: 12px; background: white; border-radius: 6px; border-left: 3px solid #10b981;">${escapeHtml(entry.answer)}</div>
        </div>
        
        <div>
            <strong><i class="fas fa-robot" style="margin-right: 6px; color: #f59e0b;"></i>AI Feedback:</strong>
            <div class="feedback-markdown">${marked.parse(entry.feedback)}</div>
        </div>
    `;
    
    div.appendChild(headerDiv);
    div.appendChild(contentDiv);
    
    return div;
}

// Toggle individual history item collapse/expand
function toggleHistoryItem(historyItem) {
    historyItem.classList.toggle('collapsed');
}

// Expand all history items
function expandAllHistoryItems() {
    const historyItems = archiveModalContent.querySelectorAll('.history-item');
    historyItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.remove('collapsed');
        }, index * 50); // Stagger the animations for a smooth cascade effect
    });
}

// Collapse all history items
function collapseAllHistoryItems() {
    const historyItems = archiveModalContent.querySelectorAll('.history-item');
    historyItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('collapsed');
        }, index * 30); // Faster stagger for collapse
    });
}

// Show error message
function showError(message) {
    alert(message); // In a production app, you'd want a better error display
}

// Setup event listeners
function setupEventListeners() {
    // Category selection
    categorySelect.addEventListener('change', (e) => {
        currentCategory = e.target.value;
        getNewQuestion();
    });
    
    // Custom question input
    customQuestionInput.addEventListener('input', (e) => {
        const customQ = e.target.value.trim();
        if (customQ) {
            displayQuestion(customQ, '', true);
        } else if (currentQuestion) {
            displayQuestion(currentQuestion, currentCategory, false);
        }
    });
    
    // New question button
    newQuestionBtn.addEventListener('click', getNewQuestion);
    
    // Evaluate button
    evaluateBtn.addEventListener('click', evaluateAnswer);
    
    // History filter
    historyFilter.addEventListener('change', updateHistoryDisplay);
    
    // Export button
    exportBtn.addEventListener('click', exportHistory);
      // Clear history button
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Expand history button
    expandHistoryBtn.addEventListener('click', showArchiveModal);
      // Archive modal controls
    closeArchiveModalBtn.addEventListener('click', hideArchiveModal);
    archiveModalFilter.addEventListener('change', updateArchiveModalDisplay);
    archiveModalExportBtn.addEventListener('click', exportHistory);
    archiveModalClearBtn.addEventListener('click', async () => {
        await clearHistory();
        updateArchiveModalDisplay();
    });
    
    // Expand/Collapse all buttons
    expandAllBtn.addEventListener('click', expandAllHistoryItems);
    collapseAllBtn.addEventListener('click', collapseAllHistoryItems);
    
    // Close modal when clicking outside
    archiveModal.addEventListener('click', (e) => {
        if (e.target === archiveModal) {
            hideArchiveModal();
        }
    });
      // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && archiveModal.classList.contains('show')) {
            hideArchiveModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'Enter':
                    if (userAnswerTextarea.value.trim()) {
                        e.preventDefault();
                        evaluateAnswer();
                    }
                    break;
                case 'n':
                    e.preventDefault();
                    getNewQuestion();
                    break;
            }
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
