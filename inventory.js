// ===== Inventory Module =====
const Inventory = {
    searchQuery: '',
    
    refresh() {
        this.renderInventory();
    },

    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderInventory();
    },

    clearSearch() {
        this.searchQuery = '';
        document.getElementById('inventorySearch').value = '';
        this.renderInventory();
    },

    renderInventory() {
        const container = document.getElementById('inventoryGrid');
        let items = DataStore.inventory;
        
        // Apply search filter
        if (this.searchQuery) {
            items = items.filter(item => {
                const searchText = this.searchQuery;
                return (
                    item.name?.toLowerCase().includes(searchText) ||
                    item.category?.toLowerCase().includes(searchText) ||
                    item.description?.toLowerCase().includes(searchText) ||
                    String(item.stock).includes(searchText) ||
                    String(item.selling_price || item.sellingPrice).includes(searchText)
                );
            });
        }

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open"></i>
                    <h3>${this.searchQuery ? 'No Items Found' : 'No Items Yet'}</h3>
                    <p>${this.searchQuery ? 'Try a different search term' : 'Add your first inventory item'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = items.map(item => {
            const stockClass = item.stock === 0 ? 'out' : item.stock <= DataStore.settings.lowStockThreshold ? 'low' : 'good';
            const profit = (item.selling_price || item.sellingPrice) - (item.cost_price || item.costPrice);
            
            return `
                <div class="inventory-card ${stockClass}" data-id="${item.id}">
                    <div class="inventory-header">
                        <span class="inventory-category ${item.category}">${item.category === 'pickles' ? '🥒' : '🍪'} ${item.category}</span>
                        <span class="inventory-stock ${stockClass}">${item.stock} ${item.unit || 'pcs'}</span>
                    </div>
                    <h3 class="inventory-name">${item.name}</h3>
                    <p class="inventory-desc">${item.description || 'No description'}</p>
                    <div class="inventory-pricing">
                        <div class="price-item">
                            <span class="price-label">Cost</span>
                            <span class="price-value">${Utils.formatCurrency(item.cost_price || item.costPrice)}</span>
                        </div>
                        <div class="price-item">
                            <span class="price-label">Sell</span>
                            <span class="price-value">${Utils.formatCurrency(item.selling_price || item.sellingPrice)}</span>
                        </div>
                        <div class="price-item profit">
                            <span class="price-label">Profit</span>
                            <span class="price-value">${Utils.formatCurrency(profit)}</span>
                        </div>
                    </div>
                    <div class="inventory-actions">
                        <button class="btn-icon" onclick="Inventory.adjustStock('${item.id}', 1)" title="Add Stock"><i class="fas fa-plus"></i></button>
                        <button class="btn-icon" onclick="Inventory.adjustStock('${item.id}', -1)" title="Remove Stock"><i class="fas fa-minus"></i></button>
                        <button class="btn-icon" onclick="Inventory.editItem('${item.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Inventory.deleteItem('${item.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async saveItem() {
        const name = document.getElementById('itemName').value.trim();
        const category = document.getElementById('itemCategory').value;
        const costPrice = parseFloat(document.getElementById('itemCostPrice').value) || 0;
        const sellingPrice = parseFloat(document.getElementById('itemSellingPrice').value) || 0;
        const stock = parseInt(document.getElementById('itemStock').value) || 0;
        const unit = document.getElementById('itemUnit').value;
        const description = document.getElementById('itemDescription')?.value.trim() || '';
        const shelfLife = parseInt(document.getElementById('itemShelfLife')?.value) || null;

        if (!name) {
            Toast.error('Name Required', 'Please enter item name');
            return;
        }

        const item = {
            id: document.getElementById('itemId')?.value || null,
            name,
            category,
            costPrice,
            sellingPrice,
            stock,
            unit,
            description,
            shelfLife
        };

        const result = await API.saveInventory(item);
        
        if (result.success) {
            Toast.success('Saved', `${name} has been saved`);
            await DataStore.loadAll();
            Modal.close('inventoryModal');
            this.refresh();
            Dashboard.refresh();
            this.clearForm();
        } else {
            Toast.error('Error', 'Failed to save item');
        }
    },

    clearForm() {
        if (document.getElementById('itemId')) document.getElementById('itemId').value = '';
        document.getElementById('itemName').value = '';
        document.getElementById('itemCategory').value = 'snacks';
        document.getElementById('itemCostPrice').value = '';
        document.getElementById('itemSellingPrice').value = '';
        document.getElementById('itemStock').value = '';
        document.getElementById('itemUnit').value = 'packet';
        if (document.getElementById('itemDescription')) document.getElementById('itemDescription').value = '';
        if (document.getElementById('itemShelfLife')) document.getElementById('itemShelfLife').value = '';
    },

    editItem(itemId) {
        const item = DataStore.inventory.find(i => i.id === itemId);
        if (!item) return;

        if (document.getElementById('itemId')) document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemCategory').value = item.category;
        document.getElementById('itemCostPrice').value = item.cost_price || item.costPrice;
        document.getElementById('itemSellingPrice').value = item.selling_price || item.sellingPrice;
        document.getElementById('itemStock').value = item.stock;
        document.getElementById('itemUnit').value = item.unit || 'packet';
        if (document.getElementById('itemDescription')) document.getElementById('itemDescription').value = item.description || '';
        if (document.getElementById('itemShelfLife')) document.getElementById('itemShelfLife').value = item.shelf_life || item.shelfLife || '';

        Modal.open('inventoryModal');
    },

    async adjustStock(itemId, change) {
        const result = await API.updateStock(itemId, change);
        
        if (result.success) {
            await DataStore.loadAll();
            this.refresh();
            Dashboard.refresh();
        }
    },

    async deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) return;

        const result = await API.deleteInventory(itemId);
        
        if (result.success) {
            Toast.success('Deleted', 'Item has been deleted');
            await DataStore.loadAll();
            this.refresh();
            Dashboard.refresh();
        }
    }
};

// ===== Combos Module =====
const Combos = {
    currentCombo: { items: [], regularTotal: 0 },

    refresh() {
        this.renderCombos();
        this.populateComboItems();
    },

    renderCombos() {
        const container = document.getElementById('combosGrid');
        const combos = DataStore.combos;

        if (combos.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-gift"></i>
                    <h3>No Combos Yet</h3>
                    <p>Create combo offers to boost sales</p>
                </div>
            `;
            return;
        }

        container.innerHTML = combos.map(combo => `
            <div class="combo-card" data-id="${combo.id}">
                <div class="combo-header">
                    <h3 class="combo-name">📦 ${combo.name}</h3>
                    <span class="combo-savings">Save ${Utils.formatCurrency(combo.savings || 0)}</span>
                </div>
                <p class="combo-desc">${combo.description || 'No description'}</p>
                <div class="combo-items">
                    ${(combo.items || []).map(item => `<span class="combo-item-tag">${item.name} × ${item.quantity}</span>`).join('')}
                </div>
                <div class="combo-pricing">
                    <span class="combo-regular">Regular: <s>${Utils.formatCurrency(combo.regular_total || combo.regularTotal || 0)}</s></span>
                    <span class="combo-price">${Utils.formatCurrency(combo.price)}</span>
                </div>
                <div class="combo-actions">
                    <button class="btn-icon" onclick="Combos.editCombo('${combo.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="Combos.deleteCombo('${combo.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    },

    populateComboItems() {
        const select = document.getElementById('comboItemSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select an item...</option>';
        DataStore.inventory.forEach(item => {
            select.innerHTML += `<option value="${item.id}" data-price="${item.selling_price || item.sellingPrice}">${item.name} - ${Utils.formatCurrency(item.selling_price || item.sellingPrice)}</option>`;
        });
    },

    addItemToCombo() {
        const select = document.getElementById('comboItemSelect');
        const qty = parseInt(document.getElementById('comboItemQty').value) || 1;
        const itemId = select.value;

        if (!itemId) {
            Toast.warning('Select Item', 'Please select an item');
            return;
        }

        const item = DataStore.inventory.find(i => i.id === itemId);
        if (!item) return;

        const existing = this.currentCombo.items.find(i => i.itemId === itemId);
        if (existing) {
            existing.quantity += qty;
            existing.total = existing.quantity * existing.price;
        } else {
            this.currentCombo.items.push({
                itemId,
                name: item.name,
                price: item.selling_price || item.sellingPrice,
                quantity: qty,
                total: (item.selling_price || item.sellingPrice) * qty
            });
        }

        this.updateComboSummary();
        select.value = '';
        document.getElementById('comboItemQty').value = 1;
    },

    removeComboItem(index) {
        this.currentCombo.items.splice(index, 1);
        this.updateComboSummary();
    },

    updateComboSummary() {
        const container = document.getElementById('comboItemsList');
        
        if (this.currentCombo.items.length === 0) {
            container.innerHTML = '<p class="empty-text">No items added</p>';
            document.getElementById('comboRegularTotal').textContent = '$0.00';
            return;
        }

        container.innerHTML = this.currentCombo.items.map((item, index) => `
            <div class="combo-summary-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>${Utils.formatCurrency(item.total)}</span>
                <button class="btn-remove" onclick="Combos.removeComboItem(${index})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');

        this.currentCombo.regularTotal = this.currentCombo.items.reduce((sum, item) => sum + item.total, 0);
        document.getElementById('comboRegularTotal').textContent = Utils.formatCurrency(this.currentCombo.regularTotal);
    },

    async saveCombo() {
        const name = document.getElementById('comboName').value.trim();
        const description = document.getElementById('comboDescription')?.value.trim() || '';
        const price = parseFloat(document.getElementById('comboPrice').value) || 0;

        if (!name) {
            Toast.error('Name Required', 'Please enter combo name');
            return;
        }

        if (this.currentCombo.items.length < 2) {
            Toast.error('Add Items', 'Combo must have at least 2 items');
            return;
        }

        const combo = {
            id: document.getElementById('comboId')?.value || null,
            name,
            description,
            price,
            items: this.currentCombo.items,
            regularTotal: this.currentCombo.regularTotal,
            savings: this.currentCombo.regularTotal - price
        };

        const result = await API.saveCombo(combo);
        
        if (result.success) {
            Toast.success('Saved', `${name} combo has been saved`);
            await DataStore.loadAll();
            Modal.close('comboModal');
            this.refresh();
            this.clearForm();
        } else {
            Toast.error('Error', 'Failed to save combo');
        }
    },

    clearForm() {
        this.currentCombo = { items: [], regularTotal: 0 };
        if (document.getElementById('comboId')) document.getElementById('comboId').value = '';
        document.getElementById('comboName').value = '';
        if (document.getElementById('comboDescription')) document.getElementById('comboDescription').value = '';
        document.getElementById('comboPrice').value = '';
        this.updateComboSummary();
    },

    editCombo(comboId) {
        const combo = DataStore.combos.find(c => c.id === comboId);
        if (!combo) return;

        this.currentCombo = {
            items: [...(combo.items || [])],
            regularTotal: combo.regular_total || combo.regularTotal || 0
        };

        if (document.getElementById('comboId')) document.getElementById('comboId').value = combo.id;
        document.getElementById('comboName').value = combo.name;
        if (document.getElementById('comboDescription')) document.getElementById('comboDescription').value = combo.description || '';
        document.getElementById('comboPrice').value = combo.price;

        this.updateComboSummary();
        Modal.open('comboModal');
    },

    async deleteCombo(comboId) {
        if (!confirm('Are you sure you want to delete this combo?')) return;

        const result = await API.deleteCombo(comboId);
        
        if (result.success) {
            Toast.success('Deleted', 'Combo has been deleted');
            await DataStore.loadAll();
            this.refresh();
        }
    }
};
