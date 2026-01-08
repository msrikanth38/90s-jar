// ===== API Service for Database Operations =====
const API = {
    baseUrl: '',

    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}/api/${endpoint}`);
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
    async updateOrderStatus(id, status) { return this.put(`orders/${id}/status`, { status }); },
    async deleteOrder(id) { return this.delete(`orders/${id}`); },

    // History
    async getHistory() { return this.get('history'); },

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
    async importData(data) { return this.post('import', data); }
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
             this.customers, this.transactions, this.offers, this.orderHistory] = await Promise.all([
                API.getInventory(),
                API.getOrders(),
                API.getCombos(),
                API.getRecipes(),
                API.getCustomers(),
                API.getTransactions(),
                API.getOffers(),
                API.getHistory()
            ]);
            
            // Load settings from localStorage (client-side preference)
            const savedSettings = localStorage.getItem('settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
            
            return true;
        } catch (error) {
            console.error('Failed to load data:', error);
            return false;
        }
    },

    saveSettings() {
        localStorage.setItem('settings', JSON.stringify(this.settings));
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
