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
const selectAllBtn = document.getElementById('select-all-btn');

// Selection state
let selectedQuestions = new Set();
let isSelectAllMode = true; // true = "Select All", false = "Unselect All"

// Custom modal elements
const customAlertModal = document.getElementById('custom-alert-modal');
const customConfirmModal = document.getElementById('custom-confirm-modal');
const alertTitle = document.getElementById('alert-title');
const alertMessage = document.getElementById('alert-message');
const alertOkBtn = document.getElementById('alert-ok-btn');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

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
    
    // Add scroll indicators after a brief delay to allow content to render
    setTimeout(addScrollIndicators, 100);
}

// Create history item element
function createHistoryItem(entry, questionNumber) {
    const div = document.createElement('div');
    div.className = 'history-item collapsed'; // Start collapsed
    
    const styleInfo = entry.feedback_style ? ` (${entry.feedback_style})` : '';
    
    // Create the content with Markdown rendering for feedback
    const headerDiv = document.createElement('div');
    headerDiv.className = 'history-item-header';
    headerDiv.style.cursor = 'pointer';
    headerDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Q${questionNumber} [${entry.category}]${styleInfo}</span>
            <i class="fas fa-chevron-down" style="font-size: 0.8rem; color: #64748b; transition: transform 0.3s ease; transform: rotate(-90deg);"></i>
        </div>
    `;
    
    // Add click event for collapse/expand
    headerDiv.addEventListener('click', () => {
        toggleSidebarHistoryItem(div);
    });    const contentDiv = document.createElement('div');
    contentDiv.className = 'history-item-content';
    contentDiv.innerHTML = `
        <strong>Question:</strong>
        <div class="history-question-content">${escapeHtml(entry.question)}</div>
        <strong>Your Answer:</strong>
        <div class="history-answer-content">${escapeHtml(entry.answer)}</div>
        <strong>AI Feedback:</strong>
        <div class="history-feedback-content feedback-markdown">${marked.parse(entry.feedback)}</div>
    `;
    
    div.appendChild(headerDiv);
    div.appendChild(contentDiv);
    
    return div;
}

// Check if content is scrollable and add indicator
function addScrollIndicators() {
    const scrollableElements = document.querySelectorAll('.history-question-content, .history-answer-content, .history-feedback-content');
    
    scrollableElements.forEach(element => {
        // Check if content is scrollable
        if (element.scrollHeight > element.clientHeight) {
            element.classList.add('scrollable');
        } else {
            element.classList.remove('scrollable');
        }
    });
}

// Toggle sidebar history item collapse/expand
function toggleSidebarHistoryItem(historyItem) {
    const chevron = historyItem.querySelector('.fa-chevron-down');
    const content = historyItem.querySelector('.history-item-content');
    
    if (historyItem.classList.contains('collapsed')) {
        // Expanding
        historyItem.classList.remove('collapsed');
        chevron.style.transform = 'rotate(0deg)';
        // Add scroll indicators after expansion animation
        setTimeout(addScrollIndicators, 400);
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
    
    // Show success message
    showCustomAlert('Your answer history has been exported successfully!', 'Export Complete', 'fas fa-check-circle');
}

// Clear history
async function clearHistory() {
    if (selectedQuestions.size > 0) {
        await deleteSelectedQuestions();
        return;
    }
    
    const confirmed = await showCustomConfirm(
        'Are you sure you want to clear all your answer history? This action cannot be undone.',
        'Clear History',
        'fas fa-exclamation-triangle'
    );
    
    if (!confirmed) {
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

// Custom Alert Modal
function showCustomAlert(message, title = 'Notice', icon = 'fas fa-info-circle') {
    return new Promise((resolve) => {
        alertTitle.innerHTML = `<i class="${icon}"></i> ${title}`;
        alertMessage.textContent = message;
        
        customAlertModal.style.display = 'flex';
        customAlertModal.offsetHeight;
        customAlertModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        const handleOk = () => {
            customAlertModal.classList.remove('show');
            setTimeout(() => {
                if (!customAlertModal.classList.contains('show')) {
                    customAlertModal.style.display = 'none';
                }
            }, 300);
            document.body.style.overflow = '';
            alertOkBtn.removeEventListener('click', handleOk);
            resolve();
        };
        
        alertOkBtn.addEventListener('click', handleOk);
        
        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape' && customAlertModal.classList.contains('show')) {
                handleOk();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    });
}

// Custom Confirm Modal
function showCustomConfirm(message, title = 'Confirm', icon = 'fas fa-question-circle') {
    return new Promise((resolve) => {
        confirmTitle.innerHTML = `<i class="${icon}"></i> ${title}`;
        confirmMessage.textContent = message;
        
        customConfirmModal.style.display = 'flex';
        customConfirmModal.offsetHeight;
        customConfirmModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        const cleanup = () => {
            customConfirmModal.classList.remove('show');
            setTimeout(() => {
                if (!customConfirmModal.classList.contains('show')) {
                    customConfirmModal.style.display = 'none';
                }
            }, 300);
            document.body.style.overflow = '';
            confirmOkBtn.removeEventListener('click', handleOk);
            confirmCancelBtn.removeEventListener('click', handleCancel);
            document.removeEventListener('keydown', handleEscape);
        };
        
        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const handleEscape = (e) => {
            if (e.key === 'Escape' && customConfirmModal.classList.contains('show')) {
                handleCancel();
            }
        };
        
        confirmOkBtn.addEventListener('click', handleOk);
        confirmCancelBtn.addEventListener('click', handleCancel);
        document.addEventListener('keydown', handleEscape);
        
        // Handle clicking outside modal
        customConfirmModal.addEventListener('click', (e) => {
            if (e.target === customConfirmModal) {
                handleCancel();
            }
        }, { once: true });
    });
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
    
    // Reset selection state when updating display
    selectedQuestions.clear();
    isSelectAllMode = true;
    updateClearButtonText();
    updateSelectAllButton();
    
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
    
    // Add scroll indicators for archive modal content
    setTimeout(addScrollIndicators, 100);
}

// Create history item element for archive modal (larger format)
function createArchiveModalHistoryItem(entry, questionNumber) {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.dataset.questionIndex = questionHistory.indexOf(entry);
    
    const styleInfo = entry.feedback_style ? ` (${entry.feedback_style})` : '';
    
    // Create controls (select, delete, and expand buttons)
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'history-item-controls';
    controlsDiv.innerHTML = `
        <button class="history-item-select" data-question-index="${questionHistory.indexOf(entry)}">
            <i class="fas fa-check"></i> Select
        </button>
        <button class="history-item-delete" data-question-index="${questionHistory.indexOf(entry)}">
            <i class="fas fa-trash"></i>
        </button>
        <button class="history-item-expand" data-question-index="${questionHistory.indexOf(entry)}">
            <i class="fas fa-chevron-down"></i>
        </button>
    `;
    
    // Create the header (no longer clickable)
    const headerDiv = document.createElement('div');
    headerDiv.className = 'history-item-header';
    headerDiv.innerHTML = `
        <div class="question-title">
            <i class="fas fa-question-circle" style="color: #667eea;"></i>
            Question ${questionNumber} [${entry.category}]${styleInfo}
        </div>
    `;    const contentDiv = document.createElement('div');
    contentDiv.className = 'history-item-content';
    contentDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <strong><i class="fas fa-brain" style="margin-right: 6px; color: #667eea;"></i>Question:</strong>
            <div class="history-question-content" style="margin-top: 8px; border-left: 3px solid #667eea;">${escapeHtml(entry.question)}</div>
        </div>
        
        <div style="margin-bottom: 20px;">
            <strong><i class="fas fa-user" style="margin-right: 6px; color: #10b981;"></i>Your Answer:</strong>
            <div class="history-answer-content" style="margin-top: 8px; border-left: 3px solid #10b981;">${escapeHtml(entry.answer)}</div>
        </div>
        
        <div>
            <strong><i class="fas fa-robot" style="margin-right: 6px; color: #f59e0b;"></i>AI Feedback:</strong>
            <div class="history-feedback-content feedback-markdown" style="margin-top: 8px; border-left: 3px solid #f59e0b;">${marked.parse(entry.feedback)}</div>
        </div>
    `;
    
    div.appendChild(controlsDiv);
    div.appendChild(headerDiv);
    div.appendChild(contentDiv);
    
    // Add event listeners for controls
    const selectBtn = controlsDiv.querySelector('.history-item-select');
    const deleteBtn = controlsDiv.querySelector('.history-item-delete');
    const expandBtn = controlsDiv.querySelector('.history-item-expand');
    
    selectBtn.addEventListener('click', () => toggleQuestionSelection(entry, selectBtn, div));
    deleteBtn.addEventListener('click', () => deleteQuestion(entry));
    expandBtn.addEventListener('click', () => toggleHistoryItemWithButton(div, expandBtn));
    
    return div;
}

// Toggle individual history item collapse/expand
function toggleHistoryItem(historyItem) {
    historyItem.classList.toggle('collapsed');
}

// Expand all history items
function expandAllHistoryItems() {
    const historyItems = archiveModalContent.querySelectorAll('.history-item');
    const expandButtons = archiveModalContent.querySelectorAll('.history-item-expand');
    
    historyItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.remove('collapsed');
            const expandBtn = expandButtons[index];
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                expandBtn.classList.remove('collapsed');
            }
        }, index * 50); // Stagger the animations for a smooth cascade effect
    });
}

// Collapse all history items
function collapseAllHistoryItems() {
    const historyItems = archiveModalContent.querySelectorAll('.history-item');
    const expandButtons = archiveModalContent.querySelectorAll('.history-item-expand');
    
    historyItems.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('collapsed');
            const expandBtn = expandButtons[index];
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                expandBtn.classList.add('collapsed');
            }
        }, index * 30); // Faster stagger for collapse
    });
}

// Toggle individual history item collapse/expand with button
function toggleHistoryItemWithButton(historyItem, expandBtn) {
    const isCollapsed = historyItem.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expanding
        historyItem.classList.remove('collapsed');
        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        expandBtn.classList.remove('collapsed');
    } else {
        // Collapsing
        historyItem.classList.add('collapsed');
        expandBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        expandBtn.classList.add('collapsed');
    }
}

// Toggle question selection with button
function toggleQuestionSelection(entry, selectBtn, historyItem) {
    const entryIndex = questionHistory.indexOf(entry);
    const isSelected = selectedQuestions.has(entryIndex);
    
    if (isSelected) {
        // Unselecting
        selectedQuestions.delete(entryIndex);
        historyItem.classList.remove('selected');
        selectBtn.classList.remove('selected');
        selectBtn.innerHTML = '<i class="fas fa-check"></i> Select';
    } else {
        // Selecting
        selectedQuestions.add(entryIndex);
        historyItem.classList.add('selected');
        selectBtn.classList.add('selected');
        selectBtn.innerHTML = '<i class="fas fa-times"></i> Unselect';
    }
    
    updateClearButtonText();
    updateSelectAllButton();
}

// Handle question selection (legacy function - keeping for compatibility)
function handleQuestionSelection(entry, isSelected) {
    const entryIndex = questionHistory.indexOf(entry);
    const historyItem = archiveModalContent.querySelector(`[data-question-index="${entryIndex}"]`);
    
    if (isSelected) {
        selectedQuestions.add(entryIndex);
        historyItem.classList.add('selected');
    } else {
        selectedQuestions.delete(entryIndex);
        historyItem.classList.remove('selected');
    }
    
    updateClearButtonText();
    updateSelectAllButton();
}

// Delete individual question
async function deleteQuestion(entry) {
    const confirmed = await showCustomConfirm(
        'Are you sure you want to delete this question and answer? This action cannot be undone.',
        'Delete Question',
        'fas fa-exclamation-triangle'
    );
    
    if (!confirmed) return;
    
    const entryIndex = questionHistory.indexOf(entry);
    
    try {
        // Remove from backend (we'll need to implement this endpoint)
        await fetch(`${API_BASE_URL}/history/${entryIndex}`, { 
            method: 'DELETE' 
        });
        
        // Remove from frontend
        questionHistory.splice(entryIndex, 1);
        selectedQuestions.delete(entryIndex);
        
        // Update indices for remaining selected items
        const newSelectedQuestions = new Set();
        selectedQuestions.forEach(index => {
            if (index > entryIndex) {
                newSelectedQuestions.add(index - 1);
            } else if (index < entryIndex) {
                newSelectedQuestions.add(index);
            }
        });
        selectedQuestions = newSelectedQuestions;
        
        updateArchiveModalDisplay();
        updateHistoryDisplay();
        updateClearButtonText();
        updateSelectAllButton();
        
    } catch (error) {
        console.error('Error deleting question:', error);
        showError('Failed to delete question. Please try again.');
    }
}

// Delete selected questions
async function deleteSelectedQuestions() {
    if (selectedQuestions.size === 0) {
        // If no questions selected, clear all
        await clearHistory();
        return;
    }
    
    const confirmed = await showCustomConfirm(
        `Are you sure you want to delete ${selectedQuestions.size} selected question(s)? This action cannot be undone.`,
        'Delete Selected Questions',
        'fas fa-exclamation-triangle'
    );
    
    if (!confirmed) return;
    
    try {
        // Sort indices in descending order to avoid index shifting issues
        const sortedIndices = Array.from(selectedQuestions).sort((a, b) => b - a);
        
        // Delete from backend (we'll implement batch delete)
        await fetch(`${API_BASE_URL}/history/batch`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ indices: sortedIndices })
        });
        
        // Remove from frontend
        sortedIndices.forEach(index => {
            questionHistory.splice(index, 1);
        });
        
        selectedQuestions.clear();
        updateArchiveModalDisplay();
        updateHistoryDisplay();
        updateClearButtonText();
        updateSelectAllButton();
        
    } catch (error) {
        console.error('Error deleting selected questions:', error);
        showError('Failed to delete selected questions. Please try again.');
    }
}

// Toggle select all/unselect all
function toggleSelectAll() {
    const selectButtons = archiveModalContent.querySelectorAll('.history-item-select');
    const historyItems = archiveModalContent.querySelectorAll('.history-item');
    
    if (isSelectAllMode) {
        // Select all
        selectButtons.forEach((selectBtn, index) => {
            const questionIndex = parseInt(selectBtn.dataset.questionIndex);
            selectedQuestions.add(questionIndex);
            
            const historyItem = selectBtn.closest('.history-item');
            historyItem.classList.add('selected');
            selectBtn.classList.add('selected');
            selectBtn.innerHTML = '<i class="fas fa-times"></i> Unselect';
        });
        isSelectAllMode = false;
    } else {
        // Unselect all
        selectButtons.forEach(selectBtn => {
            const historyItem = selectBtn.closest('.history-item');
            historyItem.classList.remove('selected');
            selectBtn.classList.remove('selected');
            selectBtn.innerHTML = '<i class="fas fa-check"></i> Select';
        });
        selectedQuestions.clear();
        isSelectAllMode = true;
    }
    
    updateClearButtonText();
    updateSelectAllButton();
}

// Update clear button text based on selection
function updateClearButtonText() {
    const clearBtn = document.getElementById('archive-modal-clear');
    if (selectedQuestions.size > 0) {
        clearBtn.innerHTML = `<i class="fas fa-trash"></i> Clear Selected (${selectedQuestions.size})`;
    } else {
        clearBtn.innerHTML = `<i class="fas fa-trash"></i> Clear All`;
    }
}

// Update select all button text
function updateSelectAllButton() {
    const selectBtn = document.getElementById('select-all-btn');
    if (isSelectAllMode) {
        selectBtn.innerHTML = `<i class="fas fa-check-square"></i> Select All`;
    } else {
        selectBtn.innerHTML = `<i class="fas fa-square"></i> Unselect All`;
    }
}

// Show error message
function showError(message) {
    showCustomAlert(message, 'Error', 'fas fa-exclamation-triangle');
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
    
    // Selection buttons
    selectAllBtn.addEventListener('click', toggleSelectAll);
    
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
