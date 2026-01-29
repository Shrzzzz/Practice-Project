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
    initializeExpenseTracker();
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
        initializeExpenseTracker();
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
let currentIncome = [];
let currentBudgets = [];
let currentFilter = 'all';
let currentSort = 'date-desc';
let currentPage = 1;
let itemsPerPage = 10;
let filteredTransactions = [];

function initializeExpenseTracker() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('expense-date').value = today;
    document.getElementById('income-date').value = today;

    // Setup expense form submission
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleAddExpense);
    }

    // Setup income form submission
    const incomeForm = document.getElementById('income-form');
    if (incomeForm) {
        incomeForm.addEventListener('submit', handleAddIncome);
    }

    // Setup budget form submission
    const budgetForm = document.getElementById('budget-form');
    if (budgetForm) {
        budgetForm.addEventListener('submit', handleSetBudget);
    }

    // Setup date range change
    const dateRangeSelect = document.getElementById('date-range');
    if (dateRangeSelect) {
        dateRangeSelect.addEventListener('change', function() {
            const customRange = document.getElementById('custom-date-range');
            if (this.value === 'custom') {
                customRange.style.display = 'flex';
            } else {
                customRange.style.display = 'none';
                filterTransactions();
            }
        });
    }

    // Load existing data
    loadExpenses();
    loadIncome();
    loadBudgets();
    updateDashboardSummary();
    loadTransactionHistory();
    displayBudgets();
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
    loadTransactionHistory();
    updateBudgetDisplay();
}

// ===== ADD INCOME =====
function handleAddIncome(e) {
    e.preventDefault();

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Get form values
    const amount = parseFloat(document.getElementById('income-amount').value);
    const source = document.getElementById('income-source').value;
    const date = document.getElementById('income-date').value;
    const description = document.getElementById('income-description').value.trim() || 'No description';

    // Create income object
    const income = {
        id: generateIncomeId(),
        userId: currentUser.id,
        amount: amount,
        source: source,
        date: date,
        description: description,
        createdAt: new Date().toISOString()
    };

    // Save income
    saveIncome(income);

    // Show success message
    showToast('Income added successfully!', 'success');

    // Reset form
    document.getElementById('income-form').reset();
    document.getElementById('income-date').value = new Date().toISOString().split('T')[0];

    // Reload data
    loadIncome();
    updateDashboardSummary();
    loadTransactionHistory();
}

// ===== SAVE INCOME =====
function saveIncome(income) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const storageKey = `income_${currentUser.id}`;
    
    let incomeList = JSON.parse(localStorage.getItem(storageKey)) || [];
    incomeList.push(income);
    localStorage.setItem(storageKey, JSON.stringify(incomeList));
}

// ===== LOAD INCOME =====
function loadIncome() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const storageKey = `income_${currentUser.id}`;
    currentIncome = JSON.parse(localStorage.getItem(storageKey)) || [];
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
    loadTransactionHistory();
    updateBudgetDisplay();
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

    // Update display
    // Load income data
    const incomeStorageKey = `income_${currentUser.id}`;
    const incomeList = JSON.parse(localStorage.getItem(incomeStorageKey)) || [];
    
    const monthlyIncome = incomeList.filter(inc => {
        const incDate = new Date(inc.date);
        return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear;
    });

    const totalIncome = monthlyIncome.reduce((sum, inc) => sum + inc.amount, 0);
    
    document.getElementById('total-expenses').textContent = `Rs ${totalExpenses.toFixed(2)}`;
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

// ===== TOGGLE INCOME FORM =====
function toggleIncomeForm() {
    const form = document.getElementById('income-form');
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

function generateIncomeId() {
    return 'inc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

function getSourceIcon(source) {
    const icons = {
        salary: '💼',
        freelance: '💻',
        business: '🏢',
        investment: '📈',
        rental: '🏘️',
        gift: '🎁',
        bonus: '🎉',
        refund: '↩️',
        other: '📝'
    };
    return icons[source] || '📝';
}

function formatSourceName(source) {
    return source.charAt(0).toUpperCase() + source.slice(1);
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

// ===== TRANSACTION HISTORY =====

function loadTransactionHistory() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    // Combine expenses and income into transactions
    const transactions = [];
    
    // Add expenses
    currentExpenses.forEach(exp => {
        transactions.push({
            ...exp,
            type: 'expense',
            categoryOrSource: exp.category
        });
    });

    // Add income
    currentIncome.forEach(inc => {
        transactions.push({
            ...inc,
            type: 'income',
            categoryOrSource: inc.source
        });
    });

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredTransactions = transactions;
    displayTransactionHistory();
}

function displayTransactionHistory() {
    const transactionList = document.getElementById('transaction-list');
    const pagination = document.getElementById('pagination');
    
    if (filteredTransactions.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No transactions found</p>
                <p class="empty-subtitle">Add income or expenses to see your transaction history</p>
            </div>
        `;
        pagination.style.display = 'none';
        updateTransactionStats([], 0, 0);
        return;
    }

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    // Display transactions
    transactionList.innerHTML = paginatedTransactions.map(transaction => {
        const isIncome = transaction.type === 'income';
        const categoryOrSource = isIncome ? transaction.source : transaction.category;
        const icon = isIncome ? getSourceIcon(categoryOrSource) : getCategoryIcon(categoryOrSource);
        const name = isIncome ? formatSourceName(categoryOrSource) : formatCategoryName(categoryOrSource);
        
        return `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-info">
                    <span class="transaction-type-badge ${transaction.type}">
                        ${isIncome ? '⬆️' : '⬇️'} ${transaction.type.toUpperCase()}
                    </span>
                    <div class="transaction-category">
                        <span class="expense-category-badge ${isIncome ? 'source' : 'category'}-${categoryOrSource}">
                            ${icon} ${name}
                        </span>
                    </div>
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-date">
                        <i class="fas fa-calendar-alt"></i> ${formatDisplayDate(transaction.date)}
                    </div>
                </div>
                <div class="transaction-amount-display ${transaction.type}">
                    ${isIncome ? '+' : '-'} Rs ${transaction.amount.toFixed(2)}
                </div>
                <div class="expense-actions">
                    <button class="btn-icon btn-delete" onclick="deleteTransaction('${transaction.id}', '${transaction.type}')" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Update pagination
    if (totalPages > 1) {
        pagination.style.display = 'flex';
        document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prev-btn').disabled = currentPage === 1;
        document.getElementById('next-btn').disabled = currentPage === totalPages;
    } else {
        pagination.style.display = 'none';
    }

    // Calculate and update stats
    const totalIncome = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    updateTransactionStats(filteredTransactions.length, totalIncome, totalExpense);
}

function updateTransactionStats(count, income, expense) {
    document.getElementById('total-transactions').textContent = count;
    document.getElementById('total-income-history').textContent = `Rs ${income.toFixed(2)}`;
    document.getElementById('total-expense-history').textContent = `Rs ${expense.toFixed(2)}`;
    
    const net = income - expense;
    const netElement = document.getElementById('net-amount');
    netElement.textContent = `Rs ${net.toFixed(2)}`;
    netElement.style.color = net >= 0 ? '#10b981' : '#ef4444';
}

function deleteTransaction(id, type) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (type === 'expense') {
        const storageKey = `expenses_${currentUser.id}`;
        let expenses = JSON.parse(localStorage.getItem(storageKey)) || [];
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(expenses));
        loadExpenses();
    } else {
        const storageKey = `income_${currentUser.id}`;
        let income = JSON.parse(localStorage.getItem(storageKey)) || [];
        income = income.filter(inc => inc.id !== id);
        localStorage.setItem(storageKey, JSON.stringify(income));
        loadIncome();
    }

    showToast('Transaction deleted successfully!', 'success');
    updateDashboardSummary();
    loadTransactionHistory();
}

// ===== SEARCH TRANSACTIONS =====
function searchTransactions() {
    const searchTerm = document.getElementById('transaction-search').value.toLowerCase();
    
    if (!searchTerm) {
        filterTransactions();
        return;
    }

    const allTransactions = [];
    
    currentExpenses.forEach(exp => {
        allTransactions.push({
            ...exp,
            type: 'expense',
            categoryOrSource: exp.category
        });
    });

    currentIncome.forEach(inc => {
        allTransactions.push({
            ...inc,
            type: 'income',
            categoryOrSource: inc.source
        });
    });

    filteredTransactions = allTransactions.filter(transaction => {
        return (
            transaction.description.toLowerCase().includes(searchTerm) ||
            transaction.categoryOrSource.toLowerCase().includes(searchTerm) ||
            transaction.amount.toString().includes(searchTerm) ||
            transaction.date.includes(searchTerm)
        );
    });

    currentPage = 1;
    displayTransactionHistory();
}

// ===== FILTER TRANSACTIONS =====
function filterTransactions() {
    const typeFilter = document.getElementById('transaction-type').value;
    const amountFilter = document.getElementById('amount-filter').value;
    const dateRange = document.getElementById('date-range').value;

    let transactions = [];
    
    currentExpenses.forEach(exp => {
        transactions.push({
            ...exp,
            type: 'expense',
            categoryOrSource: exp.category
        });
    });

    currentIncome.forEach(inc => {
        transactions.push({
            ...inc,
            type: 'income',
            categoryOrSource: inc.source
        });
    });

    // Filter by type
    if (typeFilter !== 'all') {
        transactions = transactions.filter(t => t.type === typeFilter);
    }

    // Filter by amount
    if (amountFilter !== 'all') {
        transactions = transactions.filter(t => {
            const amount = t.amount;
            switch(amountFilter) {
                case '0-500':
                    return amount <= 500;
                case '500-1000':
                    return amount > 500 && amount <= 1000;
                case '1000-5000':
                    return amount > 1000 && amount <= 5000;
                case '5000+':
                    return amount > 5000;
                default:
                    return true;
            }
        });
    }

    // Filter by date range
    if (dateRange !== 'all' && dateRange !== 'custom') {
        transactions = filterByDateRange(transactions, dateRange);
    }

    filteredTransactions = transactions;
    currentPage = 1;
    displayTransactionHistory();
}

function filterByDateRange(transactions, range) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        transactionDate.setHours(0, 0, 0, 0);

        switch(range) {
            case 'today':
                return transactionDate.getTime() === today.getTime();
            
            case 'week':
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                return transactionDate >= weekAgo;
            
            case 'month':
                return transactionDate.getMonth() === today.getMonth() &&
                       transactionDate.getFullYear() === today.getFullYear();
            
            case 'quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                const transactionQuarter = Math.floor(transactionDate.getMonth() / 3);
                return transactionQuarter === quarter &&
                       transactionDate.getFullYear() === today.getFullYear();
            
            case 'year':
                return transactionDate.getFullYear() === today.getFullYear();
            
            default:
                return true;
        }
    });
}

function applyCustomDateRange() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;

    if (!dateFrom || !dateTo) {
        showToast('Please select both from and to dates', 'info');
        return;
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);

    if (fromDate > toDate) {
        showToast('From date must be before to date', 'info');
        return;
    }

    let transactions = [];
    
    currentExpenses.forEach(exp => {
        transactions.push({
            ...exp,
            type: 'expense',
            categoryOrSource: exp.category
        });
    });

    currentIncome.forEach(inc => {
        transactions.push({
            ...inc,
            type: 'income',
            categoryOrSource: inc.source
        });
    });

    filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= fromDate && transactionDate <= toDate;
    });

    currentPage = 1;
    displayTransactionHistory();
}

function showTransactionHistory() {
    document.querySelector('.transaction-history-section').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// ===== PAGINATION =====
function nextPage() {
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayTransactionHistory();
        document.querySelector('.transaction-list').scrollIntoView({ behavior: 'smooth' });
    }
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayTransactionHistory();
        document.querySelector('.transaction-list').scrollIntoView({ behavior: 'smooth' });
    }
}

// ===== BUDGET MANAGEMENT SYSTEM =====

// Handle setting a budget
function handleSetBudget(e) {
    e.preventDefault();

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const category = document.getElementById('budget-category').value;
    const amount = parseFloat(document.getElementById('budget-amount').value);

    // Check if budget already exists for this category
    const existingBudgetIndex = currentBudgets.findIndex(b => b.category === category);

    if (existingBudgetIndex !== -1) {
        // Update existing budget
        if (confirm(`A budget already exists for ${formatCategoryName(category)}. Do you want to update it?`)) {
            currentBudgets[existingBudgetIndex].amount = amount;
            currentBudgets[existingBudgetIndex].updatedAt = new Date().toISOString();
            showToast(`Budget for ${formatCategoryName(category)} updated successfully!`, 'success');
        } else {
            return;
        }
    } else {
        // Create new budget
        const budget = {
            id: generateBudgetId(),
            userId: currentUser.id,
            category: category,
            amount: amount,
            createdAt: new Date().toISOString()
        };
        currentBudgets.push(budget);
        showToast(`Budget for ${formatCategoryName(category)} set successfully!`, 'success');
    }

    // Save budgets
    saveBudgets();

    // Reset form
    document.getElementById('budget-form').reset();

    // Update display
    displayBudgets();
}

// Save budgets to localStorage
function saveBudgets() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const storageKey = `budgets_${currentUser.id}`;
    localStorage.setItem(storageKey, JSON.stringify(currentBudgets));
}

// Load budgets from localStorage
function loadBudgets() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    const storageKey = `budgets_${currentUser.id}`;
    currentBudgets = JSON.parse(localStorage.getItem(storageKey)) || [];
}

// Display all budgets with progress bars
function displayBudgets() {
    const budgetCards = document.getElementById('budget-cards');

    if (currentBudgets.length === 0) {
        budgetCards.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-piggy-bank"></i>
                <p>No budgets set yet</p>
                <p class="empty-subtitle">Set monthly budgets for different expense categories above</p>
            </div>
        `;
        return;
    }

    // Get current month expenses for each category
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthlyExpenses = currentExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    // Calculate spending per category
    const categorySpending = {};
    monthlyExpenses.forEach(exp => {
        if (!categorySpending[exp.category]) {
            categorySpending[exp.category] = 0;
        }
        categorySpending[exp.category] += exp.amount;
    });

    // Display budget cards
    budgetCards.innerHTML = currentBudgets.map(budget => {
        const spent = categorySpending[budget.category] || 0;
        const remaining = budget.amount - spent;
        const percentage = Math.min((spent / budget.amount) * 100, 100);
        
        let statusClass = 'safe';
        let statusIcon = 'fa-check-circle';
        let statusText = 'On Track';

        if (percentage >= 100) {
            statusClass = 'exceeded';
            statusIcon = 'fa-exclamation-circle';
            statusText = 'Budget Exceeded';
        } else if (percentage >= 80) {
            statusClass = 'warning';
            statusIcon = 'fa-exclamation-triangle';
            statusText = 'Near Limit';
        }

        return `
            <div class="budget-card ${statusClass}">
                <div class="budget-card-header">
                    <div class="budget-category">
                        <span class="budget-icon">${getCategoryIcon(budget.category)}</span>
                        <h4>${formatCategoryName(budget.category)}</h4>
                    </div>
                    <button class="btn-icon btn-delete" onclick="deleteBudget('${budget.id}')" title="Delete Budget">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
                <div class="budget-amounts">
                    <div class="budget-amount-row">
                        <span class="label">Budget:</span>
                        <span class="value">Rs ${budget.amount.toFixed(2)}</span>
                    </div>
                    <div class="budget-amount-row">
                        <span class="label">Spent:</span>
                        <span class="value spent">Rs ${spent.toFixed(2)}</span>
                    </div>
                    <div class="budget-amount-row">
                        <span class="label">Remaining:</span>
                        <span class="value ${remaining >= 0 ? 'positive' : 'negative'}">
                            Rs ${Math.abs(remaining).toFixed(2)} ${remaining < 0 ? 'over' : ''}
                        </span>
                    </div>
                </div>
                <div class="budget-progress-container">
                    <div class="budget-progress-bar">
                        <div class="budget-progress-fill ${statusClass}" style="width: ${percentage}%">
                            <span class="budget-percentage">${percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
                <div class="budget-status ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    ${statusText}
                </div>
            </div>
        `;
    }).join('');
}

// Delete a budget
function deleteBudget(budgetId) {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    currentBudgets = currentBudgets.filter(b => b.id !== budgetId);
    saveBudgets();
    displayBudgets();
    showToast('Budget deleted successfully!', 'success');
}

// Toggle budget form visibility
function toggleBudgetForm() {
    const form = document.getElementById('budget-form');
    const button = event.currentTarget;
    
    if (form.style.display === 'none') {
        form.style.display = 'flex';
        button.classList.remove('active');
    } else {
        form.style.display = 'none';
        button.classList.add('active');
    }
}

// Generate unique budget ID
function generateBudgetId() {
    return 'budget_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Update displayBudgets when expenses change
function updateBudgetDisplay() {
    displayBudgets();
}
