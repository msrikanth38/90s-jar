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
        this.renderPopularItems();
        this.renderUpcomingDeliveries();
        this.renderStockAlerts();
        this.renderRecentCustomers();
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

        // Today's Expenses = Expenses from Finance/Transactions tab for today
        const todayExpenses = DataStore.transactions
            .filter(t => {
                const isExpense = t.type === 'expense';
                const transDate = t.date || t.created_at || t.createdAt;
                const isToday = transDate && new Date(transDate).toDateString() === today;
                return isExpense && isToday;
            })
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
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
    }
};
