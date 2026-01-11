// ===== Navigation & Modal =====
const Navigation = {
    init() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
                // Close mobile menu
                document.querySelector('.sidebar').classList.remove('mobile-open');
            });
        });

        // Mobile menu toggle
        const menuToggle = document.getElementById('mobileMenuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('mobile-open');
            });
        }
    },

    switchTab(tabId) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabId);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabId);
        });

        this.refreshTab(tabId);
    },

    refreshTab(tabId) {
        switch(tabId) {
            case 'dashboard': Dashboard.refresh(); break;
            case 'orders': Orders.refresh(); break;
            case 'inventory': Inventory.refresh(); break;
            case 'combos': Combos.refresh(); break;
            case 'recipes': Recipes.refresh(); break;
            case 'customers': Customers.refresh(); break;
            case 'finance': Finance.refresh(); break;
            case 'labels': Labels.refresh(); break;
            case 'history': History.refresh(); break;
            case 'grocery': Grocery.refresh(); break;
        }
    }
};

const Modal = {
    open(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    close(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    init() {
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('active');
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }
};

// ===== Dashboard Module =====
const Dashboard = {
    TIMEZONE: 'America/Chicago', // Texas CST
    
    async refresh() {
        this.updateStats();
        this.updateSummaryCards();
        this.renderPopularItems();
        this.renderUpcomingDeliveries();
        this.renderStockAlerts();
        this.renderRecentCustomers();
    },

    // Get today's date string in Texas CST
    getTodayCST() {
        return new Date().toLocaleDateString('en-US', { timeZone: this.TIMEZONE });
    },
    
    // Convert any date to Texas CST date string for comparison
    toTexasDateString(dateStr) {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isNaN(date)) return null;
        return date.toLocaleDateString('en-US', { timeZone: this.TIMEZONE });
    },
    
    // Get date ranges in CST
    getDateRanges() {
        // Get current Texas time
        const nowStr = new Date().toLocaleString('en-US', { timeZone: this.TIMEZONE });
        const now = new Date(nowStr);
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return { today, weekStart, monthStart, now };
    },

    // Check if a date string falls on a specific day (in CST)
    isOnDate(dateStr, targetDate) {
        const dateCST = this.toTexasDateString(dateStr);
        const targetCST = targetDate.toLocaleDateString('en-US', { timeZone: this.TIMEZONE });
        return dateCST === targetCST;
    },
    
    // Check if date is in range (CST)
    isInRange(dateStr, startDate, endDate) {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        if (isNaN(date)) return false;
        return date >= startDate && date <= endDate;
    },

    // Calculate income for a date range - from order history (completed orders)
    getIncome(startDate, endDate = null) {
        return DataStore.orderHistory
            .filter(o => {
                const deliveredDate = o.delivered_at || o.deliveredAt || o.created_at || o.createdAt;
                if (!deliveredDate) return false;
                if (endDate) {
                    return this.isInRange(deliveredDate, startDate, endDate);
                }
                return this.isOnDate(deliveredDate, startDate);
            })
            .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    },

    // Calculate expenses for a date range (transactions + grocery)
    getExpenses(startDate, endDate = null) {
        // Transaction expenses
        const transExpenses = (DataStore.transactions || [])
            .filter(t => {
                if (t.type !== 'expense') return false;
                const transDate = t.date || t.created_at || t.createdAt;
                if (!transDate) return false;
                if (endDate) {
                    return this.isInRange(transDate, startDate, endDate);
                }
                return this.isOnDate(transDate, startDate);
            })
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        // Grocery expenses - THIS IS THE MAIN EXPENSE SOURCE
        const groceryExpenses = (DataStore.grocery || [])
            .filter(g => {
                const purchaseDate = g.purchase_date || g.purchaseDate;
                if (!purchaseDate) return false;
                if (endDate) {
                    return this.isInRange(purchaseDate, startDate, endDate);
                }
                return this.isOnDate(purchaseDate, startDate);
            })
            .reduce((sum, g) => sum + (parseFloat(g.cost) || 0), 0);
        
        return transExpenses + groceryExpenses;
    },
    
    // Get all-time totals (no date filtering)
    getAllTimeIncome() {
        return DataStore.orderHistory.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    },
    
    getAllTimeExpenses() {
        const transExpenses = (DataStore.transactions || [])
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        const groceryExpenses = (DataStore.grocery || [])
            .reduce((sum, g) => sum + (parseFloat(g.cost) || 0), 0);
        
        return transExpenses + groceryExpenses;
    },

    // Update the quick summary cards (weekly, monthly, all-time)
    updateSummaryCards() {
        const { today, weekStart, monthStart, now } = this.getDateRanges();
        
        // Weekly
        const weeklyIncome = this.getIncome(weekStart, now);
        const weeklyExpense = this.getExpenses(weekStart, now);
        const weeklyProfit = weeklyIncome - weeklyExpense;
        
        document.getElementById('weeklyIncome').textContent = Utils.formatCurrency(weeklyIncome);
        document.getElementById('weeklyExpense').textContent = Utils.formatCurrency(weeklyExpense);
        const weeklyProfitEl = document.getElementById('weeklyProfit');
        weeklyProfitEl.textContent = Utils.formatCurrency(weeklyProfit);
        weeklyProfitEl.parentElement.className = `summary-profit ${weeklyProfit >= 0 ? 'positive' : 'negative'}`;
        
        // Monthly
        const monthlyIncome = this.getIncome(monthStart, now);
        const monthlyExpense = this.getExpenses(monthStart, now);
        const monthlyProfit = monthlyIncome - monthlyExpense;
        
        document.getElementById('monthlyIncome').textContent = Utils.formatCurrency(monthlyIncome);
        document.getElementById('monthlyExpense').textContent = Utils.formatCurrency(monthlyExpense);
        const monthlyProfitEl = document.getElementById('monthlyProfit');
        monthlyProfitEl.textContent = Utils.formatCurrency(monthlyProfit);
        monthlyProfitEl.parentElement.className = `summary-profit ${monthlyProfit >= 0 ? 'positive' : 'negative'}`;
        
        // All Time
        const allTimeIncome = this.getAllTimeIncome();
        const allTimeExpense = this.getAllTimeExpenses();
        const allTimeProfit = allTimeIncome - allTimeExpense;
        
        document.getElementById('allTimeIncome').textContent = Utils.formatCurrency(allTimeIncome);
        document.getElementById('allTimeExpense').textContent = Utils.formatCurrency(allTimeExpense);
        const allTimeProfitEl = document.getElementById('allTimeProfit');
        allTimeProfitEl.textContent = Utils.formatCurrency(allTimeProfit);
        allTimeProfitEl.parentElement.className = `summary-profit ${allTimeProfit >= 0 ? 'positive' : 'negative'}`;
    },

    updateStats() {
        const todayCST = this.getTodayCST();
        const { today } = this.getDateRanges();
        
        // Today's Orders = Orders created today (both active and completed) - CST
        const todayActiveOrders = DataStore.orders.filter(o => {
            const createdDate = o.created_at || o.createdAt;
            return this.toTexasDateString(createdDate) === todayCST;
        });
        
        const todayCompletedOrders = DataStore.orderHistory.filter(o => {
            const createdDate = o.created_at || o.createdAt;
            return this.toTexasDateString(createdDate) === todayCST;
        });
        
        const totalTodayOrders = todayActiveOrders.length + todayCompletedOrders.length;
        document.getElementById('todayOrders').textContent = totalTodayOrders;

        // Pending = All orders not yet delivered (from active orders)
        const pendingOrders = DataStore.orders.filter(o => 
            o.status !== 'delivered' && o.status !== 'completed'
        );
        document.getElementById('pendingOrders').textContent = pendingOrders.length;
        const pendingBadge = document.getElementById('pendingOrdersBadge');
        if (pendingBadge) pendingBadge.textContent = pendingOrders.length;
        
        // Completed Orders = Total from history (never deleted)
        const completedEl = document.getElementById('completedOrders');
        if (completedEl) completedEl.textContent = DataStore.orderHistory.length;

        // Today's Income = Completed orders delivered TODAY in CST
        const todayIncome = this.getIncome(today);
        document.getElementById('todayRevenue').textContent = Utils.formatCurrency(todayIncome);

        // Today's Expenses = Grocery purchases + Finance transactions for today (CST)
        const todayExpenses = this.getExpenses(today);
        document.getElementById('todayExpenses').textContent = Utils.formatCurrency(todayExpenses);

        // Today's Profit = Income - Expenses
        const todayProfit = todayIncome - todayExpenses;
        const profitEl = document.getElementById('todayProfit');
        profitEl.textContent = Utils.formatCurrency(todayProfit);
        profitEl.className = `stat-value ${todayProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;

        // Low Stock = Inventory items + Grocery items below threshold
        const lowStockThreshold = DataStore.settings?.lowStockThreshold || 5;
        const lowStockInventory = (DataStore.inventory || []).filter(i => 
            (parseFloat(i.stock) || 0) <= lowStockThreshold
        );
        
        const lowStockGrocery = (DataStore.grocery || []).filter(g => 
            (parseFloat(g.quantity) || 0) <= lowStockThreshold
        );
        
        const totalLowStock = lowStockInventory.length + lowStockGrocery.length;
        document.getElementById('lowStockCount').textContent = totalLowStock;
    },

    renderPopularItems() {
        const container = document.getElementById('popularItems');
        if (!container) return;
        
        // Collect item sales from both active orders and history
        const itemSales = {};
        [...(DataStore.orders || []), ...(DataStore.orderHistory || [])].forEach(order => {
            (order.items || []).forEach(item => {
                const name = item.name || item.item_name || 'Unknown';
                itemSales[name] = (itemSales[name] || 0) + (parseInt(item.quantity) || 1);
            });
        });

        const sorted = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No sales data yet</p></div>`;
            return;
        }

        container.innerHTML = sorted.map((item, index) => {
            const invItem = (DataStore.inventory || []).find(i => i.name === item[0]);
            return `
                <div class="popular-item">
                    <div class="popular-item-info">
                        <span class="popular-item-rank">${index + 1}</span>
                        <div>
                            <div class="popular-item-name">${item[0]}</div>
                            <div class="popular-item-category">${invItem?.category || 'Combo/Custom'}</div>
                        </div>
                    </div>
                    <span class="popular-item-sales">${item[1]} sold</span>
                </div>
            `;
        }).join('');
    },

    renderUpcomingDeliveries() {
        const container = document.getElementById('upcomingDeliveries');
        if (!container) return;
        
        const upcoming = (DataStore.orders || [])
            .filter(o => o.deadline && o.status !== 'delivered' && o.status !== 'completed')
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><p>No upcoming deliveries</p></div>`;
            return;
        }

        container.innerHTML = upcoming.map(order => {
            const daysLeft = Utils.daysUntil ? Utils.daysUntil(order.deadline) : 0;
            return `
                <div class="delivery-item ${daysLeft <= 1 ? 'urgent' : ''}">
                    <div class="delivery-info">
                        <span class="delivery-customer">${order.customer_name || order.customerName || 'Unknown'}</span>
                        <span class="delivery-date">${Utils.formatDate(order.deadline)}</span>
                    </div>
                    <span class="delivery-badge ${daysLeft <= 0 ? 'overdue' : daysLeft <= 1 ? 'today' : ''}">${daysLeft <= 0 ? 'Overdue' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}</span>
                </div>
            `;
        }).join('');
    },

    renderStockAlerts() {
        const container = document.getElementById('stockAlerts');
        if (!container) return;
        
        const threshold = DataStore.settings?.lowStockThreshold || 5;
        const lowStock = (DataStore.inventory || [])
            .filter(i => (parseFloat(i.stock) || 0) <= threshold)
            .sort((a, b) => (a.stock || 0) - (b.stock || 0))
            .slice(0, 5);

        if (lowStock.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>All items well stocked</p></div>`;
            return;
        }

        container.innerHTML = lowStock.map(item => `
            <div class="stock-alert-item ${item.stock === 0 ? 'out-of-stock' : ''}">
                <div class="stock-item-info">
                    <span class="stock-item-name">${item.name}</span>
                    <span class="stock-item-qty">${item.stock || 0} ${item.unit || 'units'}</span>
                </div>
                <span class="stock-badge ${item.stock === 0 ? 'out' : 'low'}">${item.stock === 0 ? 'Out of Stock' : 'Low Stock'}</span>
            </div>
        `).join('');
    },

    renderRecentCustomers() {
        const container = document.getElementById('recentCustomers');
        if (!container) return;
        
        // Build customer stats from order history
        const customerStats = {};
        (DataStore.orderHistory || []).forEach(order => {
            const name = order.customer_name || order.customerName || 'Unknown';
            if (!customerStats[name]) {
                customerStats[name] = { name, orders: 0, spent: 0, lastOrder: null, phone: order.customer_phone || order.customerPhone };
            }
            customerStats[name].orders++;
            customerStats[name].spent += parseFloat(order.total) || 0;
            const orderDate = order.delivered_at || order.deliveredAt || order.created_at || order.createdAt;
            if (!customerStats[name].lastOrder || new Date(orderDate) > new Date(customerStats[name].lastOrder)) {
                customerStats[name].lastOrder = orderDate;
            }
        });
        
        const sorted = Object.values(customerStats)
            .sort((a, b) => new Date(b.lastOrder || 0) - new Date(a.lastOrder || 0))
            .slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>No customers yet</p></div>`;
            return;
        }

        container.innerHTML = sorted.map(customer => `
            <div class="recent-customer">
                <div class="customer-avatar">${Utils.getInitials ? Utils.getInitials(customer.name) : customer.name.charAt(0)}</div>
                <div class="customer-info">
                    <span class="customer-name">${customer.name}</span>
                    <span class="customer-orders">${customer.orders} orders</span>
                </div>
                <span class="customer-spent">${Utils.formatCurrency(customer.spent)}</span>
            </div>
        `).join('');
    },

    // ===== MODAL BREAKDOWNS =====
    
    showOrdersBreakdown() {
        const { today, weekStart, monthStart, now } = this.getDateRanges();
        const todayCST = this.getTodayCST();
        
        // Calculate orders by period
        const todayOrders = [...(DataStore.orders || []), ...(DataStore.orderHistory || [])].filter(o => {
            const date = o.created_at || o.createdAt;
            return this.toTexasDateString(date) === todayCST;
        });
        
        const weekOrders = [...(DataStore.orders || []), ...(DataStore.orderHistory || [])].filter(o => {
            const date = o.created_at || o.createdAt;
            return this.isInRange(date, weekStart, now);
        });
        
        const monthOrders = [...(DataStore.orders || []), ...(DataStore.orderHistory || [])].filter(o => {
            const date = o.created_at || o.createdAt;
            return this.isInRange(date, monthStart, now);
        });
        
        const totalOrders = (DataStore.orders || []).length + (DataStore.orderHistory || []).length;
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header">
                    <h3><i class="fas fa-shopping-bag"></i> Orders Summary (CST)</h3>
                    <button class="modal-close" onclick="Modal.close('breakdownModal')">&times;</button>
                </div>
                <div class="breakdown-body">
                    <div class="breakdown-grid">
                        <div class="breakdown-card today">
                            <div class="breakdown-value">${todayOrders.length}</div>
                            <div class="breakdown-label">Today</div>
                        </div>
                        <div class="breakdown-card week">
                            <div class="breakdown-value">${weekOrders.length}</div>
                            <div class="breakdown-label">This Week</div>
                        </div>
                        <div class="breakdown-card month">
                            <div class="breakdown-value">${monthOrders.length}</div>
                            <div class="breakdown-label">This Month</div>
                        </div>
                        <div class="breakdown-card alltime">
                            <div class="breakdown-value">${totalOrders}</div>
                            <div class="breakdown-label">All Time</div>
                        </div>
                    </div>
                    <div class="breakdown-details">
                        <h4>Today's Orders (${todayOrders.length})</h4>
                        ${todayOrders.length === 0 ? '<p class="no-data">No orders today</p>' : `
                            <div class="breakdown-list">
                                ${todayOrders.slice(0, 5).map(o => `
                                    <div class="breakdown-item">
                                        <span>${o.customer_name || o.customerName || 'Unknown'}</span>
                                        <span>${Utils.formatCurrency(o.total)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        this.showBreakdownModal(html);
    },

    showPendingOrders() {
        const pending = (DataStore.orders || []).filter(o => o.status !== 'delivered' && o.status !== 'completed');
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header">
                    <h3><i class="fas fa-clock"></i> Pending Orders (${pending.length})</h3>
                    <button class="modal-close" onclick="Modal.close('breakdownModal')">&times;</button>
                </div>
                <div class="breakdown-body">
                    ${pending.length === 0 ? '<p class="no-data">No pending orders! 🎉</p>' : `
                        <div class="breakdown-list full">
                            ${pending.map(o => {
                                const daysLeft = Utils.daysUntil ? Utils.daysUntil(o.deadline) : 0;
                                const urgency = daysLeft <= 0 ? 'overdue' : daysLeft <= 1 ? 'urgent' : '';
                                return `
                                    <div class="breakdown-item ${urgency}">
                                        <div class="order-info">
                                            <strong>${o.customer_name || o.customerName || 'Unknown'}</strong>
                                            <span class="order-items">${(o.items || []).map(i => i.name).join(', ')}</span>
                                        </div>
                                        <div class="order-meta">
                                            <span class="order-total">${Utils.formatCurrency(o.total)}</span>
                                            <span class="order-deadline ${urgency}">${daysLeft <= 0 ? 'Overdue!' : daysLeft === 1 ? 'Tomorrow' : Utils.formatDate(o.deadline)}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        
        this.showBreakdownModal(html);
    },
    
    showCompletedOrders() {
        const history = (DataStore.orderHistory || [])
            .sort((a, b) => new Date(b.delivered_at || b.deliveredAt || b.created_at) - new Date(a.delivered_at || a.deliveredAt || a.created_at));
        
        const totalRevenue = history.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        
        const html = `
            <div class="breakdown-modal wide">
                <div class="breakdown-header" style="background: linear-gradient(135deg, #2E7D32, #43a047);">
                    <h3><i class="fas fa-check-circle"></i> Completed Orders History (${history.length})</h3>
                    <button class="modal-close" onclick="Modal.close('breakdownModal')">&times;</button>
                </div>
                <div class="breakdown-body">
                    <div class="breakdown-grid">
                        <div class="breakdown-card" style="border-bottom: 3px solid #2E7D32;">
                            <div class="breakdown-value">${history.length}</div>
                            <div class="breakdown-label">Total Orders</div>
                        </div>
                        <div class="breakdown-card" style="border-bottom: 3px solid #43e97b;">
                            <div class="breakdown-value">${Utils.formatCurrency(totalRevenue)}</div>
                            <div class="breakdown-label">Total Revenue</div>
                        </div>
                        <div class="breakdown-card" style="border-bottom: 3px solid #4facfe;">
                            <div class="breakdown-value">${Utils.formatCurrency(totalRevenue / (history.length || 1))}</div>
                            <div class="breakdown-label">Avg Order Value</div>
                        </div>
                    </div>
                    
                    <h4><i class="fas fa-history"></i> Order History (Never Deleted)</h4>
                    <div class="breakdown-list full" style="max-height: 400px;">
                        ${history.length === 0 ? '<p class="no-data">No completed orders yet</p>' : 
                            history.map(o => `
                                <div class="breakdown-item">
                                    <div class="order-info">
                                        <strong>${o.customer_name || o.customerName || 'Unknown'}</strong>
                                        <span class="order-items">${(o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ')}</span>
                                        <small style="color: var(--text-muted);">${Utils.formatDate(o.delivered_at || o.deliveredAt || o.created_at)}</small>
                                    </div>
                                    <div class="order-meta">
                                        <span class="income-amount">+${Utils.formatCurrency(o.total)}</span>
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        `;
        
        this.showBreakdownModal(html);
    },

    showIncomeBreakdown() {
        const { today, weekStart, monthStart } = this.getDateRanges();
        
        const todayIncome = this.getIncome(today);
        const weekIncome = this.getIncome(weekStart);
        const monthIncome = this.getIncome(monthStart);
        const allTimeIncome = this.getAllTimeIncome();
        
        // Get daily breakdown for past 7 days using CST
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = this.toTexasDateString(date);
            const income = this.getIncome(date);
            dailyData.push({
                date: date.toLocaleDateString('en-US', { timeZone: this.TIMEZONE, weekday: 'short', month: 'short', day: 'numeric' }),
                amount: income
            });
        }
        
        // Recent delivered orders
        const recentOrders = (DataStore.orderHistory || [])
            .sort((a, b) => new Date(b.delivered_at || b.deliveredAt || b.created_at) - new Date(a.delivered_at || a.deliveredAt || a.created_at))
            .slice(0, 10);
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header income">
                    <h3><i class="fas fa-arrow-down"></i> Income Breakdown (CST)</h3>
                    <button class="modal-close" onclick="Modal.close('breakdownModal')">&times;</button>
                </div>
                <div class="breakdown-body">
                    <div class="breakdown-grid">
                        <div class="breakdown-card today income">
                            <div class="breakdown-value">${Utils.formatCurrency(todayIncome)}</div>
                            <div class="breakdown-label">Today</div>
                        </div>
                        <div class="breakdown-card week income">
                            <div class="breakdown-value">${Utils.formatCurrency(weekIncome)}</div>
                            <div class="breakdown-label">This Week</div>
                        </div>
                        <div class="breakdown-card month income">
                            <div class="breakdown-value">${Utils.formatCurrency(monthIncome)}</div>
                            <div class="breakdown-label">This Month</div>
                        </div>
                        <div class="breakdown-card alltime income">
                            <div class="breakdown-value">${Utils.formatCurrency(allTimeIncome)}</div>
                            <div class="breakdown-label">All Time</div>
                        </div>
                    </div>
                    
                    <h4><i class="fas fa-calendar-week"></i> Last 7 Days</h4>
                    <div class="daily-breakdown">
                        ${dailyData.map(d => `
                            <div class="daily-item">
                                <span class="daily-date">${d.date}</span>
                                <span class="daily-amount income">${Utils.formatCurrency(d.amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <h4><i class="fas fa-history"></i> Recent Income (Last 10)</h4>
                    <div class="breakdown-list">
                        ${recentOrders.length === 0 ? '<p class="no-data">No income recorded yet</p>' : 
                            recentOrders.map(o => `
                                <div class="breakdown-item">
                                    <div>
                                        <strong>${o.customer_name || o.customerName || 'Customer'}</strong>
                                        <small>${Utils.formatDate(o.delivered_at || o.deliveredAt || o.created_at)}</small>
                                    </div>
                                    <span class="income-amount">+${Utils.formatCurrency(o.total)}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        `;
        
        this.showBreakdownModal(html);
    },

    showExpensesBreakdown() {
        const { today, weekStart, monthStart } = this.getDateRanges();
        const now = new Date();
        
        const todayExpenses = this.getExpenses(today);
        const weekExpenses = this.getExpenses(weekStart);
        const monthExpenses = this.getExpenses(monthStart);
        const allTimeExpenses = this.getAllTimeExpenses();
        
        // Get daily breakdown for past 7 days using CST
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const expense = this.getExpenses(date);
            dailyData.push({
                date: date.toLocaleDateString('en-US', { timeZone: this.TIMEZONE, weekday: 'short', month: 'short', day: 'numeric' }),
                amount: expense
            });
        }
        
        // Recent expenses from transactions
        const recentExpenses = (DataStore.transactions || [])
            .filter(t => t.type === 'expense')
            .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
            .slice(0, 5);
        
        // Recent grocery purchases
        const recentGrocery = (DataStore.grocery || [])
            .sort((a, b) => new Date(b.purchase_date || b.purchaseDate || b.created_at) - new Date(a.purchase_date || a.purchaseDate || a.created_at))
            .slice(0, 5);
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header expense">
                    <h3><i class="fas fa-arrow-up"></i> Expenses Breakdown (CST)</h3>
                    <button class="modal-close" onclick="Modal.close('breakdownModal')">&times;</button>
                </div>
                <div class="breakdown-body">
                    <div class="breakdown-grid">
                        <div class="breakdown-card today expense">
                            <div class="breakdown-value">${Utils.formatCurrency(todayExpenses)}</div>
                            <div class="breakdown-label">Today</div>
                        </div>
                        <div class="breakdown-card week expense">
                            <div class="breakdown-value">${Utils.formatCurrency(weekExpenses)}</div>
                            <div class="breakdown-label">This Week</div>
                        </div>
                        <div class="breakdown-card month expense">
                            <div class="breakdown-value">${Utils.formatCurrency(monthExpenses)}</div>
                            <div class="breakdown-label">This Month</div>
                        </div>
                        <div class="breakdown-card alltime expense">
                            <div class="breakdown-value">${Utils.formatCurrency(allTimeExpenses)}</div>
                            <div class="breakdown-label">All Time</div>
                        </div>
                    </div>
                    
                    <h4><i class="fas fa-calendar-week"></i> Last 7 Days</h4>
                    <div class="daily-breakdown">
                        ${dailyData.map(d => `
                            <div class="daily-item">
                                <span class="daily-date">${d.date}</span>
                                <span class="daily-amount expense">${Utils.formatCurrency(d.amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="expense-sources">
                        <div class="expense-source">
                            <h4><i class="fas fa-receipt"></i> Recent Transactions</h4>
                            <div class="breakdown-list">
                                ${recentExpenses.length === 0 ? '<p class="no-data">No transactions</p>' : 
                                    recentExpenses.map(t => `
                                        <div class="breakdown-item">
                                            <div>
                                                <strong>${t.category || 'Expense'}</strong>
                                                <small>${t.description || ''} - ${Utils.formatDate(t.date)}</small>
                                            </div>
                                            <span class="expense-amount">-${Utils.formatCurrency(t.amount)}</span>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                        <div class="expense-source">
                            <h4><i class="fas fa-shopping-basket"></i> Recent Grocery</h4>
                            <div class="breakdown-list">
                                ${recentGrocery.length === 0 ? '<p class="no-data">No grocery purchases</p>' : 
                                    recentGrocery.map(g => `
                                        <div class="breakdown-item">
                                            <div>
                                                <strong>${g.item_name}</strong>
                                                <small>${g.supplier || ''} - ${Utils.formatDate(g.purchase_date)}</small>
                                            </div>
                                            <span class="expense-amount">-${Utils.formatCurrency(g.cost)}</span>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showBreakdownModal(html);
    },

    showProfitBreakdown() {
        const { today, weekStart, monthStart } = this.getDateRanges();
        
        const todayIncome = this.getIncome(today);
        const todayExpenses = this.getExpenses(today);
        const todayProfit = todayIncome - todayExpenses;
        
        const weekIncome = this.getIncome(weekStart);
        const weekExpenses = this.getExpenses(weekStart);
        const weekProfit = weekIncome - weekExpenses;
        
        const monthIncome = this.getIncome(monthStart);
        const monthExpenses = this.getExpenses(monthStart);
        const monthProfit = monthIncome - monthExpenses;
        
        const allTimeIncome = this.getAllTimeIncome();
        const allTimeExpenses = this.getAllTimeExpenses();
        const allTimeProfit = allTimeIncome - allTimeExpenses;
        
        // Profit margin calculation
        const profitMargin = allTimeIncome > 0 ? ((allTimeProfit / allTimeIncome) * 100).toFixed(1) : 0;
        
        // Daily profit for last 7 days using CST
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const income = this.getIncome(date);
            const expense = this.getExpenses(date);
            dailyData.push({
                date: date.toLocaleDateString('en-US', { timeZone: this.TIMEZONE, weekday: 'short', month: 'short', day: 'numeric' }),
                income,
                expense,
                profit: income - expense
            });
        }
        
        const html = `
            <div class="breakdown-modal wide">
                <div class="breakdown-header profit">
                    <h3><i class="fas fa-chart-line"></i> Profit & Loss Summary (CST)</h3>
                    <button class="modal-close" onclick="Modal.close('breakdownModal')">&times;</button>
                </div>
                <div class="breakdown-body">
                    <div class="profit-summary-grid">
                        <div class="profit-period">
                            <h4>Today</h4>
                            <div class="profit-details">
                                <div class="profit-row income"><span>Income:</span> <span>${Utils.formatCurrency(todayIncome)}</span></div>
                                <div class="profit-row expense"><span>Expenses:</span> <span>${Utils.formatCurrency(todayExpenses)}</span></div>
                                <div class="profit-row profit ${todayProfit >= 0 ? 'positive' : 'negative'}">
                                    <span>${todayProfit >= 0 ? 'Profit:' : 'Loss:'}</span> 
                                    <span>${Utils.formatCurrency(Math.abs(todayProfit))}</span>
                                </div>
                            </div>
                        </div>
                        <div class="profit-period">
                            <h4>This Week</h4>
                            <div class="profit-details">
                                <div class="profit-row income"><span>Income:</span> <span>${Utils.formatCurrency(weekIncome)}</span></div>
                                <div class="profit-row expense"><span>Expenses:</span> <span>${Utils.formatCurrency(weekExpenses)}</span></div>
                                <div class="profit-row profit ${weekProfit >= 0 ? 'positive' : 'negative'}">
                                    <span>${weekProfit >= 0 ? 'Profit:' : 'Loss:'}</span> 
                                    <span>${Utils.formatCurrency(Math.abs(weekProfit))}</span>
                                </div>
                            </div>
                        </div>
                        <div class="profit-period">
                            <h4>This Month</h4>
                            <div class="profit-details">
                                <div class="profit-row income"><span>Income:</span> <span>${Utils.formatCurrency(monthIncome)}</span></div>
                                <div class="profit-row expense"><span>Expenses:</span> <span>${Utils.formatCurrency(monthExpenses)}</span></div>
                                <div class="profit-row profit ${monthProfit >= 0 ? 'positive' : 'negative'}">
                                    <span>${monthProfit >= 0 ? 'Profit:' : 'Loss:'}</span> 
                                    <span>${Utils.formatCurrency(Math.abs(monthProfit))}</span>
                                </div>
                            </div>
                        </div>
                        <div class="profit-period highlight">
                            <h4>All Time</h4>
                            <div class="profit-details">
                                <div class="profit-row income"><span>Total Income:</span> <span>${Utils.formatCurrency(allTimeIncome)}</span></div>
                                <div class="profit-row expense"><span>Total Expenses:</span> <span>${Utils.formatCurrency(allTimeExpenses)}</span></div>
                                <div class="profit-row profit ${allTimeProfit >= 0 ? 'positive' : 'negative'}">
                                    <span>${allTimeProfit >= 0 ? 'Net Profit:' : 'Net Loss:'}</span> 
                                    <span>${Utils.formatCurrency(Math.abs(allTimeProfit))}</span>
                                </div>
                                <div class="profit-margin">Margin: ${profitMargin}%</div>
                            </div>
                        </div>
                    </div>
                    
                    <h4><i class="fas fa-calendar-week"></i> Daily Breakdown (Last 7 Days)</h4>
                    <div class="daily-profit-table">
                        <div class="daily-header">
                            <span>Date</span>
                            <span>Income</span>
                            <span>Expenses</span>
                            <span>Profit/Loss</span>
                        </div>
                        ${dailyData.map(d => `
                            <div class="daily-row">
                                <span>${d.date}</span>
                                <span class="income">${Utils.formatCurrency(d.income)}</span>
                                <span class="expense">${Utils.formatCurrency(d.expense)}</span>
                                <span class="${d.profit >= 0 ? 'profit' : 'loss'}">${d.profit >= 0 ? '+' : ''}${Utils.formatCurrency(d.profit)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        this.showBreakdownModal(html);
    },

    showLowStock() {
        const lowStockThreshold = (DataStore.settings || {}).lowStockThreshold || 5;
        
        const lowInventory = (DataStore.inventory || [])
            .filter(i => (parseFloat(i.stock) || 0) <= lowStockThreshold)
            .sort((a, b) => (a.stock || 0) - (b.stock || 0));
        
        const lowGrocery = (DataStore.grocery || [])
            .filter(g => (parseFloat(g.quantity) || 0) <= lowStockThreshold)
            .sort((a, b) => (a.quantity || 0) - (b.quantity || 0));
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header stock">
                    <h3><i class="fas fa-exclamation-triangle"></i> Low Stock Items</h3>
                    <button class="modal-close" onclick="Modal.close('breakdownModal')">&times;</button>
                </div>
                <div class="breakdown-body">
                    <h4><i class="fas fa-box"></i> Inventory Items (${lowInventory.length})</h4>
                    <div class="breakdown-list">
                        ${lowInventory.length === 0 ? '<p class="no-data">All inventory items well stocked! ✓</p>' : 
                            lowInventory.map(i => `
                                <div class="breakdown-item ${i.stock === 0 ? 'critical' : 'warning'}">
                                    <div>
                                        <strong>${i.name}</strong>
                                        <small>${i.category || 'Uncategorized'}</small>
                                    </div>
                                    <span class="stock-qty ${i.stock === 0 ? 'out' : 'low'}">${i.stock} ${i.unit || 'units'}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                    
                    <h4><i class="fas fa-shopping-basket"></i> Grocery Items (${lowGrocery.length})</h4>
                    <div class="breakdown-list">
                        ${lowGrocery.length === 0 ? '<p class="no-data">All grocery items well stocked! ✓</p>' : 
                            lowGrocery.map(g => `
                                <div class="breakdown-item ${g.quantity === 0 ? 'critical' : 'warning'}">
                                    <div>
                                        <strong>${g.item_name}</strong>
                                        <small>${g.category || 'Other'}</small>
                                    </div>
                                    <span class="stock-qty ${g.quantity === 0 ? 'out' : 'low'}">${g.quantity} ${g.unit || 'units'}</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
        `;
        
        this.showBreakdownModal(html);
    },

    showBreakdownModal(content) {
        // Remove existing modal if any
        const existing = document.getElementById('breakdownModal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'breakdownModal';
        modal.className = 'modal active';
        modal.innerHTML = `<div class="modal-content breakdown-content">${content}</div>`;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) Modal.close('breakdownModal');
        });
        
        document.body.appendChild(modal);
    }
};
