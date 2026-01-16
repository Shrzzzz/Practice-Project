// ===== AUTHENTICATION SYSTEM =====

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (currentUser) {
        showDashboard(currentUser);
        initializeExpenseTracker();
    } else {
        showAuthContainer();
    }

    // Setup event listeners
    setupAuthenticationListeners();
});

// ===== SETUP AUTHENTICATION LISTENERS =====
function setupAuthenticationListeners() {
    // Login form submission
    const loginForm = document.getElementById('login-submit');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Registration form submission
    const registerForm = document.getElementById('register-submit');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);
    }

    // Email verification form submission
    const verifyForm = document.getElementById('verify-submit');
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleEmailVerification);
    }

    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// ===== USER REGISTRATION =====
async function handleRegistration(e) {
    e.preventDefault();
    clearAllErrors();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;

    // Validation
    let isValid = true;

    if (!name || name.length < 2) {
        showError('register-name', 'Name must be at least 2 characters');
        isValid = false;
    }

    if (!isValidEmail(email)) {
        showError('register-email', 'Please enter a valid email address');
        isValid = false;
    }

    if (password.length < 8) {
        showError('register-password', 'Password must be at least 8 characters');
        isValid = false;
    }

    if (password !== confirmPassword) {
        showError('register-confirm', 'Passwords do not match');
        isValid = false;
    }

    // Check if user already exists
    const existingUsers = JSON.parse(localStorage.getItem('users')) || [];
    if (existingUsers.some(user => user.email === email)) {
        showError('register-email', 'Email already registered');
        isValid = false;
    }

    if (!isValid) return;

    // Generate verification code
    const verificationCode = generateVerificationCode();
    
    // Hash password using CryptoJS
    const hashedPassword = CryptoJS.SHA256(password).toString();

    // Save user data temporarily with verification pending
    const newUser = {
        id: generateUserId(),
        name: name,
        email: email,
        password: hashedPassword,
        verified: false,
        verificationCode: verificationCode,
        createdAt: new Date().toISOString()
    };

    sessionStorage.setItem('pendingUser', JSON.stringify(newUser));

    // Simulate sending verification email (in real app, use backend email service)
    simulateEmailVerification(email, verificationCode);

    // Switch to verification form
    switchAuthForm('verify');
    showSuccessMessage('verify-submit', 'Verification code sent to ' + email);
}

// ===== USER LOGIN =====
async function handleLogin(e) {
    e.preventDefault();
    clearAllErrors();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Validation
    let isValid = true;

    if (!isValidEmail(email)) {
        showError('login-email', 'Please enter a valid email address');
        isValid = false;
    }

    if (!password) {
        showError('login-password', 'Password is required');
        isValid = false;
    }

    if (!isValid) return;

    // Retrieve user from storage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email);

    if (!user) {
        showError('login-email', 'No account found with this email');
        return;
    }

    if (!user.verified) {
        showError('login-email', 'Please verify your email first');
        return;
    }

    // Hash the entered password and compare
    const hashedPassword = CryptoJS.SHA256(password).toString();

    if (hashedPassword !== user.password) {
        showError('login-password', 'Incorrect password');
        return;
    }

    // Login successful
    localStorage.setItem('currentUser', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email
    }));

    showDashboard(user);
}

// ===== EMAIL VERIFICATION =====
function handleEmailVerification(e) {
    e.preventDefault();
    clearAllErrors();

    const code = document.getElementById('verify-code').value.trim();
    const pendingUser = JSON.parse(sessionStorage.getItem('pendingUser'));

    if (!pendingUser) {
        showError('verify-code', 'Session expired. Please register again.');
        return;
    }

    if (code !== pendingUser.verificationCode) {
        showError('verify-code', 'Invalid verification code');
        return;
    }

    // Mark user as verified
    pendingUser.verified = true;
    delete pendingUser.verificationCode;

    // Save user to permanent storage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    users.push(pendingUser);
    localStorage.setItem('users', JSON.stringify(users));

    // Clear pending user from session
    sessionStorage.removeItem('pendingUser');

    // Auto-login the user
    localStorage.setItem('currentUser', JSON.stringify({
        id: pendingUser.id,
        name: pendingUser.name,
        email: pendingUser.email
    }));

    showSuccessMessage('verify-submit', 'Email verified successfully! Logging in...');
    
    setTimeout(() => {
        showDashboard(pendingUser);
    }, 1500);
}

// ===== USER LOGOUT =====
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        location.reload();
    }
}

// ===== UI FUNCTIONS =====
function toggleAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');

    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');

    // Clear all errors when switching
    clearAllErrors();
    
    // Clear forms
    if (loginForm.classList.contains('active')) {
        document.getElementById('register-submit').reset();
    } else {
        document.getElementById('login-submit').reset();
    }
}

function switchAuthForm(formType) {
    const forms = document.querySelectorAll('.auth-form');
    forms.forEach(form => form.classList.remove('active'));

    if (formType === 'login') {
        document.getElementById('login-form').classList.add('active');
    } else if (formType === 'register') {
        document.getElementById('register-form').classList.add('active');
    } else if (formType === 'verify') {
        document.getElementById('verify-form').classList.add('active');
    }
}

function goBackToLogin() {
    sessionStorage.removeItem('pendingUser');
    switchAuthForm('login');
    clearAllErrors();
}

function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = event.currentTarget;

    if (field.type === 'password') {
        field.type = 'text';
        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        field.type = 'password';
        button.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

function showAuthContainer() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard(user) {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';

    // Update greeting with user's name
    const firstName = user.name.split(' ')[0];
    const currentHour = new Date().getHours();
    let greeting = 'Hello';

    if (currentHour < 12) {
        greeting = 'Good Morning';
    } else if (currentHour < 18) {
        greeting = 'Good Afternoon';
    } else {
        greeting = 'Good Evening';
    }

    document.getElementById('greeting').textContent = `${greeting} ${firstName}!`;

    // Update current date
    const today = new Date();
    const formattedDate = formatDate(today);
    document.getElementById('current-date').textContent = formattedDate;
}

// ===== VALIDATION FUNCTIONS =====
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}-error`);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => {
        el.classList.remove('show');
        el.textContent = '';
    });
}

function showSuccessMessage(formId, message) {
    const form = document.getElementById(formId);
    let successEl = form.querySelector('.success-message');
    
    if (!successEl) {
        successEl = document.createElement('div');
        successEl.className = 'success-message';
        form.insertBefore(successEl, form.firstChild);
    }
    
    successEl.textContent = message;
    successEl.classList.add('show');
    
    setTimeout(() => {
        successEl.classList.remove('show');
    }, 4000);
}

// ===== UTILITY FUNCTIONS =====
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function simulateEmailVerification(email, code) {
    // In a real application, this would send an email via backend
    console.log(`📧 Verification email sent to ${email}`);
    console.log(`🔐 Verification Code: ${code}`);
    
    // For demonstration purposes, show the code in console
    alert(`For demonstration:\nVerification code: ${code}`);
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// ===== SECURITY FUNCTIONS =====
function hashPassword(password) {
    // Using CryptoJS for client-side hashing
    return CryptoJS.SHA256(password).toString();
}

// Session timeout - logout after 30 minutes of inactivity
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        handleLogout();
    }, 30 * 60 * 1000); // 30 minutes
}

// Reset timer on user activity
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('mousemove', resetInactivityTimer);

// ===== EXPENSE TRACKING SYSTEM =====

let currentExpenses = [];
let currentFilter = 'all';
let currentSort = 'date-desc';

function initializeExpenseTracker() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expense-date').value = today;

    // Setup expense form submission
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleAddExpense);
    }

    // Load existing expenses
    loadExpenses();
    updateDashboardSummary();
}

// ===== ADD EXPENSE =====
function handleAddExpense(e) {
    e.preventDefault();

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Get form values
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const description = document.getElementById('expense-description').value.trim() || 'No description';

    // Create expense object
    const expense = {
        id: generateExpenseId(),
        userId: currentUser.id,
        amount: amount,
        category: category,
        date: date,
        description: description,
        createdAt: new Date().toISOString()
    };

    // Save expense
    saveExpense(expense);

    // Show success message
    showToast('Expense added successfully!', 'success');

    // Reset form
    document.getElementById('expense-form').reset();
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];

    // Reload expenses list
    loadExpenses();
    updateDashboardSummary();
}

// ===== SAVE EXPENSE =====
function saveExpense(expense) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const storageKey = `expenses_${currentUser.id}`;
    
    let expenses = JSON.parse(localStorage.getItem(storageKey)) || [];
    expenses.push(expense);
    localStorage.setItem(storageKey, JSON.stringify(expenses));
}

// ===== LOAD EXPENSES =====
function loadExpenses() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const storageKey = `expenses_${currentUser.id}`;
    currentExpenses = JSON.parse(localStorage.getItem(storageKey)) || [];

    displayExpenses();
}

// ===== DISPLAY EXPENSES =====
function displayExpenses() {
    const expensesList = document.getElementById('expenses-list');
    
    // Filter expenses
    let filteredExpenses = [...currentExpenses];
    
    if (currentFilter !== 'all') {
        filteredExpenses = filteredExpenses.filter(exp => exp.category === currentFilter);
    }

    // Sort expenses
    filteredExpenses.sort((a, b) => {
        switch(currentSort) {
            case 'date-desc':
                return new Date(b.date) - new Date(a.date);
            case 'date-asc':
                return new Date(a.date) - new Date(b.date);
            case 'amount-desc':
                return b.amount - a.amount;
            case 'amount-asc':
                return a.amount - b.amount;
            default:
                return 0;
        }
    });

    // Display expenses
    if (filteredExpenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No expenses found</p>
                <p class="empty-subtitle">${currentFilter !== 'all' ? 'Try changing the filter' : 'Start by adding your first expense above'}</p>
            </div>
        `;
        return;
    }

    expensesList.innerHTML = filteredExpenses.map(expense => `
        <div class="expense-item">
            <div class="expense-info">
                <span class="expense-category-badge category-${expense.category}">
                    ${getCategoryIcon(expense.category)} ${formatCategoryName(expense.category)}
                </span>
                <div class="expense-description">${expense.description}</div>
                <div class="expense-date">
                    <i class="fas fa-calendar-alt"></i> ${formatDisplayDate(expense.date)}
                </div>
            </div>
            <div class="expense-amount-display">Rs ${expense.amount.toFixed(2)}</div>
            <div class="expense-actions">
                <button class="btn-icon" onclick="editExpense('${expense.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" onclick="deleteExpense('${expense.id}')" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// ===== DELETE EXPENSE =====
function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const storageKey = `expenses_${currentUser.id}`;
    
    let expenses = JSON.parse(localStorage.getItem(storageKey)) || [];
    expenses = expenses.filter(exp => exp.id !== expenseId);
    localStorage.setItem(storageKey, JSON.stringify(expenses));

    showToast('Expense deleted successfully!', 'success');
    loadExpenses();
    updateDashboardSummary();
}

// ===== EDIT EXPENSE =====
function editExpense(expenseId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const storageKey = `expenses_${currentUser.id}`;
    
    const expenses = JSON.parse(localStorage.getItem(storageKey)) || [];
    const expense = expenses.find(exp => exp.id === expenseId);

    if (!expense) return;

    // Populate form
    document.getElementById('expense-amount').value = expense.amount;
    document.getElementById('expense-category').value = expense.category;
    document.getElementById('expense-date').value = expense.date;
    document.getElementById('expense-description').value = expense.description;

    // Delete old expense
    deleteExpense(expenseId);

    // Scroll to form
    document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
    showToast('Edit the expense details and click "Add Expense"', 'info');
}

// ===== FILTER EXPENSES =====
function filterExpenses() {
    currentFilter = document.getElementById('filter-category').value;
    currentSort = document.getElementById('sort-by').value;
    displayExpenses();
}

// ===== UPDATE DASHBOARD SUMMARY =====
function updateDashboardSummary() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const storageKey = `expenses_${currentUser.id}`;
    const expenses = JSON.parse(localStorage.getItem(storageKey)) || [];

    // Get current month expenses
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthlyExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const totalExpenses = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Update display (you can later add income tracking)
    document.getElementById('total-expenses').textContent = `Rs ${totalExpenses.toFixed(2)}`;
    
    // For now, set a default income (you'll implement income tracking later)
    const totalIncome = 0; // Will be updated when income tracking is implemented
    document.getElementById('total-income').textContent = `Rs ${totalIncome.toFixed(2)}`;
    
    const balance = totalIncome - totalExpenses;
    document.getElementById('balance').textContent = `Rs ${balance.toFixed(2)}`;

    // Update balance status
    const balanceStatus = document.getElementById('balance-status');
    if (balance > 0) {
        balanceStatus.innerHTML = '<i class="fas fa-check-circle"></i> Healthy';
        balanceStatus.className = 'change positive';
    } else if (balance < 0) {
        balanceStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Deficit';
        balanceStatus.className = 'change negative';
    } else {
        balanceStatus.innerHTML = '<i class="fas fa-minus-circle"></i> Break-even';
        balanceStatus.className = 'change';
    }

    // Calculate expense categories breakdown
    updateCategoryBreakdown(monthlyExpenses);
}

// ===== CATEGORY BREAKDOWN =====
function updateCategoryBreakdown(expenses) {
    const categoryTotals = {};
    
    expenses.forEach(exp => {
        if (!categoryTotals[exp.category]) {
            categoryTotals[exp.category] = 0;
        }
        categoryTotals[exp.category] += exp.amount;
    });

    // You can use this data for charts later
    console.log('Category Breakdown:', categoryTotals);
}

// ===== TOGGLE EXPENSE FORM =====
function toggleExpenseForm() {
    const form = document.getElementById('expense-form');
    const button = event.currentTarget;
    
    if (form.style.display === 'none') {
        form.style.display = 'flex';
        button.classList.remove('active');
    } else {
        form.style.display = 'none';
        button.classList.add('active');
    }
}

// ===== UTILITY FUNCTIONS FOR EXPENSES =====
function generateExpenseId() {
    return 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getCategoryIcon(category) {
    const icons = {
        groceries: '🛒',
        utilities: '💡',
        entertainment: '🎬',
        transportation: '🚗',
        healthcare: '⚕️',
        education: '📚',
        dining: '🍽️',
        shopping: '🛍️',
        rent: '🏠',
        insurance: '🛡️',
        other: '📝'
    };
    return icons[category] || '📝';
}

function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Style toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#10b981' : '#3b82f6',
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: '10000',
        animation: 'slideIn 0.3s ease-out'
    });

    document.body.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
