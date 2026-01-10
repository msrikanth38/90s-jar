// ===== Grocery Inventory Module =====
const Grocery = {
    searchQuery: '',
    categoryFilter: 'all',
    items: [],
    usageHistory: [],
    chartColors: {
        'pickles': '#8B4513',
        'snacks': '#D2691E',
        'other': '#DAA520'
    },

    async refresh() {
        await this.loadData();
        this.renderGrocery();
        this.renderUsageHistory();
        this.updateStats();
        this.renderChart();
        this.updateItemSuggestions();
    },

    async loadData() {
        try {
            const [groceryRes, usageRes] = await Promise.all([
                API.getGrocery(),
                API.getGroceryUsage()
            ]);
            this.items = groceryRes.data || [];
            this.usageHistory = usageRes.data || [];
        } catch (error) {
            console.error('Error loading grocery data:', error);
            this.items = [];
            this.usageHistory = [];
        }
    },

    // Auto-suggest item names from existing inventory
    updateItemSuggestions() {
        const datalist = document.getElementById('groceryItemSuggestions');
        if (!datalist) return;
        
        // Get unique item names from inventory and usage history
        const itemNames = new Set();
        this.items.forEach(item => itemNames.add(item.item_name));
        this.usageHistory.forEach(usage => {
            const item = this.items.find(i => i.id === usage.grocery_id);
            if (item) itemNames.add(item.item_name);
        });
        
        // Add common grocery items for pickles and snacks business
        const commonItems = [
            'Raw Mangoes', 'Lemons', 'Green Chillies', 'Red Chilli Powder', 'Turmeric Powder',
            'Mustard Seeds', 'Fenugreek Seeds', 'Salt', 'Sesame Oil', 'Groundnut Oil',
            'Garlic', 'Ginger', 'Tamarind', 'Jaggery', 'Rice Flour', 'Besan (Gram Flour)',
            'Urad Dal', 'Chana Dal', 'Moong Dal', 'Rice', 'Peanuts', 'Cashews',
            'Curry Leaves', 'Asafoetida', 'Cumin Seeds', 'Coriander Seeds', 'Black Pepper',
            'Vinegar', 'Sugar', 'Coconut', 'Dried Red Chillies', 'Mustard Oil'
        ];
        commonItems.forEach(name => itemNames.add(name));
        
        datalist.innerHTML = Array.from(itemNames)
            .sort()
            .map(name => `<option value="${name}">`)
            .join('');
    },

    // Render pie chart for category distribution
    renderChart() {
        const canvas = document.getElementById('groceryPieChart');
        const legendContainer = document.getElementById('groceryChartLegend');
        if (!canvas || !legendContainer) return;

        const ctx = canvas.getContext('2d');
        
        // Calculate category totals
        const categoryData = {
            'pickles': { count: 0, value: 0 },
            'snacks': { count: 0, value: 0 },
            'other': { count: 0, value: 0 }
        };
        
        this.items.forEach(item => {
            const cat = item.category || 'other';
            if (categoryData[cat]) {
                categoryData[cat].count++;
                categoryData[cat].value += item.cost || 0;
            }
        });

        const total = this.items.length || 1;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.items.length === 0) {
            ctx.fillStyle = '#ccc';
            ctx.beginPath();
            ctx.arc(100, 100, 80, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#666';
            ctx.font = '14px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText('No Data', 100, 105);
            legendContainer.innerHTML = '<p class="no-data">Add items to see chart</p>';
            return;
        }

        // Draw pie chart
        let startAngle = -Math.PI / 2;
        const categories = ['pickles', 'snacks', 'other'];
        
        categories.forEach(cat => {
            const count = categoryData[cat].count;
            if (count > 0) {
                const sliceAngle = (count / total) * 2 * Math.PI;
                ctx.beginPath();
                ctx.moveTo(100, 100);
                ctx.arc(100, 100, 80, startAngle, startAngle + sliceAngle);
                ctx.closePath();
                ctx.fillStyle = this.chartColors[cat];
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                startAngle += sliceAngle;
            }
        });

        // Draw center circle (donut effect)
        ctx.beginPath();
        ctx.arc(100, 100, 40, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        
        // Draw total in center
        ctx.fillStyle = '#2C1810';
        ctx.font = 'bold 20px Poppins';
        ctx.textAlign = 'center';
        ctx.fillText(total, 100, 95);
        ctx.font = '10px Poppins';
        ctx.fillText('Items', 100, 110);

        // Render legend
        legendContainer.innerHTML = categories.map(cat => {
            const data = categoryData[cat];
            const percent = total > 0 ? Math.round((data.count / total) * 100) : 0;
            return `
                <div class="legend-item">
                    <span class="legend-color" style="background: ${this.chartColors[cat]}"></span>
                    <span class="legend-label">${this.getCategoryEmoji(cat)} ${this.getCategoryLabel(cat)}</span>
                    <span class="legend-value">${data.count} (${percent}%)</span>
                </div>
            `;
        }).join('');
    },

    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderGrocery();
    },

    clearSearch() {
        this.searchQuery = '';
        document.getElementById('grocerySearch').value = '';
        this.renderGrocery();
    },

    filterByCategory(category) {
        this.categoryFilter = category;
        
        // Update active filter button
        document.querySelectorAll('.grocery-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.renderGrocery();
    },

    getCategoryEmoji(category) {
        const emojis = {
            'pickles': '🥒',
            'snacks': '🍪',
            'other': '📦'
        };
        return emojis[category] || '📦';
    },

    getCategoryLabel(category) {
        const labels = {
            'pickles': 'Pickles Grocery',
            'snacks': 'Snacks Grocery',
            'other': 'Other'
        };
        return labels[category] || category;
    },

    isExpiringSoon(expiryDate) {
        if (!expiryDate) return false;
        const expiry = new Date(expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    },

    isExpired(expiryDate) {
        if (!expiryDate) return false;
        const expiry = new Date(expiryDate);
        const today = new Date();
        return expiry < today;
    },

    updateStats() {
        const totalItems = this.items.length;
        const lowStock = this.items.filter(item => item.quantity <= 1).length;
        const expiringSoon = this.items.filter(item => this.isExpiringSoon(item.expiry_date) || this.isExpired(item.expiry_date)).length;
        const totalCost = this.items.reduce((sum, item) => sum + (item.cost || 0), 0);

        document.getElementById('totalGroceryItems').textContent = totalItems;
        document.getElementById('lowStockGrocery').textContent = lowStock;
        document.getElementById('expiringGrocery').textContent = expiringSoon;
        document.getElementById('totalGroceryCost').textContent = Utils.formatCurrency(totalCost);
    },

    // Show detailed stats modal
    showStatsModal() {
        const content = document.getElementById('groceryStatsContent');
        
        // Calculate stats by category
        const categoryStats = {
            'pickles': { items: [], totalCost: 0, totalUsage: 0 },
            'snacks': { items: [], totalCost: 0, totalUsage: 0 },
            'other': { items: [], totalCost: 0, totalUsage: 0 }
        };
        
        this.items.forEach(item => {
            const cat = item.category || 'other';
            if (categoryStats[cat]) {
                categoryStats[cat].items.push(item);
                categoryStats[cat].totalCost += item.cost || 0;
            }
        });
        
        // Calculate usage per item
        const usageByItem = {};
        this.usageHistory.forEach(usage => {
            if (!usageByItem[usage.grocery_id]) {
                usageByItem[usage.grocery_id] = { count: 0, totalQty: 0, purposes: new Set() };
            }
            usageByItem[usage.grocery_id].count++;
            usageByItem[usage.grocery_id].totalQty += usage.quantity_used || 0;
            if (usage.purpose) usageByItem[usage.grocery_id].purposes.add(usage.purpose);
        });

        // Calculate usage stats per category
        this.items.forEach(item => {
            const cat = item.category || 'other';
            const usage = usageByItem[item.id];
            if (usage && categoryStats[cat]) {
                categoryStats[cat].totalUsage += usage.totalQty;
            }
        });

        // Most used items
        const mostUsedItems = this.items
            .map(item => ({
                ...item,
                usage: usageByItem[item.id] || { count: 0, totalQty: 0, purposes: new Set() }
            }))
            .filter(item => item.usage.count > 0)
            .sort((a, b) => b.usage.totalQty - a.usage.totalQty)
            .slice(0, 10);

        // Low stock items
        const lowStockItems = this.items.filter(item => item.quantity <= 1);

        // Expiring items
        const expiringItems = this.items.filter(item => 
            this.isExpiringSoon(item.expiry_date) || this.isExpired(item.expiry_date)
        );

        content.innerHTML = `
            <div class="stats-grid">
                <!-- Category Breakdown -->
                <div class="stats-section">
                    <h4><i class="fas fa-chart-pie"></i> Category Breakdown</h4>
                    <div class="stats-cards">
                        ${['pickles', 'snacks', 'other'].map(cat => `
                            <div class="mini-stat-card" style="border-left: 4px solid ${this.chartColors[cat]}">
                                <div class="mini-stat-header">
                                    ${this.getCategoryEmoji(cat)} ${this.getCategoryLabel(cat)}
                                </div>
                                <div class="mini-stat-body">
                                    <div class="mini-stat-row">
                                        <span>Items:</span>
                                        <strong>${categoryStats[cat].items.length}</strong>
                                    </div>
                                    <div class="mini-stat-row">
                                        <span>Total Cost:</span>
                                        <strong>${Utils.formatCurrency(categoryStats[cat].totalCost)}</strong>
                                    </div>
                                    <div class="mini-stat-row">
                                        <span>Usage:</span>
                                        <strong>${categoryStats[cat].totalUsage.toFixed(2)} units</strong>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Most Used Items -->
                <div class="stats-section">
                    <h4><i class="fas fa-fire"></i> Most Used Items</h4>
                    ${mostUsedItems.length > 0 ? `
                        <table class="mini-stats-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Category</th>
                                    <th>Times Used</th>
                                    <th>Total Qty Used</th>
                                    <th>Used For</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${mostUsedItems.map(item => `
                                    <tr>
                                        <td><strong>${item.item_name}</strong></td>
                                        <td><span class="category-badge ${item.category}">${this.getCategoryLabel(item.category)}</span></td>
                                        <td>${item.usage.count}x</td>
                                        <td>${item.usage.totalQty.toFixed(2)} ${item.unit}</td>
                                        <td>${Array.from(item.usage.purposes).slice(0, 3).join(', ') || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="no-data">No usage recorded yet</p>'}
                </div>

                <!-- Alerts Section -->
                <div class="stats-section alerts-section">
                    <div class="alert-box warning">
                        <h4><i class="fas fa-exclamation-triangle"></i> Low Stock (${lowStockItems.length})</h4>
                        ${lowStockItems.length > 0 ? `
                            <ul class="alert-list">
                                ${lowStockItems.map(item => `
                                    <li>${this.getCategoryEmoji(item.category)} ${item.item_name} - <strong>${item.quantity} ${item.unit}</strong> left</li>
                                `).join('')}
                            </ul>
                        ` : '<p>All items well stocked!</p>'}
                    </div>
                    
                    <div class="alert-box danger">
                        <h4><i class="fas fa-calendar-times"></i> Expiring Soon (${expiringItems.length})</h4>
                        ${expiringItems.length > 0 ? `
                            <ul class="alert-list">
                                ${expiringItems.map(item => `
                                    <li class="${this.isExpired(item.expiry_date) ? 'expired' : ''}">
                                        ${this.getCategoryEmoji(item.category)} ${item.item_name} - 
                                        <strong>${this.isExpired(item.expiry_date) ? 'EXPIRED' : 'Expires'} ${Utils.formatDate(item.expiry_date)}</strong>
                                    </li>
                                `).join('')}
                            </ul>
                        ` : '<p>No items expiring soon!</p>'}
                    </div>
                </div>

                <!-- Usage by Purpose -->
                <div class="stats-section">
                    <h4><i class="fas fa-clipboard-list"></i> Usage by Purpose</h4>
                    ${this.getUsageByPurpose()}
                </div>
            </div>
        `;

        Modal.open('groceryStatsModal');
    },

    getUsageByPurpose() {
        const purposeStats = {};
        
        this.usageHistory.forEach(usage => {
            const purpose = usage.purpose || 'General Use';
            if (!purposeStats[purpose]) {
                purposeStats[purpose] = { count: 0, items: new Set() };
            }
            purposeStats[purpose].count++;
            const item = this.items.find(i => i.id === usage.grocery_id);
            if (item) purposeStats[purpose].items.add(item.item_name);
        });

        const purposes = Object.entries(purposeStats)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);

        if (purposes.length === 0) {
            return '<p class="no-data">No usage recorded yet</p>';
        }

        return `
            <div class="purpose-stats">
                ${purposes.map(([purpose, data]) => `
                    <div class="purpose-item">
                        <div class="purpose-header">
                            <span class="purpose-name">${purpose}</span>
                            <span class="purpose-count">${data.count} uses</span>
                        </div>
                        <div class="purpose-items">
                            Items: ${Array.from(data.items).slice(0, 5).join(', ')}${data.items.size > 5 ? '...' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderGrocery() {
        const container = document.getElementById('groceryTable');
        let items = [...this.items];

        // Apply category filter
        if (this.categoryFilter !== 'all') {
            items = items.filter(item => item.category === this.categoryFilter);
        }

        // Apply search filter
        if (this.searchQuery) {
            items = items.filter(item => {
                const searchText = this.searchQuery;
                return (
                    item.item_name?.toLowerCase().includes(searchText) ||
                    item.category?.toLowerCase().includes(searchText) ||
                    item.purchased_by?.toLowerCase().includes(searchText) ||
                    item.location?.toLowerCase().includes(searchText) ||
                    item.supplier?.toLowerCase().includes(searchText) ||
                    item.notes?.toLowerCase().includes(searchText)
                );
            });
        }

        if (items.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-shopping-basket"></i>
                            <h3>${this.searchQuery || this.categoryFilter !== 'all' ? 'No Items Found' : 'No Grocery Items'}</h3>
                            <p>${this.searchQuery ? 'Try a different search term' : 'Add your first grocery item to start tracking'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
            const isLowStock = item.quantity <= 1;
            const isExpiring = this.isExpiringSoon(item.expiry_date);
            const isExpired = this.isExpired(item.expiry_date);
            
            let statusClass = '';
            let statusBadge = '';
            
            if (isExpired) {
                statusClass = 'expired';
                statusBadge = '<span class="status-badge expired">Expired</span>';
            } else if (isExpiring) {
                statusClass = 'expiring';
                statusBadge = '<span class="status-badge expiring">Expiring Soon</span>';
            } else if (isLowStock) {
                statusClass = 'low-stock';
                statusBadge = '<span class="status-badge low-stock">Low Stock</span>';
            }

            return `
                <tr class="${statusClass}" data-id="${item.id}">
                    <td>
                        <div class="grocery-item-cell">
                            <span class="grocery-emoji">${this.getCategoryEmoji(item.category)}</span>
                            <div class="grocery-item-info">
                                <strong>${item.item_name}</strong>
                                ${statusBadge}
                            </div>
                        </div>
                    </td>
                    <td><span class="category-badge ${item.category}">${this.getCategoryLabel(item.category)}</span></td>
                    <td><strong>${item.quantity} ${item.unit || 'kg'}</strong></td>
                    <td>${item.purchase_date ? Utils.formatDate(item.purchase_date) : 'N/A'}</td>
                    <td class="${isExpired ? 'text-danger' : isExpiring ? 'text-warning' : ''}">${item.expiry_date ? Utils.formatDate(item.expiry_date) : 'N/A'}</td>
                    <td>${item.purchased_by || 'N/A'}</td>
                    <td>${item.location || 'N/A'}</td>
                    <td>${Utils.formatCurrency(item.cost || 0)}</td>
                    <td class="grocery-actions">
                        <button class="btn-icon" onclick="Grocery.viewDetails('${item.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" onclick="Grocery.quickUse('${item.id}')" title="Record Usage"><i class="fas fa-clipboard-list"></i></button>
                        <button class="btn-icon" onclick="Grocery.editItem('${item.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Grocery.deleteItem('${item.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderUsageHistory() {
        const container = document.getElementById('usageHistoryTable');
        
        // Get last 10 usage records
        const recentUsage = [...this.usageHistory]
            .sort((a, b) => new Date(b.used_date || b.created_at) - new Date(a.used_date || a.created_at))
            .slice(0, 10);

        if (recentUsage.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-clipboard-list"></i>
                            <h3>No Usage Records</h3>
                            <p>Record usage to track consumption</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = recentUsage.map(usage => {
            const item = this.items.find(i => i.id === usage.grocery_id);
            const itemName = item ? item.item_name : 'Unknown Item';
            const unit = item ? item.unit : '';

            return `
                <tr data-id="${usage.id}">
                    <td><strong>${itemName}</strong></td>
                    <td>${usage.quantity_used} ${unit}</td>
                    <td>${Utils.formatDate(usage.used_date)}</td>
                    <td>${usage.used_by || 'N/A'}</td>
                    <td>${usage.purpose || 'N/A'}</td>
                    <td>
                        <button class="btn-icon danger" onclick="Grocery.deleteUsage('${usage.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openAddModal() {
        this.clearForm();
        document.getElementById('groceryModalTitle').textContent = 'Add Grocery Item';
        document.getElementById('groceryPurchaseDate').value = new Date().toISOString().split('T')[0];
        Modal.open('groceryModal');
    },

    clearForm() {
        document.getElementById('groceryItemId').value = '';
        document.getElementById('groceryItemName').value = '';
        document.getElementById('groceryCategory').value = 'vegetables';
        document.getElementById('groceryQuantity').value = '';
        document.getElementById('groceryUnit').value = 'kg';
        document.getElementById('groceryPurchaseDate').value = '';
        document.getElementById('groceryExpiryDate').value = '';
        document.getElementById('groceryPurchasedBy').value = '';
        document.getElementById('groceryLocation').value = '';
        document.getElementById('groceryCost').value = '';
        document.getElementById('grocerySupplier').value = '';
        document.getElementById('groceryNotes').value = '';
    },

    editItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        document.getElementById('groceryModalTitle').textContent = 'Edit Grocery Item';
        document.getElementById('groceryItemId').value = item.id;
        document.getElementById('groceryItemName').value = item.item_name || '';
        document.getElementById('groceryCategory').value = item.category || 'vegetables';
        document.getElementById('groceryQuantity').value = item.quantity || '';
        document.getElementById('groceryUnit').value = item.unit || 'kg';
        document.getElementById('groceryPurchaseDate').value = item.purchase_date || '';
        document.getElementById('groceryExpiryDate').value = item.expiry_date || '';
        document.getElementById('groceryPurchasedBy').value = item.purchased_by || '';
        document.getElementById('groceryLocation').value = item.location || '';
        document.getElementById('groceryCost').value = item.cost || '';
        document.getElementById('grocerySupplier').value = item.supplier || '';
        document.getElementById('groceryNotes').value = item.notes || '';

        Modal.open('groceryModal');
    },

    async saveItem() {
        const id = document.getElementById('groceryItemId').value;
        const itemName = document.getElementById('groceryItemName').value.trim();
        const category = document.getElementById('groceryCategory').value;
        const quantity = parseFloat(document.getElementById('groceryQuantity').value) || 0;
        const unit = document.getElementById('groceryUnit').value;
        const purchaseDate = document.getElementById('groceryPurchaseDate').value;
        const expiryDate = document.getElementById('groceryExpiryDate').value;
        const purchasedBy = document.getElementById('groceryPurchasedBy').value.trim();
        const location = document.getElementById('groceryLocation').value.trim();
        const cost = parseFloat(document.getElementById('groceryCost').value) || 0;
        const supplier = document.getElementById('grocerySupplier').value.trim();
        const notes = document.getElementById('groceryNotes').value.trim();

        if (!itemName) {
            Toast.error('Required', 'Please enter item name');
            return;
        }

        if (quantity <= 0) {
            Toast.error('Required', 'Please enter a valid quantity');
            return;
        }

        const item = {
            id: id || null,
            item_name: itemName,
            category,
            quantity,
            unit,
            purchase_date: purchaseDate,
            expiry_date: expiryDate,
            purchased_by: purchasedBy,
            location,
            cost,
            supplier,
            notes
        };

        const result = await API.saveGrocery(item);

        if (result.success) {
            Toast.success('Saved', `${itemName} has been saved`);
            Modal.close('groceryModal');
            await this.refresh();
        } else {
            Toast.error('Error', 'Failed to save item');
        }
    },

    async deleteItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (!confirm(`Delete "${item.item_name}"? This will also delete all usage records for this item.`)) {
            return;
        }

        const result = await API.deleteGrocery(itemId);

        if (result.success) {
            Toast.success('Deleted', `${item.item_name} has been deleted`);
            await this.refresh();
        } else {
            Toast.error('Error', 'Failed to delete item');
        }
    },

    // Bulk import items
    async bulkImport(items) {
        let successCount = 0;
        let failCount = 0;
        
        for (const item of items) {
            try {
                const result = await API.saveGrocery(item);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (e) {
                failCount++;
            }
        }
        
        await this.refresh();
        Toast.success('Import Complete', `Added ${successCount} items${failCount > 0 ? `, ${failCount} failed` : ''}`);
        return { successCount, failCount };
    },

    viewDetails(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        // Get usage history for this item
        const itemUsage = this.usageHistory
            .filter(u => u.grocery_id === itemId)
            .sort((a, b) => new Date(b.used_date || b.created_at) - new Date(a.used_date || a.created_at));

        const totalUsed = itemUsage.reduce((sum, u) => sum + (u.quantity_used || 0), 0);

        const usageHtml = itemUsage.length > 0 ? `
            <h4><i class="fas fa-history"></i> Usage History</h4>
            <table class="data-table mini-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Qty Used</th>
                        <th>Used By</th>
                        <th>Purpose</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemUsage.map(u => `
                        <tr>
                            <td>${Utils.formatDate(u.used_date)}</td>
                            <td>${u.quantity_used} ${item.unit}</td>
                            <td>${u.used_by || 'N/A'}</td>
                            <td>${u.purpose || 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="usage-summary">
                <strong>Total Used:</strong> ${totalUsed} ${item.unit}
            </div>
        ` : '<p class="no-usage">No usage recorded yet</p>';

        const content = `
            <div class="grocery-details-grid">
                <div class="detail-card">
                    <h4><i class="fas fa-info-circle"></i> Item Information</h4>
                    <div class="detail-row">
                        <span class="label">Name:</span>
                        <span class="value">${this.getCategoryEmoji(item.category)} ${item.item_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Category:</span>
                        <span class="value"><span class="category-badge ${item.category}">${item.category}</span></span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Current Qty:</span>
                        <span class="value"><strong>${item.quantity} ${item.unit}</strong></span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Cost:</span>
                        <span class="value">${Utils.formatCurrency(item.cost || 0)}</span>
                    </div>
                </div>
                <div class="detail-card">
                    <h4><i class="fas fa-calendar"></i> Dates & Source</h4>
                    <div class="detail-row">
                        <span class="label">Purchase Date:</span>
                        <span class="value">${item.purchase_date ? Utils.formatDate(item.purchase_date) : 'Not set'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Expiry Date:</span>
                        <span class="value ${this.isExpired(item.expiry_date) ? 'text-danger' : this.isExpiringSoon(item.expiry_date) ? 'text-warning' : ''}">${item.expiry_date ? Utils.formatDate(item.expiry_date) : 'Not set'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Supplier:</span>
                        <span class="value">${item.supplier || 'Not specified'}</span>
                    </div>
                </div>
                <div class="detail-card">
                    <h4><i class="fas fa-user"></i> Tracking Info</h4>
                    <div class="detail-row">
                        <span class="label">Purchased By:</span>
                        <span class="value">${item.purchased_by || 'Not specified'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Location:</span>
                        <span class="value">${item.location || 'Not specified'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Notes:</span>
                        <span class="value">${item.notes || 'None'}</span>
                    </div>
                </div>
            </div>
            <div class="usage-history-detail">
                ${usageHtml}
            </div>
        `;

        document.getElementById('groceryDetailsContent').innerHTML = content;
        Modal.open('groceryDetailsModal');
    },

    showUsageModal() {
        // Populate item dropdown
        const select = document.getElementById('usageGroceryId');
        select.innerHTML = '<option value="">-- Select Item --</option>' +
            this.items.map(item => `
                <option value="${item.id}">${this.getCategoryEmoji(item.category)} ${item.item_name} (${item.quantity} ${item.unit} available)</option>
            `).join('');

        document.getElementById('usageQuantity').value = '';
        document.getElementById('usageAvailable').value = '';
        document.getElementById('usageDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('usageUsedBy').value = '';
        document.getElementById('usagePurpose').value = '';
        document.getElementById('usageNotes').value = '';

        // Add change listener for item selection
        select.onchange = () => {
            const item = this.items.find(i => i.id === select.value);
            if (item) {
                document.getElementById('usageAvailable').value = `${item.quantity} ${item.unit}`;
            } else {
                document.getElementById('usageAvailable').value = '';
            }
        };

        Modal.open('groceryUsageModal');
    },

    quickUse(itemId) {
        this.showUsageModal();
        document.getElementById('usageGroceryId').value = itemId;
        
        const item = this.items.find(i => i.id === itemId);
        if (item) {
            document.getElementById('usageAvailable').value = `${item.quantity} ${item.unit}`;
        }
    },

    async recordUsage() {
        const groceryId = document.getElementById('usageGroceryId').value;
        const quantityUsed = parseFloat(document.getElementById('usageQuantity').value) || 0;
        const usedDate = document.getElementById('usageDate').value;
        const usedBy = document.getElementById('usageUsedBy').value.trim();
        const purpose = document.getElementById('usagePurpose').value.trim();
        const notes = document.getElementById('usageNotes').value.trim();

        if (!groceryId) {
            Toast.error('Required', 'Please select an item');
            return;
        }

        if (quantityUsed <= 0) {
            Toast.error('Required', 'Please enter quantity used');
            return;
        }

        const item = this.items.find(i => i.id === groceryId);
        if (item && quantityUsed > item.quantity) {
            Toast.error('Error', `Only ${item.quantity} ${item.unit} available`);
            return;
        }

        const usage = {
            grocery_id: groceryId,
            quantity_used: quantityUsed,
            used_date: usedDate || new Date().toISOString().split('T')[0],
            used_by: usedBy,
            purpose,
            notes
        };

        const result = await API.recordGroceryUsage(usage);

        if (result.success) {
            Toast.success('Recorded', 'Usage has been recorded');
            Modal.close('groceryUsageModal');
            await this.refresh();
        } else {
            Toast.error('Error', result.error || 'Failed to record usage');
        }
    },

    async deleteUsage(usageId) {
        if (!confirm('Delete this usage record?')) return;

        const result = await API.deleteGroceryUsage(usageId);

        if (result.success) {
            Toast.success('Deleted', 'Usage record deleted');
            await this.refresh();
        } else {
            Toast.error('Error', 'Failed to delete usage record');
        }
    }
};
