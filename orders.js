// ===== Orders Module =====
const Orders = {
    currentOrder: { items: [], subtotal: 0, discount: 0, total: 0 },
    editingOrderId: null,
    viewingOrderId: null,
    searchQuery: '',

    refresh() {
        this.renderOrders();
        this.populateItemSelect();
        this.populateComboSelect();
    },

    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderOrders();
    },

    clearSearch() {
        this.searchQuery = '';
        document.getElementById('ordersSearch').value = '';
        this.renderOrders();
    },

    renderOrders() {
        const container = document.getElementById('ordersGrid');
        let orders = DataStore.orders;

        // Apply search filter
        if (this.searchQuery) {
            orders = orders.filter(order => {
                const searchText = [
                    order.order_id || order.orderId,
                    order.customer_name || order.customerName,
                    order.customer_phone || order.customerPhone,
                    order.customer_email || order.customerEmail,
                    order.status,
                    ...(order.items || []).map(i => i.name)
                ].join(' ').toLowerCase();
                return searchText.includes(this.searchQuery);
            });
        }

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-${this.searchQuery ? 'search' : 'shopping-cart'}"></i>
                    <h3>${this.searchQuery ? 'No Results Found' : 'No Orders Yet'}</h3>
                    <p>${this.searchQuery ? 'Try a different search term' : 'Create your first order to get started'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => {
            const statusClass = order.status || 'pending';
            const statusIcons = {
                'pending': 'clock',
                'processing': 'spinner',
                'ready': 'box',
                'delivered': 'truck',
                'completed': 'check-circle',
                'cancelled': 'times-circle'
            };
            const statusLabels = {
                'pending': 'Pending',
                'processing': 'Processing',
                'ready': 'Ready for Delivery',
                'delivered': 'Delivered',
                'completed': 'Completed',
                'cancelled': 'Cancelled'
            };
            const statusIcon = statusIcons[order.status] || 'clock';
            const statusLabel = statusLabels[order.status] || order.status;
            
            // Build item tags with combo details
            const itemTags = (order.items || []).slice(0, 3).map(item => {
                if (item.isCombo && item.comboDescription) {
                    return `<span class="item-tag combo-tag" title="${item.comboDescription}">📦 ${item.name}</span>`;
                }
                return `<span class="item-tag">${item.name} × ${item.quantity}</span>`;
            }).join('');
            
            return `
                <div class="order-card ${statusClass}" data-id="${order.id}">
                    <div class="order-header">
                        <span class="order-id">${order.order_id || order.orderId}</span>
                        <span class="order-status ${statusClass}"><i class="fas fa-${statusIcon}"></i> ${statusLabel}</span>
                    </div>
                    <div class="order-customer">
                        <div class="customer-avatar">${Utils.getInitials(order.customer_name || order.customerName)}</div>
                        <div>
                            <div class="customer-name">${order.customer_name || order.customerName}</div>
                            <div class="customer-phone">${order.customer_phone || order.customerPhone || 'No phone'}</div>
                        </div>
                    </div>
                    <div class="order-items">
                        ${itemTags}
                        ${(order.items || []).length > 3 ? `<span class="item-tag more">+${order.items.length - 3} more</span>` : ''}
                    </div>
                    <div class="order-footer">
                        <span class="order-total">${Utils.formatCurrency(order.total)}</span>
                        ${order.deadline ? `<span class="order-deadline"><i class="fas fa-calendar"></i> ${Utils.formatDate(order.deadline)}</span>` : ''}
                    </div>
                    <div class="order-actions">
                        <button class="btn-icon" onclick="Orders.viewOrder('${order.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" onclick="Orders.editOrder('${order.id}')" title="Edit Order"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon danger" onclick="Orders.deleteOrder('${order.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    populateItemSelect() {
        // Setup autocomplete for smart item input
        this.setupSmartItemAutocomplete();
        // Setup autocomplete for customer search
        this.setupCustomerAutocomplete();
    },

    setupCustomerAutocomplete() {
        const input = document.getElementById('orderCustomerName');
        const suggestionsDiv = document.getElementById('customerSuggestions');
        if (!input || !suggestionsDiv) return;

        // Remove existing listeners
        input.removeEventListener('input', this.handleCustomerInput);
        input.removeEventListener('focus', this.handleCustomerFocus);

        // Bind handlers
        this.handleCustomerInput = (e) => this.showCustomerSuggestions(e.target.value);
        this.handleCustomerFocus = () => this.showCustomerSuggestions(input.value);

        input.addEventListener('input', this.handleCustomerInput);
        input.addEventListener('focus', this.handleCustomerFocus);
    },

    showCustomerSuggestions(query) {
        const suggestionsDiv = document.getElementById('customerSuggestions');
        if (!suggestionsDiv) return;

        const q = query.toLowerCase().trim();
        
        if (q.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        // Search from customers AND order history for unique customers
        const existingCustomers = new Map();
        
        // Add from customers list
        DataStore.customers.forEach(c => {
            const key = (c.name + c.phone).toLowerCase();
            if (!existingCustomers.has(key)) {
                existingCustomers.set(key, {
                    name: c.name,
                    phone: c.phone || '',
                    email: c.email || '',
                    address: c.address || '',
                    source: 'customer'
                });
            }
        });
        
        // Add from order history
        DataStore.orderHistory.forEach(o => {
            const name = o.customer_name || o.customerName;
            const phone = o.customer_phone || o.customerPhone || '';
            const key = (name + phone).toLowerCase();
            if (!existingCustomers.has(key)) {
                existingCustomers.set(key, {
                    name: name,
                    phone: phone,
                    email: o.customer_email || o.customerEmail || '',
                    address: o.customer_address || o.customerAddress || '',
                    source: 'history'
                });
            }
        });
        
        // Add from current orders
        DataStore.orders.forEach(o => {
            const name = o.customer_name || o.customerName;
            const phone = o.customer_phone || o.customerPhone || '';
            const key = (name + phone).toLowerCase();
            if (!existingCustomers.has(key)) {
                existingCustomers.set(key, {
                    name: name,
                    phone: phone,
                    email: o.customer_email || o.customerEmail || '',
                    address: o.customer_address || o.customerAddress || '',
                    source: 'orders'
                });
            }
        });

        // Filter matching customers
        const matches = Array.from(existingCustomers.values()).filter(c => 
            c.name.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q)
        ).slice(0, 8);

        if (matches.length === 0) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        suggestionsDiv.innerHTML = matches.map(c => `
            <div class="suggestion-item customer-suggestion" onclick="Orders.selectCustomer('${c.name.replace(/'/g, "\\'")}', '${c.phone.replace(/'/g, "\\'")}', '${c.email.replace(/'/g, "\\'")}', '${c.address.replace(/'/g, "\\'")}')">
                <div class="suggestion-main">
                    <span class="suggestion-name"><i class="fas fa-user"></i> ${c.name}</span>
                    ${c.phone ? `<span class="suggestion-phone"><i class="fas fa-phone"></i> ${c.phone}</span>` : ''}
                </div>
                ${c.email ? `<span class="suggestion-email"><i class="fas fa-envelope"></i> ${c.email}</span>` : ''}
            </div>
        `).join('');
        
        suggestionsDiv.style.display = 'block';
    },

    selectCustomer(name, phone, email, address) {
        document.getElementById('orderCustomerName').value = name;
        document.getElementById('orderCustomerPhone').value = phone;
        if (document.getElementById('orderCustomerEmail')) {
            document.getElementById('orderCustomerEmail').value = email;
        }
        if (document.getElementById('orderCustomerAddress')) {
            document.getElementById('orderCustomerAddress').value = address;
        }
        document.getElementById('customerSuggestions').style.display = 'none';
        
        // Focus on deadline or items section
        document.getElementById('orderDeadline').focus();
        Toast.info('Customer Loaded', `${name}'s details have been filled in`);
    },

    setupSmartItemAutocomplete() {
        const input = document.getElementById('smartItemName');
        const suggestionsDiv = document.getElementById('itemSuggestions');
        if (!input || !suggestionsDiv) return;

        // Remove existing listeners
        input.removeEventListener('input', this.handleSmartItemInput);
        input.removeEventListener('focus', this.handleSmartItemFocus);
        document.removeEventListener('click', this.handleDocumentClick);

        // Bind handlers
        this.handleSmartItemInput = (e) => this.showItemSuggestions(e.target.value);
        this.handleSmartItemFocus = () => this.showItemSuggestions(input.value);
        this.handleDocumentClick = (e) => {
            if (!e.target.closest('.autocomplete-wrapper')) {
                suggestionsDiv.style.display = 'none';
                const customerSuggestions = document.getElementById('customerSuggestions');
                if (customerSuggestions) customerSuggestions.style.display = 'none';
            }
        };

        input.addEventListener('input', this.handleSmartItemInput);
        input.addEventListener('focus', this.handleSmartItemFocus);
        document.addEventListener('click', this.handleDocumentClick);
    },

    showItemSuggestions(query) {
        const suggestionsDiv = document.getElementById('itemSuggestions');
        if (!suggestionsDiv) return;

        const q = query.toLowerCase().trim();
        
        if (q.length === 0) {
            // Show all inventory items when empty
            const allItems = DataStore.inventory.slice(0, 10);
            if (allItems.length > 0) {
                suggestionsDiv.innerHTML = allItems.map(item => `
                    <div class="suggestion-item" onclick="Orders.selectSuggestion('${item.id}')">
                        <span class="suggestion-name">${item.category === 'pickles' ? '🥒' : '🍪'} ${item.name}</span>
                        <span class="suggestion-price">${Utils.formatCurrency(item.selling_price || item.sellingPrice)}</span>
                        <span class="suggestion-stock ${item.stock <= 0 ? 'out-of-stock' : ''}">${item.stock} left</span>
                    </div>
                `).join('');
                suggestionsDiv.style.display = 'block';
            } else {
                suggestionsDiv.style.display = 'none';
            }
            return;
        }

        // Filter inventory by query
        const matches = DataStore.inventory.filter(item => 
            item.name.toLowerCase().includes(q)
        ).slice(0, 8);

        if (matches.length > 0) {
            suggestionsDiv.innerHTML = matches.map(item => `
                <div class="suggestion-item" onclick="Orders.selectSuggestion('${item.id}')">
                    <span class="suggestion-name">${item.category === 'pickles' ? '🥒' : '🍪'} ${item.name}</span>
                    <span class="suggestion-price">${Utils.formatCurrency(item.selling_price || item.sellingPrice)}</span>
                    <span class="suggestion-stock ${item.stock <= 0 ? 'out-of-stock' : ''}">${item.stock} left</span>
                </div>
            `).join('') + `
                <div class="suggestion-item manual-add" onclick="Orders.useAsManual()">
                    <span class="suggestion-name"><i class="fas fa-plus-circle"></i> Add "${query}" as custom item</span>
                </div>
            `;
        } else {
            suggestionsDiv.innerHTML = `
                <div class="suggestion-item manual-add" onclick="Orders.useAsManual()">
                    <span class="suggestion-name"><i class="fas fa-plus-circle"></i> Add "${query}" as custom item</span>
                </div>
            `;
        }
        suggestionsDiv.style.display = 'block';
    },

    selectSuggestion(itemId) {
        const item = DataStore.inventory.find(i => i.id === itemId);
        if (!item) return;

        document.getElementById('smartItemName').value = item.name;
        document.getElementById('smartItemPrice').value = (item.selling_price || item.sellingPrice).toFixed(2);
        document.getElementById('smartItemId').value = itemId;
        document.getElementById('itemSuggestions').style.display = 'none';
        
        // Focus on quantity
        document.getElementById('smartItemQty').focus();
        document.getElementById('smartItemQty').select();
    },

    useAsManual() {
        document.getElementById('smartItemId').value = '';
        document.getElementById('itemSuggestions').style.display = 'none';
        document.getElementById('smartItemPrice').focus();
    },

    addSmartItem() {
        const name = document.getElementById('smartItemName').value.trim();
        const price = parseFloat(document.getElementById('smartItemPrice').value) || 0;
        const qty = parseInt(document.getElementById('smartItemQty').value) || 1;
        const weight = parseFloat(document.getElementById('smartItemWeight').value) || 0;
        const weightUnit = document.getElementById('smartItemWeightUnit').value;
        const itemId = document.getElementById('smartItemId').value;

        if (!name) {
            Toast.warning('Enter Name', 'Please enter or select an item');
            return;
        }
        if (price <= 0) {
            Toast.warning('Enter Price', 'Please enter a valid price');
            return;
        }

        // Check inventory stock if it's from inventory
        if (itemId) {
            const invItem = DataStore.inventory.find(i => i.id === itemId);
            if (invItem && invItem.stock < qty) {
                Toast.warning('Insufficient Stock', `Only ${invItem.stock} available`);
                return;
            }
        }

        // Convert weight to grams for storage
        let weightInGrams = weight;
        if (weightUnit === 'kg') weightInGrams = weight * 1000;
        if (weightUnit === 'lbs') weightInGrams = weight * 453.592;

        const newItem = {
            itemId: itemId || 'manual_' + Date.now(),
            name: name,
            price: price,
            quantity: qty,
            total: price * qty,
            weight: weightInGrams,
            weightDisplay: weight > 0 ? `${weight} ${weightUnit}` : '',
            isCombo: false,
            isManual: !itemId
        };

        // Check if same item exists (non-combo, same itemId)
        if (itemId) {
            const existing = this.currentOrder.items.find(i => i.itemId === itemId && !i.isCombo);
            if (existing) {
                existing.quantity += qty;
                existing.total = existing.quantity * existing.price;
                existing.weight = (existing.weight || 0) + weightInGrams;
                if (weight > 0) {
                    existing.weightDisplay = this.formatWeight(existing.weight);
                }
            } else {
                this.currentOrder.items.push(newItem);
            }
        } else {
            this.currentOrder.items.push(newItem);
        }

        this.updateOrderSummary();
        
        // Clear inputs
        document.getElementById('smartItemName').value = '';
        document.getElementById('smartItemPrice').value = '';
        document.getElementById('smartItemQty').value = 1;
        document.getElementById('smartItemWeight').value = '';
        document.getElementById('smartItemWeightUnit').value = 'g';
        document.getElementById('smartItemId').value = '';
        
        Toast.success('Item Added', `${name} × ${qty} added to order`);
    },

    formatWeight(grams) {
        if (grams >= 1000) {
            return `${(grams / 1000).toFixed(2)} kg`;
        }
        return `${grams.toFixed(0)} g`;
    },

    populateComboSelect() {
        const select = document.getElementById('orderComboSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a combo...</option>';
        DataStore.combos.forEach(combo => {
            select.innerHTML += `<option value="${combo.id}" data-price="${combo.price}">${combo.name} - ${Utils.formatCurrency(combo.price)} (Save ${Utils.formatCurrency(combo.savings || 0)})</option>`;
        });
    },

    openComboSelector(comboType) {
        // comboType: '4-combo' for $22, '2-combo' for $15
        const itemCount = comboType === '4-combo' ? 4 : 2;
        const defaultPrice = comboType === '4-combo' ? 22.00 : 15.00;
        
        // Get available snack items
        const snacks = DataStore.inventory.filter(i => i.category === 'snacks');
        
        let checkboxesHtml = snacks.map(item => `
            <label class="combo-item-checkbox">
                <input type="checkbox" name="comboItem" value="${item.id}" data-name="${item.name}">
                <span class="checkbox-label">${item.name}</span>
                <span class="checkbox-stock">${item.stock || 0} in stock</span>
            </label>
        `).join('');
        
        const modalHtml = `
            <div id="comboSelectorModal" class="modal active">
                <div class="modal-content combo-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-gift"></i> Create Combo (${itemCount} Items)</h3>
                        <button class="modal-close" onclick="Orders.closeComboSelector()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="combo-instruction">Select exactly <strong>${itemCount} items</strong> for this combo:</p>
                        <div class="combo-checkboxes">
                            ${checkboxesHtml}
                        </div>
                        <p class="selected-count">Selected: <span id="comboSelectedCount">0</span> / ${itemCount}</p>
                        
                        <div class="combo-pricing">
                            <div class="combo-price-row">
                                <div class="combo-input-group">
                                    <label><i class="fas fa-dollar-sign"></i> Combo Price</label>
                                    <input type="number" id="comboPriceInput" class="form-control" value="${defaultPrice}" step="0.01" min="0">
                                </div>
                                <div class="combo-input-group">
                                    <label><i class="fas fa-weight-hanging"></i> Total Weight</label>
                                    <div class="combo-weight-input">
                                        <input type="number" id="comboWeightInput" class="form-control" value="" placeholder="0" step="0.01">
                                        <select id="comboWeightUnit" class="form-control">
                                            <option value="g">g</option>
                                            <option value="kg">kg</option>
                                            <option value="lbs">lbs</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <p class="combo-price-hint">💡 Default: $${defaultPrice.toFixed(2)} - You can adjust the price above</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Orders.closeComboSelector()">Cancel</button>
                        <button class="btn btn-primary" onclick="Orders.confirmComboSelection('${comboType}', ${itemCount})">
                            <i class="fas fa-check"></i> Add Combo
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('comboSelectorModal');
        if (existingModal) existingModal.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Add change listeners to update count
        document.querySelectorAll('#comboSelectorModal input[name="comboItem"]').forEach(cb => {
            cb.addEventListener('change', () => {
                const checked = document.querySelectorAll('#comboSelectorModal input[name="comboItem"]:checked').length;
                document.getElementById('comboSelectedCount').textContent = checked;
            });
        });
    },
    
    closeComboSelector() {
        const modal = document.getElementById('comboSelectorModal');
        if (modal) modal.remove();
    },
    
    confirmComboSelection(comboType, requiredCount) {
        const checked = document.querySelectorAll('#comboSelectorModal input[name="comboItem"]:checked');
        
        if (checked.length !== requiredCount) {
            Toast.warning('Select Items', `Please select exactly ${requiredCount} items`);
            return;
        }
        
        // Get custom price
        const customPrice = parseFloat(document.getElementById('comboPriceInput').value) || (comboType === '4-combo' ? 22.00 : 15.00);
        
        // Get weight
        const weightValue = parseFloat(document.getElementById('comboWeightInput').value) || 0;
        const weightUnit = document.getElementById('comboWeightUnit').value;
        
        // Convert weight to grams for storage
        let weightInGrams = 0;
        let weightDisplay = '';
        if (weightValue > 0) {
            if (weightUnit === 'kg') {
                weightInGrams = weightValue * 1000;
            } else if (weightUnit === 'lbs') {
                weightInGrams = weightValue * 453.592;
            } else {
                weightInGrams = weightValue;
            }
            weightDisplay = `${weightValue} ${weightUnit}`;
        }
        
        const selectedItems = Array.from(checked).map(cb => ({
            itemId: cb.value,
            name: cb.dataset.name,
            quantity: 1
        }));
        
        const comboName = comboType === '4-combo' ? 'Any 4 Items Combo' : 'Any 2 Items Combo';
        const itemNames = selectedItems.map(i => i.name).join(', ');
        
        this.currentOrder.items.push({
            itemId: 'combo_' + Date.now(),
            name: comboName,
            price: customPrice,
            quantity: 1,
            total: customPrice,
            isCombo: true,
            comboItems: selectedItems,
            comboDescription: itemNames,
            weight: weightInGrams,
            weightDisplay: weightDisplay
        });
        
        this.updateOrderSummary();
        this.closeComboSelector();
        Toast.success('Combo Added', `${comboName} ($${customPrice.toFixed(2)}) added with: ${itemNames}`);
    },

    addComboToOrder() {
        const select = document.getElementById('orderComboSelect');
        const comboType = select.value;

        console.log('Selected combo type:', comboType); // Debug log

        if (!comboType) {
            Toast.warning('Select Combo', 'Please select a combo type first');
            return;
        }

        this.openComboSelector(comboType);
        select.value = ''; // Reset after opening
    },

    removeOrderItem(index) {
        this.currentOrder.items.splice(index, 1);
        this.updateOrderSummary();
    },

    updateOrderSummary() {
        const container = document.getElementById('orderItems');
        
        if (this.currentOrder.items.length === 0) {
            container.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-basket"></i><p>No items added yet</p></div>';
            document.getElementById('orderSubtotal').textContent = '$0.00';
            document.getElementById('orderDiscount').textContent = '$0.00';
            document.getElementById('orderTotal').textContent = '$0.00';
            document.getElementById('orderTotalWeight').textContent = '0 g';
            return;
        }

        container.innerHTML = this.currentOrder.items.map((item, index) => {
            let comboDetails = '';
            if (item.isCombo && item.comboDescription) {
                comboDetails = `<div class="combo-items-detail"><i class="fas fa-list"></i> ${item.comboDescription}</div>`;
            }
            const weightInfo = item.weightDisplay ? `<span class="item-weight"><i class="fas fa-weight-hanging"></i> ${item.weightDisplay}</span>` : '';
            return `
                <div class="order-summary-item ${item.isCombo ? 'combo-order-item' : ''}">
                    <div class="item-details">
                        <span class="item-name">${item.isCombo ? '📦 ' : ''}${item.isManual ? '✏️ ' : ''}${item.name}</span>
                        ${comboDetails}
                        <span class="item-qty">${Utils.formatCurrency(item.price)} × ${item.quantity} ${weightInfo}</span>
                    </div>
                    <div class="item-actions">
                        <span class="item-total">${Utils.formatCurrency(item.total)}</span>
                        <button class="btn-remove" onclick="Orders.removeOrderItem(${index})"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        this.currentOrder.subtotal = this.currentOrder.items.reduce((sum, item) => sum + item.total, 0);
        this.currentOrder.discount = parseFloat(document.getElementById('orderDiscountInput')?.value) || 0;
        this.currentOrder.total = this.currentOrder.subtotal - this.currentOrder.discount;

        // Calculate total weight
        const totalWeightGrams = this.currentOrder.items.reduce((sum, item) => sum + (item.weight || 0), 0);
        this.currentOrder.totalWeight = totalWeightGrams;

        document.getElementById('orderSubtotal').textContent = Utils.formatCurrency(this.currentOrder.subtotal);
        document.getElementById('orderDiscount').textContent = Utils.formatCurrency(this.currentOrder.discount);
        document.getElementById('orderTotal').textContent = Utils.formatCurrency(this.currentOrder.total);
        document.getElementById('orderTotalWeight').textContent = this.formatWeight(totalWeightGrams);
    },

    async saveOrder() {
        const customerName = document.getElementById('orderCustomerName').value.trim();
        const customerPhone = document.getElementById('orderCustomerPhone').value.trim();
        const customerEmail = document.getElementById('orderCustomerEmail')?.value.trim() || '';
        const customerAddress = document.getElementById('orderCustomerAddress')?.value.trim() || '';
        const deadline = document.getElementById('orderDeadline').value;
        const notes = document.getElementById('orderNotes')?.value.trim() || '';

        if (!customerName) {
            Toast.error('Customer Required', 'Please enter customer name');
            return;
        }

        if (this.currentOrder.items.length === 0) {
            Toast.error('No Items', 'Please add at least one item to the order');
            return;
        }

        const order = {
            customerName,
            customerPhone,
            customerEmail,
            customerAddress,
            items: this.currentOrder.items,
            subtotal: this.currentOrder.subtotal,
            discount: this.currentOrder.discount,
            total: this.currentOrder.total,
            deadline,
            notes,
            status: 'pending'
        };

        let result;
        if (this.editingOrderId) {
            // Update existing order
            order.id = this.editingOrderId;
            result = await API.updateOrder(order);
            if (result.success) {
                Toast.success('Order Updated', `Order has been updated`);
            }
        } else {
            // Create new order
            result = await API.saveOrder(order);
            if (result.success) {
                Toast.success('Order Created', `Order ${result.orderId} has been created`);
            }
        }
        
        if (result.success) {
            await DataStore.loadAll();
            this.clearOrderForm();
            Modal.close('orderModal');
            this.refresh();
            Dashboard.refresh();
        } else {
            Toast.error('Error', 'Failed to save order');
        }
    },

    clearOrderForm() {
        this.currentOrder = { items: [], subtotal: 0, discount: 0, total: 0 };
        this.editingOrderId = null;
        document.getElementById('editingOrderId').value = '';
        document.getElementById('orderModalTitle').textContent = 'New Order';
        document.getElementById('orderSaveBtnText').textContent = 'Create Order';
        document.getElementById('orderCustomerName').value = '';
        document.getElementById('orderCustomerPhone').value = '';
        if (document.getElementById('orderCustomerEmail')) document.getElementById('orderCustomerEmail').value = '';
        if (document.getElementById('orderCustomerAddress')) document.getElementById('orderCustomerAddress').value = '';
        document.getElementById('orderDeadline').value = '';
        if (document.getElementById('orderNotes')) document.getElementById('orderNotes').value = '';
        if (document.getElementById('orderDiscountInput')) document.getElementById('orderDiscountInput').value = '0';
        this.updateOrderSummary();
    },

    editOrder(orderId) {
        // If called from view modal without orderId, use the viewing order
        if (!orderId && this.viewingOrderId) {
            orderId = this.viewingOrderId;
        }
        
        const order = DataStore.orders.find(o => o.id === orderId);
        if (!order) return;

        // Close view modal if open
        Modal.close('viewOrderModal');

        // Set editing mode
        this.editingOrderId = orderId;
        document.getElementById('editingOrderId').value = orderId;
        document.getElementById('orderModalTitle').textContent = 'Edit Order - ' + (order.order_id || order.orderId);
        document.getElementById('orderSaveBtnText').textContent = 'Update Order';

        // Fill customer details
        document.getElementById('orderCustomerName').value = order.customer_name || order.customerName || '';
        document.getElementById('orderCustomerPhone').value = order.customer_phone || order.customerPhone || '';
        if (document.getElementById('orderCustomerEmail')) {
            document.getElementById('orderCustomerEmail').value = order.customer_email || order.customerEmail || '';
        }
        if (document.getElementById('orderCustomerAddress')) {
            document.getElementById('orderCustomerAddress').value = order.customer_address || order.customerAddress || '';
        }
        document.getElementById('orderDeadline').value = order.deadline || '';
        if (document.getElementById('orderNotes')) {
            document.getElementById('orderNotes').value = order.notes || '';
        }

        // Load items
        this.currentOrder.items = JSON.parse(JSON.stringify(order.items || []));
        this.currentOrder.discount = order.discount || 0;
        if (document.getElementById('orderDiscountInput')) {
            document.getElementById('orderDiscountInput').value = order.discount || 0;
        }

        this.updateOrderSummary();
        Modal.open('orderModal');
    },

    async updateStatus(orderId) {
        const order = DataStore.orders.find(o => o.id === orderId);
        if (!order) return;

        const statuses = ['pending', 'processing', 'ready', 'delivered'];
        const currentIndex = statuses.indexOf(order.status);
        const nextStatus = statuses[(currentIndex + 1) % statuses.length];

        const result = await API.updateOrderStatus(orderId, nextStatus);
        
        if (result.success) {
            Toast.success('Status Updated', `Order status changed to ${nextStatus}`);
            await DataStore.loadAll();
            this.refresh();
            Dashboard.refresh();
            if (nextStatus === 'delivered') {
                History.refresh();
            }
        }
    },

    async changeStatus() {
        const newStatus = document.getElementById('viewOrderStatus').value;
        if (!this.viewingOrderId) return;

        const result = await API.updateOrderStatus(this.viewingOrderId, newStatus);
        
        if (result.success) {
            Toast.success('Status Updated', `Order status changed to ${newStatus}`);
            await DataStore.loadAll();
            this.refresh();
            Dashboard.refresh();
            
            // Show/hide payment row when status is delivered
            this.updatePaymentVisibility(newStatus);
        }
    },

    updatePaymentVisibility(status) {
        const paymentRow = document.getElementById('paymentRow');
        const completeBtn = document.getElementById('completeOrderBtn');
        
        if (status === 'delivered') {
            paymentRow.style.display = 'flex';
        } else {
            paymentRow.style.display = 'none';
            completeBtn.style.display = 'none';
            document.getElementById('paymentReceived').checked = false;
        }
    },

    togglePaymentReceived() {
        const isChecked = document.getElementById('paymentReceived').checked;
        const completeBtn = document.getElementById('completeOrderBtn');
        
        if (isChecked) {
            completeBtn.style.display = 'inline-flex';
        } else {
            completeBtn.style.display = 'none';
        }
    },

    async completeOrder() {
        if (!this.viewingOrderId) return;
        
        const order = DataStore.orders.find(o => o.id === this.viewingOrderId);
        if (!order) return;
        
        if (!confirm('Complete this order? It will be moved to History and Today\'s Income will be updated.')) {
            return;
        }
        
        // Use Texas CST time so income is recorded for TODAY in Texas timezone
        const texasDateTime = Utils.getTexasISOString();
        
        // Update status to completed and move to history
        const result = await API.updateOrderStatus(this.viewingOrderId, 'completed', texasDateTime);
        
        if (result.success) {
            Toast.success('Order Completed', `Order moved to history. Income: ${Utils.formatCurrency(order.total)}`);
            Modal.close('viewOrderModal');
            await DataStore.loadAll();
            this.refresh();
            Dashboard.refresh();
            History.refresh();
        }
    },

    printReceipt() {
        if (!this.viewingOrderId) return;
        
        const order = DataStore.orders.find(o => o.id === this.viewingOrderId);
        if (!order) return;
        
        const receiptHtml = this.createReceiptHtml(order);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(receiptHtml);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    },

    createReceiptHtml(order) {
        const itemsHtml = (order.items || []).map(item => {
            const weightText = item.weightDisplay ? ` (${item.weightDisplay})` : '';
            return `
                <tr>
                    <td style="padding: 5px; border-bottom: 1px dashed #ddd;">${item.isCombo ? '📦 ' : ''}${item.name}${weightText}</td>
                    <td style="padding: 5px; border-bottom: 1px dashed #ddd; text-align: center;">${item.quantity}</td>
                    <td style="padding: 5px; border-bottom: 1px dashed #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
                    <td style="padding: 5px; border-bottom: 1px dashed #ddd; text-align: right;">$${item.total.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
        
        // Calculate total weight
        const totalWeightGrams = (order.items || []).reduce((sum, item) => sum + (item.weight || 0), 0);
        const totalWeightText = totalWeightGrams > 0 ? this.formatWeight(totalWeightGrams) : '';
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${order.order_id || order.orderId}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 350px; margin: 0 auto; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .header h1 { margin: 0; font-size: 18px; }
                    .header p { margin: 5px 0; font-size: 12px; }
                    .order-info { margin-bottom: 15px; font-size: 12px; }
                    .order-info p { margin: 3px 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th { text-align: left; border-bottom: 1px solid #000; padding: 5px; }
                    .totals { margin-top: 15px; border-top: 2px solid #000; padding-top: 10px; }
                    .totals p { margin: 5px 0; font-size: 12px; display: flex; justify-content: space-between; }
                    .grand-total { font-size: 16px !important; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 11px; border-top: 1px dashed #000; padding-top: 10px; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🏺 90's JAR</h1>
                    <p>Homemade Sankranti Snacks & Pickles</p>
                    <p>📞 +1 6822742570</p>
                </div>
                
                <div class="order-info">
                    <p><strong>Order:</strong> ${order.order_id || order.orderId}</p>
                    <p><strong>Date:</strong> ${Utils.getTexasDate()}</p>
                    <p><strong>Customer:</strong> ${order.customer_name || order.customerName}</p>
                    <p><strong>Phone:</strong> ${order.customer_phone || order.customerPhone || 'N/A'}</p>
                    ${order.customer_address || order.customerAddress ? `<p><strong>Address:</strong> ${order.customer_address || order.customerAddress}</p>` : ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="totals">
                    <p><span>Subtotal:</span> <span>$${(order.subtotal || order.total).toFixed(2)}</span></p>
                    ${order.discount ? `<p><span>Discount:</span> <span>-$${order.discount.toFixed(2)}</span></p>` : ''}
                    ${totalWeightText ? `<p><span>Total Weight:</span> <span>${totalWeightText}</span></p>` : ''}
                    <p class="grand-total"><span>TOTAL:</span> <span>$${order.total.toFixed(2)}</span></p>
                </div>
                
                <div class="footer">
                    <p>Thank you for your order!</p>
                    <p>🙏 Visit us again!</p>
                </div>
            </body>
            </html>
        `;
    },

    viewOrder(orderId) {
        const order = DataStore.orders.find(o => o.id === orderId);
        if (!order) return;

        this.viewingOrderId = orderId;

        const modal = document.getElementById('viewOrderModal');
        if (!modal) return;

        document.getElementById('viewOrderId').textContent = order.order_id || order.orderId;
        document.getElementById('viewOrderCustomer').textContent = order.customer_name || order.customerName;
        document.getElementById('viewOrderPhone').textContent = order.customer_phone || order.customerPhone || 'N/A';
        document.getElementById('viewOrderEmail').textContent = order.customer_email || order.customerEmail || 'N/A';
        document.getElementById('viewOrderAddress').textContent = order.customer_address || order.customerAddress || 'N/A';
        document.getElementById('viewOrderDeadline').textContent = order.deadline ? Utils.formatDate(order.deadline) : 'N/A';
        document.getElementById('viewOrderNotes').textContent = order.notes || 'None';
        document.getElementById('viewOrderStatus').value = order.status || 'pending';
        
        // Reset payment checkbox
        document.getElementById('paymentReceived').checked = false;
        document.getElementById('completeOrderBtn').style.display = 'none';
        
        // Show payment row if delivered
        this.updatePaymentVisibility(order.status);
        
        // Remove any existing weight summary
        const existingWeightSummary = document.querySelector('.view-weight-summary');
        if (existingWeightSummary) existingWeightSummary.remove();
        
        document.getElementById('viewOrderItems').innerHTML = (order.items || []).map(item => {
            let comboLine = '';
            if (item.isCombo && item.comboDescription) {
                comboLine = `<div class="view-item-combo"><i class="fas fa-list"></i> Items: ${item.comboDescription}</div>`;
            }
            const weightLine = item.weightDisplay ? `<span class="view-item-weight"><i class="fas fa-weight-hanging"></i> ${item.weightDisplay}</span>` : '';
            return `
                <div class="view-item ${item.isCombo ? 'view-item-is-combo' : ''}">
                    <span>${item.isCombo ? '📦 ' : ''}${item.isManual ? '✏️ ' : ''}${item.name} ${weightLine}</span>
                    <span>${item.quantity} × ${Utils.formatCurrency(item.price)} = ${Utils.formatCurrency(item.total)}</span>
                    ${comboLine}
                </div>
            `;
        }).join('');
        
        // Calculate and show total weight
        const totalWeightGrams = (order.items || []).reduce((sum, item) => sum + (item.weight || 0), 0);
        const weightSummary = totalWeightGrams > 0 ? `<div class="view-weight-summary"><i class="fas fa-weight-hanging"></i> Total Weight: <strong>${this.formatWeight(totalWeightGrams)}</strong></div>` : '';
        document.getElementById('viewOrderItems').insertAdjacentHTML('afterend', weightSummary);
        
        document.getElementById('viewOrderTotal').textContent = Utils.formatCurrency(order.total);

        Modal.open('viewOrderModal');
    },

    generateLabelsFromOrder() {
        if (!this.viewingOrderId) return;
        
        const order = DataStore.orders.find(o => o.id === this.viewingOrderId);
        if (!order) return;

        const orderId = order.order_id || order.orderId;
        const customerName = order.customer_name || order.customerName;
        const customerPhone = order.customer_phone || order.customerPhone || '';
        const customerAddress = order.customer_address || order.customerAddress || '';
        const orderDate = new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: '2-digit' });
        
        // Build items list HTML
        const itemsHtml = (order.items || []).map(item => {
            const invItem = DataStore.inventory.find(i => i.id === item.itemId);
            const category = invItem?.category === 'pickles' ? '🥒 Pickle' : '🍪 Snack';
            const weightText = item.weightDisplay ? ` (${item.weightDisplay})` : '';
            return `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">
                        <div style="font-weight: 600;">${item.isCombo ? '📦 ' : ''}${item.name}${weightText}</div>
                        <div style="font-size: 11px; color: #888;">${category}</div>
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">$${item.total.toFixed(2)}</td>
                </tr>
            `;
        }).join('');
        
        // Calculate totals
        const totalItems = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
        const totalWeightGrams = (order.items || []).reduce((sum, item) => sum + (item.weight || 0), 0);
        const totalWeightText = totalWeightGrams > 0 ? this.formatWeight(totalWeightGrams) : '';
        
        // QR Code data - encode order details
        const qrData = encodeURIComponent(JSON.stringify({
            order: orderId,
            customer: customerName,
            phone: customerPhone,
            total: order.total,
            items: (order.items || []).map(i => ({ name: i.name, qty: i.quantity, price: i.total })),
            date: orderDate
        }));
        
        // Using QR code API
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

        // Open print window with single professional receipt
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Receipt - ${orderId}</title>
                <style>
                    @page { size: 4in auto; margin: 0.3in; }
                    * { box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        padding: 0; 
                        margin: 0;
                        background: #f5f5f5;
                    }
                    .receipt {
                        max-width: 380px;
                        margin: 20px auto;
                        background: #fff;
                        border: 2px solid #8B4513;
                        border-radius: 15px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    }
                    .receipt-header {
                        background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }
                    .receipt-logo {
                        font-size: 28px;
                        font-weight: bold;
                        font-family: Georgia, serif;
                        margin-bottom: 5px;
                    }
                    .receipt-tagline {
                        font-size: 11px;
                        opacity: 0.9;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .receipt-body {
                        padding: 20px;
                    }
                    .order-info {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding-bottom: 15px;
                        border-bottom: 2px dashed #ddd;
                        margin-bottom: 15px;
                    }
                    .order-number {
                        font-size: 14px;
                        font-weight: bold;
                        color: #8B4513;
                    }
                    .order-date {
                        font-size: 12px;
                        color: #666;
                    }
                    .customer-section {
                        background: #FFF8E7;
                        border-radius: 10px;
                        padding: 12px 15px;
                        margin-bottom: 15px;
                    }
                    .customer-label {
                        font-size: 10px;
                        color: #888;
                        text-transform: uppercase;
                        margin-bottom: 5px;
                    }
                    .customer-name {
                        font-size: 16px;
                        font-weight: bold;
                        color: #333;
                    }
                    .customer-phone {
                        font-size: 13px;
                        color: #666;
                        margin-top: 3px;
                    }
                    .customer-address {
                        font-size: 12px;
                        color: #666;
                        margin-top: 3px;
                    }
                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 13px;
                        margin-bottom: 15px;
                    }
                    .items-table th {
                        background: #f8f8f8;
                        padding: 10px 8px;
                        text-align: left;
                        font-size: 11px;
                        text-transform: uppercase;
                        color: #666;
                        border-bottom: 2px solid #8B4513;
                    }
                    .items-table th:nth-child(2),
                    .items-table th:nth-child(3),
                    .items-table th:nth-child(4) {
                        text-align: center;
                    }
                    .items-table th:last-child {
                        text-align: right;
                    }
                    .totals-section {
                        border-top: 2px dashed #ddd;
                        padding-top: 15px;
                    }
                    .total-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        font-size: 13px;
                    }
                    .total-row.subtotal {
                        color: #666;
                    }
                    .total-row.discount {
                        color: #e74c3c;
                    }
                    .total-row.grand-total {
                        font-size: 18px;
                        font-weight: bold;
                        color: #2E7D32;
                        border-top: 2px solid #8B4513;
                        padding-top: 10px;
                        margin-top: 10px;
                    }
                    .qr-section {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 15px;
                        padding: 15px;
                        border-top: 2px dashed #ddd;
                        margin-top: 15px;
                    }
                    .qr-code img {
                        width: 80px;
                        height: 80px;
                        border: 2px solid #8B4513;
                        border-radius: 8px;
                        padding: 3px;
                        background: white;
                    }
                    .qr-info {
                        text-align: left;
                    }
                    .qr-info-title {
                        font-size: 11px;
                        color: #888;
                        text-transform: uppercase;
                    }
                    .qr-info-text {
                        font-size: 10px;
                        color: #666;
                        margin-top: 3px;
                    }
                    .receipt-footer {
                        background: #FFF8E7;
                        padding: 15px;
                        text-align: center;
                        border-top: 2px solid #8B4513;
                    }
                    .footer-contact {
                        font-size: 13px;
                        color: #8B4513;
                        font-weight: 600;
                        margin-bottom: 5px;
                    }
                    .footer-love {
                        font-size: 11px;
                        color: #e91e63;
                    }
                    .footer-thanks {
                        font-size: 12px;
                        color: #666;
                        margin-top: 8px;
                    }
                    .delivered-date {
                        font-size: 11px;
                        color: #888;
                        margin-top: 10px;
                    }
                    @media print { 
                        body { background: white; }
                        .receipt { 
                            box-shadow: none; 
                            margin: 0;
                            max-width: 100%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="receipt-header">
                        <div class="receipt-logo">🏺 90's JAR</div>
                        <div class="receipt-tagline">Homemade Sankranti Snacks & Pickles</div>
                    </div>
                    
                    <div class="receipt-body">
                        <div class="order-info">
                            <div class="order-number">Order #${orderId}</div>
                            <div class="order-date">${orderDate}</div>
                        </div>
                        
                        <div class="customer-section">
                            <div class="customer-label">📦 Packed For</div>
                            <div class="customer-name">${customerName}</div>
                            ${customerPhone ? `<div class="customer-phone">📞 ${customerPhone}</div>` : ''}
                            ${customerAddress ? `<div class="customer-address">📍 ${customerAddress}</div>` : ''}
                        </div>
                        
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                        
                        <div class="totals-section">
                            <div class="total-row subtotal">
                                <span>Subtotal (${totalItems} items)</span>
                                <span>$${(order.subtotal || order.total).toFixed(2)}</span>
                            </div>
                            ${order.discount ? `
                            <div class="total-row discount">
                                <span>Discount</span>
                                <span>-$${order.discount.toFixed(2)}</span>
                            </div>
                            ` : ''}
                            ${totalWeightText ? `
                            <div class="total-row">
                                <span>Total Weight</span>
                                <span>${totalWeightText}</span>
                            </div>
                            ` : ''}
                            <div class="total-row grand-total">
                                <span>TOTAL</span>
                                <span>$${order.total.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <div class="qr-section">
                            <div class="qr-code">
                                <img src="${qrCodeUrl}" alt="QR Code" />
                            </div>
                            <div class="qr-info">
                                <div class="qr-info-title">Scan for Details</div>
                                <div class="qr-info-text">Order: ${orderId}</div>
                                <div class="qr-info-text">Total: $${order.total.toFixed(2)}</div>
                                <div class="qr-info-text">Items: ${totalItems}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="receipt-footer">
                        <div class="footer-contact">📞 +1 6822742570</div>
                        <div class="footer-love">Made with ❤️ in USA</div>
                        <div class="footer-thanks">🙏 Thank you for your order!</div>
                        <div class="delivered-date">Delivered: ${orderDate}</div>
                    </div>
                </div>
                <script>setTimeout(() => window.print(), 500);</script>
            </body>
            </html>
        `);
    },

    async deleteOrder(orderId) {
        if (!confirm('Are you sure you want to delete this order?')) return;

        const result = await API.deleteOrder(orderId);
        
        if (result.success) {
            Toast.success('Deleted', 'Order has been deleted');
            await DataStore.loadAll();
            this.refresh();
            Dashboard.refresh();
        }
    }
};
