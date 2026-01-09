// ===== API Service for Database Operations =====
const API = {
    baseUrl: '',

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${endpoint}`);
            if (!response.ok) {
                console.error(`GET ${endpoint} failed with status: ${response.status}`);
                return [];
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`GET ${endpoint} returned non-JSON response`);
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error(`GET ${endpoint} failed:`, error);
            return [];
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                console.error(`POST ${endpoint} failed with status: ${response.status}`);
                return { success: false };
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`POST ${endpoint} returned non-JSON response`);
                return { success: false };
            }
            return await response.json();
        } catch (error) {
            console.error(`POST ${endpoint} failed:`, error);
            return { success: false };
        }
    },

    async put(endpoint, data) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                console.error(`PUT ${endpoint} failed with status: ${response.status}`);
                return { success: false };
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`PUT ${endpoint} returned non-JSON response`);
                return { success: false };
            }
            return await response.json();
        } catch (error) {
            console.error(`PUT ${endpoint} failed:`, error);
            return { success: false };
        }
    },

    async delete(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${endpoint}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                console.error(`DELETE ${endpoint} failed with status: ${response.status}`);
                return { success: false };
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.error(`DELETE ${endpoint} returned non-JSON response`);
                return { success: false };
            }
            return await response.json();
        } catch (error) {
            console.error(`DELETE ${endpoint} failed:`, error);
            return { success: false };
        }
    },

    // Inventory
    async getInventory() { return this.get('inventory'); },
    async saveInventory(item) { return this.post('inventory', item); },
    async deleteInventory(id) { return this.delete(`inventory/${id}`); },
    async updateStock(id, change) { return this.put(`inventory/${id}/stock`, { change }); },

    // Customers
    async getCustomers() { return this.get('customers'); },
    async saveCustomer(customer) { return this.post('customers', customer); },
    async deleteCustomer(id) { return this.delete(`customers/${id}`); },

    // Orders
    async getOrders() { return this.get('orders'); },
    async saveOrder(order) { return this.post('orders', order); },
    async updateOrder(order) { return this.put(`orders/${order.id}`, order); },
    async updateOrderStatus(id, status) { return this.put(`orders/${id}/status`, { status }); },
    async deleteOrder(id) { return this.delete(`orders/${id}`); },

    // History
    async getHistory() { return this.get('history'); },
    async deleteHistory(id) { return this.delete(`history/${id}`); },

    // Combos
    async getCombos() { return this.get('combos'); },
    async saveCombo(combo) { return this.post('combos', combo); },
    async deleteCombo(id) { return this.delete(`combos/${id}`); },

    // Recipes
    async getRecipes() { return this.get('recipes'); },
    async saveRecipe(recipe) { return this.post('recipes', recipe); },
    async deleteRecipe(id) { return this.delete(`recipes/${id}`); },

    // Transactions
    async getTransactions() { return this.get('transactions'); },
    async saveTransaction(trans) { return this.post('transactions', trans); },
    async deleteTransaction(id) { return this.delete(`transactions/${id}`); },

    // Offers
    async getOffers() { return this.get('offers'); },
    async saveOffer(offer) { return this.post('offers', offer); },
    async deleteOffer(id) { return this.delete(`offers/${id}`); },

    // Stats
    async getStats() { return this.get('stats'); },

    // Export/Import
    async exportData() { return this.get('export'); },
    async importData(data) { return this.post('import', data); },

    // Grocery Inventory
    async getGrocery() { return this.get('grocery'); },
    async saveGrocery(item) { return this.post('grocery', item); },
    async deleteGrocery(id) { return this.delete(`grocery/${id}`); },

    // Grocery Usage
    async getGroceryUsage() { return this.get('grocery/usage'); },
    async recordGroceryUsage(usage) { return this.post('grocery/usage', usage); },
    async deleteGroceryUsage(id) { return this.delete(`grocery/usage/${id}`); },

    // Debug
    async getDebugInfo() { return this.get('debug'); }
};

// ===== Data Store (cached data) =====
const DataStore = {
    inventory: [],
    orders: [],
    combos: [],
    recipes: [],
    customers: [],
    transactions: [],
    offers: [],
    orderHistory: [],
    grocery: [],
    notifications: [],
    settings: {
        businessName: "90's JAR - Homemade Sankranti Snacks",
        phone: '+1 6822742570',
        email: '',
        address: '',
        lowStockThreshold: 5,
        darkMode: false
    },

    async loadAll() {
        try {
            [this.inventory, this.orders, this.combos, this.recipes, 
             this.customers, this.transactions, this.offers, this.orderHistory, this.grocery] = await Promise.all([
                API.getInventory(),
                API.getOrders(),
                API.getCombos(),
                API.getRecipes(),
                API.getCustomers(),
                API.getTransactions(),
                API.getOffers(),
                API.getHistory(),
                API.getGrocery()
            ]);
            
            // Load settings from localStorage (client-side preference)
            const savedSettings = localStorage.getItem('settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
            
            // Auto-backup data to localStorage after successful load
            this.backupToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('Failed to load data:', error);
            // Try to restore from localStorage backup
            this.restoreFromLocalStorage();
            return false;
        }
    },

    saveSettings() {
        localStorage.setItem('settings', JSON.stringify(this.settings));
    },
    
    backupToLocalStorage() {
        try {
            const backup = {
                inventory: this.inventory,
                orders: this.orders,
                combos: this.combos,
                recipes: this.recipes,
                customers: this.customers,
                transactions: this.transactions,
                offers: this.offers,
                orderHistory: this.orderHistory,
                grocery: this.grocery,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('data_backup', JSON.stringify(backup));
            console.log('Data backed up to localStorage at', backup.timestamp);
        } catch (e) {
            console.warn('Could not backup to localStorage:', e);
        }
    },
    
    restoreFromLocalStorage() {
        try {
            const backup = localStorage.getItem('data_backup');
            if (backup) {
                const data = JSON.parse(backup);
                this.inventory = data.inventory || [];
                this.orders = data.orders || [];
                this.combos = data.combos || [];
                this.recipes = data.recipes || [];
                this.customers = data.customers || [];
                this.transactions = data.transactions || [];
                this.offers = data.offers || [];
                this.orderHistory = data.orderHistory || [];
                this.grocery = data.grocery || [];
                console.log('Data restored from localStorage backup from', data.timestamp);
                Toast.warning('Offline Mode', 'Using cached data. Server may be unavailable.');
            }
        } catch (e) {
            console.warn('Could not restore from localStorage:', e);
        }
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// ===== Utility Functions =====
const Utils = {
    formatCurrency(amount) {
        return '$' + Number(amount).toFixed(2);
    },

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    formatDateTime(date) {
        return new Date(date).toLocaleString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },

    daysUntil(date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(date);
        target.setHours(0, 0, 0, 0);
        return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ===== Toast Notifications =====
const Toast = {
    show(type, title, message) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    success(title, message) { this.show('success', title, message); },
    error(title, message) { this.show('error', title, message); },
    warning(title, message) { this.show('warning', title, message); },
    info(title, message) { this.show('info', title, message); }
};
