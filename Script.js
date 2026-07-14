// --- LOCAL STORAGE DATABASE LOGIC ---
const DB_KEY = "expense_tracker_data";

function getExpenses() {
    return JSON.parse(localStorage.getItem(DB_KEY)) || [];
}

function saveToStorage(expenses) {
    localStorage.setItem(DB_KEY, JSON.stringify(expenses));
}

function generateUUID() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

// --- UI LIFECYCLE & STATE ---
document.addEventListener("DOMContentLoaded", () => {
    checkAuth();
    renderApp();
});

function navigate(screenName) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.dock-item').forEach(d => d.classList.remove('active'));
    document.getElementById(`screen-${screenName}`).classList.add('active');
    
    if(screenName === 'home') document.getElementById('dock-home').classList.add('active');
    if(screenName === 'settings') document.getElementById('dock-settings').classList.add('active');
    if(screenName === 'view' || screenName === 'home') renderApp();
}

function toggleTheme() {
    const html = document.documentElement;
    const btn = document.getElementById('theme-btn');
    if (html.getAttribute('data-theme') === 'light') { html.setAttribute('data-theme', 'dark'); btn.innerText = '☀️'; } 
    else { html.setAttribute('data-theme', 'light'); btn.innerText = '🌙'; }
    if (document.getElementById('screen-view').classList.contains('active')) renderApp(); 
}

// --- AUTHENTICATION ---
function checkAuth() {
    const user = localStorage.getItem('userName');
    if (user) {
        document.getElementById('greeting').innerText = `Welcome, ${user}`;
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('profile-section').style.display = 'block';
        document.getElementById('profile-name').innerText = user;
    } else {
        document.getElementById('greeting').innerText = 'Welcome, User';
        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('profile-section').style.display = 'none';
    }
}

function mockLogin(method) {
    let name = prompt(`Entering ${method.toUpperCase()} Mock Login.\nPlease enter your First Name:`);
    if (name && name.trim() !== "") {
        localStorage.setItem('userName', name.trim());
        checkAuth();
    }
}

function logout() {
    localStorage.removeItem('userName');
    checkAuth();
}

function clearAllData() {
    if(confirm("Are you sure you want to delete ALL expense data? This cannot be undone.")) {
        localStorage.removeItem(DB_KEY);
        renderApp();
        alert("Data cleared.");
    }
}

// --- CRUD OPERATIONS ---
function saveExpense() {
    let rawCategory = document.getElementById('category').value;
    const rawAmount = parseFloat(document.getElementById('amount').value);
    const splitCount = parseInt(document.getElementById('split-count').value) || 1;
    const status = document.getElementById('status');
    
    if(!rawCategory || isNaN(rawAmount)) {
        status.innerText = "Please fill valid details!"; status.style.color = "#f27c5e"; return;
    }

    const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
    const finalAmount = rawAmount / splitCount;
    
    const newExpense = {
        id: generateUUID(),
        date: new Date().toISOString().split('T')[0],
        category: category,
        amount: finalAmount
    };

    const expenses = getExpenses();
    expenses.push(newExpense);
    saveToStorage(expenses);
    
    status.innerText = splitCount > 1 ? `Split saved! (₹${finalAmount.toFixed(2)} each)` : "Transaction Saved!";
    status.style.color = "#28a745";
    document.getElementById('category').value = ''; document.getElementById('amount').value = ''; document.getElementById('split-count').value = '1';
    
    renderApp();
}

function deleteExpense(id) {
    if(confirm("Are you sure you want to delete this expense?")) {
        let expenses = getExpenses();
        expenses = expenses.filter(exp => exp.id !== id);
        saveToStorage(expenses);
        renderApp(); 
    }
}

function shareExpense(category, amount, date) {
    const shareText = `I spent ₹${amount} on ${category} on ${date}. Tracked via Expense Tracker App!`;
    if (navigator.share) navigator.share({ title: 'Expense Info', text: shareText }).catch(console.error);
    else { navigator.clipboard.writeText(shareText); alert("Expense details copied to clipboard!"); }
}

// --- DATA PROCESSING & RENDERING ---
function calculateChartData(expenses) {
    const totals = {};
    expenses.forEach(exp => { totals[exp.category] = (totals[exp.category] || 0) + exp.amount; });
    return Object.entries(totals); 
}

function calculateMonthlyData(expenses) {
    const currentMonth = new Date().getMonth();
    const monthsLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let last6Months = [];
    for (let i = 5; i >= 0; i--) {
        let mIndex = (currentMonth - i + 12) % 12; 
        last6Months.push({ month: monthsLabels[mIndex], amount: 0, isCurrent: i === 0, month_idx: mIndex + 1 });
    }

    expenses.forEach(exp => {
        const expMonth = parseInt(exp.date.split('-')[1]);
        const targetMonth = last6Months.find(m => m.month_idx === expMonth);
        if(targetMonth) targetMonth.amount += exp.amount;
    });
    return last6Months;
}

function renderMiniChart(monthlyData, targetId) {
    const container = document.getElementById(targetId);
    if(!container) return;
    container.innerHTML = '';
    const maxAmount = Math.max(...monthlyData.map(d => d.amount), 1); 
    monthlyData.forEach(data => {
        const pxHeight = Math.max(((data.amount / maxAmount) * 50), 4);
        const activeClass = data.isCurrent ? 'active' : '';
        container.innerHTML += `
            <div class="bar-wrapper" title="₹${data.amount.toFixed(2)}">
                <div class="bar ${activeClass}" style="height: ${pxHeight}px;"></div>
                <span class="month-label">${data.month}</span>
            </div>`;
    });
}

function renderApp() {
    const expenses = getExpenses();
    let total = 0;
    const list = document.getElementById('expense-list');
    list.innerHTML = ''; 

    if (expenses.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No expenses yet.</p>';
        document.getElementById('chart-container').innerHTML = '';
    } else {
        [...expenses].reverse().forEach(expense => {
            total += expense.amount;
            let icon = "🏷️";
            if(expense.category.toLowerCase().includes('food')) icon = "🍔";
            if(expense.category.toLowerCase().includes('apple')) icon = "📱";
            if(expense.category.toLowerCase().includes('uber') || expense.category.toLowerCase().includes('travel')) icon = "🚗";

            list.innerHTML += `
                <div class="transaction-item">
                    <div class="tx-left">
                        <div class="tx-icon">${icon}</div>
                        <div class="tx-details">
                            <h4>${expense.category}</h4>
                            <p>${expense.date}</p>
                        </div>
                    </div>
                    <div class="tx-amount">
                        <h4>-₹${expense.amount.toFixed(2)}</h4>
                        <div class="crud-actions">
                            <button class="crud-btn share" onclick="shareExpense('${expense.category}', '${expense.amount.toFixed(2)}', '${expense.date}')">Share</button>
                            <button class="crud-btn delete" onclick="deleteExpense('${expense.id}')">Del</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        const chartData = calculateChartData(expenses);
        if (chartData.length > 0) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? '#f0f0f0' : '#1a1a1a';
            const selectedChart = document.getElementById('chart-type').value; 
            
            let chartOptions = { chart: { type: selectedChart, backgroundColor: 'transparent', options3d: { enabled: true, alpha: 15, beta: 15, depth: 50, viewDistance: 25 } }, title: { text: null }, colors: ['#3a224a', '#f27c5e', '#a69cac', '#845ec2', '#d6c5e2'], credits: { enabled: false } };
            if (selectedChart === 'pie') {
                chartOptions.chart.options3d = { enabled: true, alpha: 45, beta: 0 };
                chartOptions.tooltip = { pointFormat: '{series.name}: <b>₹{point.y}</b>' };
                chartOptions.plotOptions = { pie: { allowPointSelect: true, depth: 35, dataLabels: { enabled: true, format: '{point.name}', style: { color: textColor, textOutline: 'none' } } } };
                chartOptions.series = [{ type: 'pie', name: 'Total Spent', data: chartData }];
            } else {
                chartOptions.xAxis = { type: 'category', labels: { style: { color: textColor } } };
                chartOptions.yAxis = { title: { text: null }, labels: { style: { color: textColor } } };
                chartOptions.legend = { enabled: false };
                chartOptions.tooltip = { pointFormat: 'Spent: <b>₹{point.y}</b>' };
                chartOptions.plotOptions = { column: { depth: 25, borderRadius: 12, colorByPoint: true } };
                chartOptions.series = [{ type: 'column', name: 'Amount', data: chartData }];
            }
            Highcharts.chart('chart-container', chartOptions);
        }
    }
    
    document.getElementById('total-amount').innerText = `₹${total.toFixed(2)}`;
    const monthlyData = calculateMonthlyData(expenses);
    renderMiniChart(monthlyData, 'home-mini-chart');
}