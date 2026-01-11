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
    async refresh() {
        this.updateStats();
        this.updateSummaryCards();
        this.renderPopularItems();
        this.renderUpcomingDeliveries();
        this.renderStockAlerts();
        this.renderRecentCustomers();
    },

    // Helper to get date ranges
    getDateRanges() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        return { today, weekStart, monthStart };
    },

    // Calculate income for a date range
    getIncome(startDate, endDate = null) {
        return DataStore.orderHistory
            .filter(o => {
                const deliveredDate = new Date(o.delivered_at || o.deliveredAt || o.created_at);
                if (!deliveredDate || isNaN(deliveredDate)) return false;
                if (endDate) {
                    return deliveredDate >= startDate && deliveredDate <= endDate;
                }
                return deliveredDate.toDateString() === startDate.toDateString();
            })
            .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    },

    // Calculate expenses for a date range (transactions + grocery)
    getExpenses(startDate, endDate = null) {
        const transExpenses = DataStore.transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                const transDate = new Date(t.date || t.created_at || t.createdAt);
                if (!transDate || isNaN(transDate)) return false;
                if (endDate) {
                    return transDate >= startDate && transDate <= endDate;
                }
                return transDate.toDateString() === startDate.toDateString();
            })
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        const groceryExpenses = (DataStore.grocery || [])
            .filter(g => {
                const purchaseDate = new Date(g.purchase_date || g.purchaseDate);
                if (!purchaseDate || isNaN(purchaseDate)) return false;
                if (endDate) {
                    return purchaseDate >= startDate && purchaseDate <= endDate;
                }
                return purchaseDate.toDateString() === startDate.toDateString();
            })
            .reduce((sum, g) => sum + (parseFloat(g.cost) || 0), 0);
        
        return transExpenses + groceryExpenses;
    },

    // Update the quick summary cards (weekly, monthly, all-time)
    updateSummaryCards() {
        const { today, weekStart, monthStart } = this.getDateRanges();
        const now = new Date();
        
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
        const allTimeIncome = DataStore.orderHistory.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        const allTimeTransExpense = DataStore.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const allTimeGroceryExpense = (DataStore.grocery || [])
            .reduce((sum, g) => sum + (parseFloat(g.cost) || 0), 0);
        const allTimeExpense = allTimeTransExpense + allTimeGroceryExpense;
        const allTimeProfit = allTimeIncome - allTimeExpense;
        
        document.getElementById('allTimeIncome').textContent = Utils.formatCurrency(allTimeIncome);
        document.getElementById('allTimeExpense').textContent = Utils.formatCurrency(allTimeExpense);
        const allTimeProfitEl = document.getElementById('allTimeProfit');
        allTimeProfitEl.textContent = Utils.formatCurrency(allTimeProfit);
        allTimeProfitEl.parentElement.className = `summary-profit ${allTimeProfit >= 0 ? 'positive' : 'negative'}`;
    },

    updateStats() {
        const today = new Date().toDateString();
        
        // Today's Orders = Orders created today (both active and completed)
        const todayActiveOrders = DataStore.orders.filter(o => {
            const createdDate = o.created_at || o.createdAt;
            return createdDate && new Date(createdDate).toDateString() === today;
        });
        
        const todayCompletedOrders = DataStore.orderHistory.filter(o => {
            const createdDate = o.created_at || o.createdAt;
            return createdDate && new Date(createdDate).toDateString() === today;
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

        // Today's Income = Completed orders delivered TODAY (from history)
        const todayDelivered = DataStore.orderHistory.filter(o => {
            const deliveredDate = o.delivered_at || o.deliveredAt;
            return deliveredDate && new Date(deliveredDate).toDateString() === today;
        });
        const todayIncome = todayDelivered.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        document.getElementById('todayRevenue').textContent = Utils.formatCurrency(todayIncome);

        // Today's Expenses = Finance transactions + Grocery purchases for today
        const todayTransactionExpenses = DataStore.transactions
            .filter(t => {
                const isExpense = t.type === 'expense';
                const transDate = t.date || t.created_at || t.createdAt;
                const isToday = transDate && new Date(transDate).toDateString() === today;
                return isExpense && isToday;
            })
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        // Add grocery purchases for today
        const todayGroceryExpenses = (DataStore.grocery || [])
            .filter(g => {
                const purchaseDate = g.purchase_date || g.purchaseDate;
                return purchaseDate && new Date(purchaseDate).toDateString() === today;
            })
            .reduce((sum, g) => sum + (parseFloat(g.cost) || 0), 0);
        
        const todayExpenses = todayTransactionExpenses + todayGroceryExpenses;
        document.getElementById('todayExpenses').textContent = Utils.formatCurrency(todayExpenses);

        // Today's Profit = Income - Expenses
        const todayProfit = todayIncome - todayExpenses;
        const profitEl = document.getElementById('todayProfit');
        profitEl.textContent = Utils.formatCurrency(todayProfit);
        profitEl.className = `stat-value ${todayProfit >= 0 ? 'profit-positive' : 'profit-negative'}`;

        // Low Stock = Inventory items + Grocery items below threshold
        const lowStockThreshold = DataStore.settings.lowStockThreshold || 5;
        const lowStockInventory = DataStore.inventory.filter(i => 
            (parseFloat(i.stock) || 0) <= lowStockThreshold
        );
        
        // Also check grocery items if available
        let lowStockGrocery = [];
        if (DataStore.grocery && DataStore.grocery.length > 0) {
            lowStockGrocery = DataStore.grocery.filter(g => 
                (parseFloat(g.quantity) || 0) <= lowStockThreshold
            );
        }
        
        const totalLowStock = lowStockInventory.length + lowStockGrocery.length;
        document.getElementById('lowStockCount').textContent = totalLowStock;
    },

    renderPopularItems() {
        const container = document.getElementById('popularItems');
        
        const itemSales = {};
        [...DataStore.orders, ...DataStore.orderHistory].forEach(order => {
            (order.items || []).forEach(item => {
                itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
            });
        });

        const sorted = Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (sorted.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-chart-bar"></i><p>No sales data yet</p></div>`;
            return;
        }

        container.innerHTML = sorted.map((item, index) => {
            const invItem = DataStore.inventory.find(i => i.name === item[0]);
            return `
                <div class="popular-item">
                    <div class="popular-item-info">
                        <span class="popular-item-rank">${index + 1}</span>
                        <div>
                            <div class="popular-item-name">${item[0]}</div>
                            <div class="popular-item-category">${invItem?.category || 'N/A'}</div>
                        </div>
                    </div>
                    <span class="popular-item-sales">${item[1]} sold</span>
                </div>
            `;
        }).join('');
    },

    renderUpcomingDeliveries() {
        const container = document.getElementById('upcomingDeliveries');
        
        const upcoming = DataStore.orders
            .filter(o => o.deadline && o.status !== 'delivered')
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-truck"></i><p>No upcoming deliveries</p></div>`;
            return;
        }

        container.innerHTML = upcoming.map(order => {
            const daysLeft = Utils.daysUntil(order.deadline);
            return `
                <div class="delivery-item ${daysLeft <= 1 ? 'urgent' : ''}">
                    <div class="delivery-info">
                        <span class="delivery-customer">${order.customer_name || order.customerName}</span>
                        <span class="delivery-date">${Utils.formatDate(order.deadline)}</span>
                    </div>
                    <span class="delivery-badge ${daysLeft <= 0 ? 'overdue' : daysLeft <= 1 ? 'today' : ''}">${daysLeft <= 0 ? 'Overdue' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}</span>
                </div>
            `;
        }).join('');
    },

    renderStockAlerts() {
        const container = document.getElementById('stockAlerts');
        
        const lowStock = DataStore.inventory
            .filter(i => i.stock <= DataStore.settings.lowStockThreshold)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 5);

        if (lowStock.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><p>All items well stocked</p></div>`;
            return;
        }

        container.innerHTML = lowStock.map(item => `
            <div class="stock-alert-item ${item.stock === 0 ? 'out-of-stock' : ''}">
                <div class="stock-item-info">
                    <span class="stock-item-name">${item.name}</span>
                    <span class="stock-item-qty">${item.stock} ${item.unit}</span>
                </div>
                <span class="stock-badge ${item.stock === 0 ? 'out' : 'low'}">${item.stock === 0 ? 'Out of Stock' : 'Low Stock'}</span>
            </div>
        `).join('');
    },

    renderRecentCustomers() {
        const container = document.getElementById('recentCustomers');
        
        const recent = DataStore.customers
            .sort((a, b) => new Date(b.last_order || b.lastOrder || 0) - new Date(a.last_order || a.lastOrder || 0))
            .slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-users"></i><p>No customers yet</p></div>`;
            return;
        }

        container.innerHTML = recent.map(customer => `
            <div class="recent-customer">
                <div class="customer-avatar">${Utils.getInitials(customer.name)}</div>
                <div class="customer-info">
                    <span class="customer-name">${customer.name}</span>
                    <span class="customer-orders">${customer.total_orders || customer.totalOrders || 0} orders</span>
                </div>
                <span class="customer-spent">${Utils.formatCurrency(customer.total_spent || customer.totalSpent || 0)}</span>
            </div>
        `).join('');
    },

    // ===== MODAL BREAKDOWNS =====
    
    showOrdersBreakdown() {
        const { today, weekStart, monthStart } = this.getDateRanges();
        const now = new Date();
        
        // Calculate orders by period
        const todayOrders = [...DataStore.orders, ...DataStore.orderHistory].filter(o => {
            const date = new Date(o.created_at || o.createdAt);
            return date.toDateString() === today.toDateString();
        });
        
        const weekOrders = [...DataStore.orders, ...DataStore.orderHistory].filter(o => {
            const date = new Date(o.created_at || o.createdAt);
            return date >= weekStart && date <= now;
        });
        
        const monthOrders = [...DataStore.orders, ...DataStore.orderHistory].filter(o => {
            const date = new Date(o.created_at || o.createdAt);
            return date >= monthStart && date <= now;
        });
        
        const totalOrders = DataStore.orders.length + DataStore.orderHistory.length;
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header">
                    <h3><i class="fas fa-shopping-bag"></i> Orders Summary</h3>
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
                                        <span>${o.customer_name || o.customerName}</span>
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
        const pending = DataStore.orders.filter(o => o.status !== 'delivered' && o.status !== 'completed');
        
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
                                const daysLeft = Utils.daysUntil(o.deadline);
                                const urgency = daysLeft <= 0 ? 'overdue' : daysLeft <= 1 ? 'urgent' : '';
                                return `
                                    <div class="breakdown-item ${urgency}">
                                        <div class="order-info">
                                            <strong>${o.customer_name || o.customerName}</strong>
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

    showIncomeBreakdown() {
        const { today, weekStart, monthStart } = this.getDateRanges();
        const now = new Date();
        
        const todayIncome = this.getIncome(today);
        const weekIncome = this.getIncome(weekStart, now);
        const monthIncome = this.getIncome(monthStart, now);
        const allTimeIncome = DataStore.orderHistory.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        
        // Get daily breakdown for past 7 days
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const income = this.getIncome(date);
            dailyData.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                amount: income
            });
        }
        
        // Recent delivered orders
        const recentOrders = DataStore.orderHistory
            .sort((a, b) => new Date(b.delivered_at || b.deliveredAt) - new Date(a.delivered_at || a.deliveredAt))
            .slice(0, 10);
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header income">
                    <h3><i class="fas fa-arrow-down"></i> Income Breakdown</h3>
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
                                        <strong>${o.customer_name || o.customerName}</strong>
                                        <small>${Utils.formatDate(o.delivered_at || o.deliveredAt)}</small>
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
        const weekExpenses = this.getExpenses(weekStart, now);
        const monthExpenses = this.getExpenses(monthStart, now);
        
        const allTimeTransExpense = DataStore.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const allTimeGroceryExpense = (DataStore.grocery || [])
            .reduce((sum, g) => sum + (parseFloat(g.cost) || 0), 0);
        const allTimeExpenses = allTimeTransExpense + allTimeGroceryExpense;
        
        // Get daily breakdown for past 7 days
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const expense = this.getExpenses(date);
            dailyData.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                amount: expense
            });
        }
        
        // Recent expenses from transactions
        const recentExpenses = DataStore.transactions
            .filter(t => t.type === 'expense')
            .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at))
            .slice(0, 5);
        
        // Recent grocery purchases
        const recentGrocery = (DataStore.grocery || [])
            .sort((a, b) => new Date(b.purchase_date || b.purchaseDate) - new Date(a.purchase_date || a.purchaseDate))
            .slice(0, 5);
        
        const html = `
            <div class="breakdown-modal">
                <div class="breakdown-header expense">
                    <h3><i class="fas fa-arrow-up"></i> Expenses Breakdown</h3>
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
        const now = new Date();
        
        const todayIncome = this.getIncome(today);
        const todayExpenses = this.getExpenses(today);
        const todayProfit = todayIncome - todayExpenses;
        
        const weekIncome = this.getIncome(weekStart, now);
        const weekExpenses = this.getExpenses(weekStart, now);
        const weekProfit = weekIncome - weekExpenses;
        
        const monthIncome = this.getIncome(monthStart, now);
        const monthExpenses = this.getExpenses(monthStart, now);
        const monthProfit = monthIncome - monthExpenses;
        
        const allTimeIncome = DataStore.orderHistory.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        const allTimeTransExpense = DataStore.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const allTimeGroceryExpense = (DataStore.grocery || []).reduce((sum, g) => sum + (parseFloat(g.cost) || 0), 0);
        const allTimeExpenses = allTimeTransExpense + allTimeGroceryExpense;
        const allTimeProfit = allTimeIncome - allTimeExpenses;
        
        // Profit margin calculation
        const profitMargin = allTimeIncome > 0 ? ((allTimeProfit / allTimeIncome) * 100).toFixed(1) : 0;
        
        // Daily profit for last 7 days
        const dailyData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const income = this.getIncome(date);
            const expense = this.getExpenses(date);
            dailyData.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                income,
                expense,
                profit: income - expense
            });
        }
        
        const html = `
            <div class="breakdown-modal wide">
                <div class="breakdown-header profit">
                    <h3><i class="fas fa-chart-line"></i> Profit & Loss Summary</h3>
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
        const lowStockThreshold = DataStore.settings.lowStockThreshold || 5;
        
        const lowInventory = DataStore.inventory
            .filter(i => (parseFloat(i.stock) || 0) <= lowStockThreshold)
            .sort((a, b) => a.stock - b.stock);
        
        const lowGrocery = (DataStore.grocery || [])
            .filter(g => (parseFloat(g.quantity) || 0) <= lowStockThreshold)
            .sort((a, b) => a.quantity - b.quantity);
        
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
