// PennyPilot App State
let transactions = JSON.parse(localStorage.getItem('pennypilot_transactions')) || [
    { id: '1', title: 'Monthly Salary', amount: 3500.00, type: 'income', category: 'Salary', date: '2026-10-01' },
    { id: '2', title: 'Grocery Shopping', amount: 145.50, type: 'expense', category: 'Food', date: '2026-10-05' },
    { id: '3', title: 'Electricity Bill', amount: 85.00, type: 'expense', category: 'Bills', date: '2026-10-10' },
    { id: '4', title: 'Gas & Transit Pass', amount: 60.00, type: 'expense', category: 'Travel', date: '2026-10-12' },
    { id: '5', title: 'Online Shopping', amount: 120.00, type: 'expense', category: 'Shopping', date: '2026-10-15' }
];

// DOM Elements
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const transactionsListEl = document.getElementById('transactions-list');
const emptyStateEl = document.getElementById('empty-state');

const modalEl = document.getElementById('transaction-modal');
const modalTitleEl = document.getElementById('modal-title');
const formEl = document.getElementById('transaction-form');
const transactionIdInput = document.getElementById('transaction-id');
const titleInput = document.getElementById('title');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');

const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelBtn = document.getElementById('cancel-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const typeFilter = document.getElementById('type-filter');

// Chart Instances
let overviewChart, categoryChart;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today in form
    dateInput.value = new Date().toISOString().split('T')[0];
    
    initCharts();
    updateApp();

    // Event Listeners
    openModalBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    formEl.addEventListener('submit', handleFormSubmit);

    searchInput.addEventListener('input', renderTransactions);
    categoryFilter.addEventListener('change', renderTransactions);
    typeFilter.addEventListener('change', renderTransactions);
    exportCsvBtn.addEventListener('click', exportToCSV);
});

// Update Application Data & UI
function updateApp() {
    saveToLocalStorage();
    renderSummary();
    renderTransactions();
    updateCharts();
}

// Local Storage Helper
function saveToLocalStorage() {
    localStorage.setItem('pennypilot_transactions', JSON.stringify(transactions));
}

// Financial Summaries
function renderSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const balance = income - expenses;

    totalBalanceEl.textContent = `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    totalIncomeEl.textContent = `$${income.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    totalExpensesEl.textContent = `$${expenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

// Render Transactions List
function renderTransactions() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedType = typeFilter.value;

    const filtered = transactions.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchTerm);
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        const matchesType = selectedType === 'all' || t.type === selectedType;
        return matchesSearch && matchesCategory && matchesType;
    });

    transactionsListEl.innerHTML = '';

    if (filtered.length === 0) {
        emptyStateEl.classList.remove('hidden');
    } else {
        emptyStateEl.classList.add('hidden');
        filtered.forEach(t => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-700/30 transition';

            const isIncome = t.type === 'income';
            const amountClass = isIncome ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold';
            const amountPrefix = isIncome ? '+' : '-';

            row.innerHTML = `
                <td class="py-3 px-4 font-medium text-slate-100">${escapeHtml(t.title)}</td>
                <td class="py-3 px-4"><span class="px-2.5 py-1 bg-slate-700/60 rounded-full text-xs font-medium text-slate-300">${t.category}</span></td>
                <td class="py-3 px-4 text-xs text-slate-400">${t.date}</td>
                <td class="py-3 px-4 text-right ${amountClass}">${amountPrefix}$${Number(t.amount).toFixed(2)}</td>
                <td class="py-3 px-4 text-center space-x-2">
                    <button onclick="editTransaction('${t.id}')" class="text-slate-400 hover:text-emerald-400 transition">
                        <i class="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button onclick="deleteTransaction('${t.id}')" class="text-slate-400 hover:text-rose-400 transition">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            transactionsListEl.appendChild(row);
        });
    }
}

// Modal Handlers
function openModal(transaction = null) {
    if (transaction) {
        modalTitleEl.textContent = 'Edit Transaction';
        transactionIdInput.value = transaction.id;
        titleInput.value = transaction.title;
        amountInput.value = transaction.amount;
        typeInput.value = transaction.type;
        categoryInput.value = transaction.category;
        dateInput.value = transaction.date;
    } else {
        modalTitleEl.textContent = 'Add Transaction';
        formEl.reset();
        transactionIdInput.value = '';
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    modalEl.classList.remove('hidden');
}

function closeModal() {
    modalEl.classList.add('hidden');
    formEl.reset();
}

// Submit Transaction Form
function handleFormSubmit(e) {
    e.preventDefault();

    const id = transactionIdInput.value;
    const title = titleInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const type = typeInput.value;
    const category = categoryInput.value;
    const date = dateInput.value;

    if (!title || isNaN(amount) || amount <= 0 || !date) return;

    if (id) {
        // Edit
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index] = { id, title, amount, type, category, date };
        }
    } else {
        // Add
        const newTransaction = {
            id: Date.now().toString(),
            title,
            amount,
            type,
            category,
            date
        };
        transactions.unshift(newTransaction);
    }

    closeModal();
    updateApp();
}

// Delete Transaction
function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        updateApp();
    }
}

// Edit Transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
        openModal(transaction);
    }
}

// Chart.js Configuration & Rendering
function initCharts() {
    const ctxOverview = document.getElementById('overviewChart').getContext('2d');
    overviewChart = new Chart(ctxOverview, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(244, 63, 94, 0.7)'],
                borderColor: ['#22c55e', '#f43f5e'],
                borderWidth: 1.5,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });

    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    categoryChart = new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });
}

function updateCharts() {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    overviewChart.data.datasets[0].data = [income, expenses];
    overviewChart.update();

    // Expense Categories Breakdown
    const expenseMap = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        expenseMap[t.category] = (expenseMap[t.category] || 0) + Number(t.amount);
    });

    categoryChart.data.labels = Object.keys(expenseMap);
    categoryChart.data.datasets[0].data = Object.values(expenseMap);
    categoryChart.update();
}

// Export Transactions to CSV
function exportToCSV() {
    if (transactions.length === 0) {
        alert('No transactions available to export.');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,ID,Title,Amount,Type,Category,Date\n";
    transactions.forEach(t => {
        csvContent += `"${t.id}","${t.title.replace(/"/g, '""')}",${t.amount},${t.type},${t.category},${t.date}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "PennyPilot_Transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Security HTML Escape
function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
