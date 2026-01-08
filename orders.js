// ===== Orders Module =====
const Orders = {
    currentOrder: { items: [], subtotal: 0, discount: 0, total: 0 },

    refresh() {
        this.renderOrders();
        this.populateItemSelect();
        this.populateComboSelect();
    },

    renderOrders() {
        const container = document.getElementById('ordersGrid');
        const orders = DataStore.orders;

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>No Orders Yet</h3>
                    <p>Create your first order to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => {
            const statusClass = order.status === 'pending' ? 'pending' : order.status === 'processing' ? 'processing' : order.status === 'ready' ? 'ready' : 'delivered';
            const statusIcon = order.status === 'pending' ? 'clock' : order.status === 'processing' ? 'spinner' : order.status === 'ready' ? 'check' : 'truck';
            
            // Build item tags with combo details
            const itemTags = (order.items || []).slice(0, 3).map(item => {
                if (item.isCombo && item.comboDescription) {
                    return `<span class="item-tag combo-tag" title="${item.comboDescription}">📦 ${item.name}</span>`;
                }
                return `<span class="item-tag">${item.name} × ${item.quantity}</span>`;
            }).join('');
            
            return `
                <div class="order-card" data-id="${order.id}">
                    <div class="order-header">
                        <span class="order-id">${order.order_id || order.orderId}</span>
                        <span class="order-status ${statusClass}"><i class="fas fa-${statusIcon}"></i> ${order.status}</span>
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
                        <button class="btn-icon" onclick="Orders.updateStatus('${order.id}')" title="Update Status"><i class="fas fa-sync-alt"></i></button>
                        <button class="btn-icon" onclick="Orders.viewOrder('${order.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon danger" onclick="Orders.deleteOrder('${order.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    populateItemSelect() {
        const select = document.getElementById('orderItemSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select an item...</option>';
        
        const pickles = DataStore.inventory.filter(i => i.category === 'pickles');
        const snacks = DataStore.inventory.filter(i => i.category === 'snacks');
        
        if (pickles.length > 0) {
            select.innerHTML += `<optgroup label="🥒 Pickles">${pickles.map(i => 
                `<option value="${i.id}" data-price="${i.selling_price || i.sellingPrice}" ${i.stock <= 0 ? 'disabled' : ''}>${i.name} - ${Utils.formatCurrency(i.selling_price || i.sellingPrice)} ${i.stock <= 0 ? '(Out of Stock)' : `(${i.stock} left)`}</option>`
            ).join('')}</optgroup>`;
        }
        
        if (snacks.length > 0) {
            select.innerHTML += `<optgroup label="🍪 Snacks">${snacks.map(i => 
                `<option value="${i.id}" data-price="${i.selling_price || i.sellingPrice}" ${i.stock <= 0 ? 'disabled' : ''}>${i.name} - ${Utils.formatCurrency(i.selling_price || i.sellingPrice)} ${i.stock <= 0 ? '(Out of Stock)' : `(${i.stock} left)`}</option>`
            ).join('')}</optgroup>`;
        }
    },

    populateComboSelect() {
        const select = document.getElementById('orderComboSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select a combo...</option>';
        DataStore.combos.forEach(combo => {
            select.innerHTML += `<option value="${combo.id}" data-price="${combo.price}">${combo.name} - ${Utils.formatCurrency(combo.price)} (Save ${Utils.formatCurrency(combo.savings || 0)})</option>`;
        });
    },

    addItemToOrder() {
        const select = document.getElementById('orderItemSelect');
        const qty = parseInt(document.getElementById('orderItemQty').value) || 1;
        const itemId = select.value;
        
        if (!itemId) {
            Toast.warning('Select Item', 'Please select an item to add');
            return;
        }

        const item = DataStore.inventory.find(i => i.id === itemId);
        if (!item) return;

        if (item.stock < qty) {
            Toast.warning('Insufficient Stock', `Only ${item.stock} ${item.unit} available`);
            return;
        }

        const existing = this.currentOrder.items.find(i => i.itemId === itemId && !i.isCombo);
        if (existing) {
            existing.quantity += qty;
            existing.total = existing.quantity * existing.price;
        } else {
            this.currentOrder.items.push({
                itemId,
                name: item.name,
                price: item.selling_price || item.sellingPrice,
                quantity: qty,
                total: (item.selling_price || item.sellingPrice) * qty,
                isCombo: false
            });
        }

        this.updateOrderSummary();
        select.value = '';
        document.getElementById('orderItemQty').value = 1;
        Toast.success('Item Added', `${item.name} × ${qty} added to order`);
    },

    addManualItem() {
        const name = document.getElementById('manualItemName').value.trim();
        const price = parseFloat(document.getElementById('manualItemPrice').value) || 0;
        const qty = parseInt(document.getElementById('manualItemQty').value) || 1;

        if (!name) {
            Toast.warning('Enter Name', 'Please enter item name');
            return;
        }
        if (price <= 0) {
            Toast.warning('Enter Price', 'Please enter a valid price');
            return;
        }

        this.currentOrder.items.push({
            itemId: 'manual_' + Date.now(),
            name: name,
            price: price,
            quantity: qty,
            total: price * qty,
            isCombo: false,
            isManual: true
        });

        this.updateOrderSummary();
        document.getElementById('manualItemName').value = '';
        document.getElementById('manualItemPrice').value = '';
        document.getElementById('manualItemQty').value = 1;
        Toast.success('Item Added', `${name} × ${qty} added to order`);
    },

    openComboSelector(comboType) {
        // comboType: '4-combo' for $22, '2-combo' for $15
        const itemCount = comboType === '4-combo' ? 4 : 2;
        const price = comboType === '4-combo' ? 22.00 : 15.00;
        
        // Get available snack items
        const snacks = DataStore.inventory.filter(i => i.category === 'snacks');
        
        let checkboxesHtml = snacks.map(item => `
            <label class="combo-item-checkbox">
                <input type="checkbox" name="comboItem" value="${item.id}" data-name="${item.name}">
                <span class="checkbox-label">${item.name}</span>
            </label>
        `).join('');
        
        const modalHtml = `
            <div id="comboSelectorModal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-gift"></i> Select ${itemCount} Items for Combo ($${price})</h3>
                        <button class="modal-close" onclick="Orders.closeComboSelector()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p class="combo-instruction">Choose exactly <strong>${itemCount} items</strong> for this combo:</p>
                        <div class="combo-checkboxes">
                            ${checkboxesHtml}
                        </div>
                        <p class="selected-count">Selected: <span id="comboSelectedCount">0</span> / ${itemCount}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="Orders.closeComboSelector()">Cancel</button>
                        <button class="btn btn-primary" onclick="Orders.confirmComboSelection('${comboType}', ${itemCount}, ${price})">
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
    
    confirmComboSelection(comboType, requiredCount, price) {
        const checked = document.querySelectorAll('#comboSelectorModal input[name="comboItem"]:checked');
        
        if (checked.length !== requiredCount) {
            Toast.warning('Select Items', `Please select exactly ${requiredCount} items`);
            return;
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
            price: price,
            quantity: 1,
            total: price,
            isCombo: true,
            comboItems: selectedItems,
            comboDescription: itemNames
        });
        
        this.updateOrderSummary();
        this.closeComboSelector();
        Toast.success('Combo Added', `${comboName} added with: ${itemNames}`);
    },

    addComboToOrder() {
        const select = document.getElementById('orderComboSelect');
        const comboType = select.value;

        if (!comboType) {
            Toast.warning('Select Combo', 'Please select a combo type');
            return;
        }

        this.openComboSelector(comboType);
        select.value = '';
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
            return;
        }

        container.innerHTML = this.currentOrder.items.map((item, index) => {
            let comboDetails = '';
            if (item.isCombo && item.comboDescription) {
                comboDetails = `<div class="combo-items-detail"><i class="fas fa-list"></i> ${item.comboDescription}</div>`;
            }
            return `
                <div class="order-summary-item ${item.isCombo ? 'combo-order-item' : ''}">
                    <div class="item-details">
                        <span class="item-name">${item.isCombo ? '📦 ' : ''}${item.isManual ? '✏️ ' : ''}${item.name}</span>
                        ${comboDetails}
                        <span class="item-qty">${Utils.formatCurrency(item.price)} × ${item.quantity}</span>
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

        document.getElementById('orderSubtotal').textContent = Utils.formatCurrency(this.currentOrder.subtotal);
        document.getElementById('orderDiscount').textContent = Utils.formatCurrency(this.currentOrder.discount);
        document.getElementById('orderTotal').textContent = Utils.formatCurrency(this.currentOrder.total);
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

        const result = await API.saveOrder(order);
        
        if (result.success) {
            Toast.success('Order Created', `Order ${result.orderId} has been created`);
            await DataStore.loadAll();
            this.clearOrderForm();
            Modal.close('orderModal');
            this.refresh();
            Dashboard.refresh();
        } else {
            Toast.error('Error', 'Failed to create order');
        }
    },

    clearOrderForm() {
        this.currentOrder = { items: [], subtotal: 0, discount: 0, total: 0 };
        document.getElementById('orderCustomerName').value = '';
        document.getElementById('orderCustomerPhone').value = '';
        if (document.getElementById('orderCustomerEmail')) document.getElementById('orderCustomerEmail').value = '';
        if (document.getElementById('orderCustomerAddress')) document.getElementById('orderCustomerAddress').value = '';
        document.getElementById('orderDeadline').value = '';
        if (document.getElementById('orderNotes')) document.getElementById('orderNotes').value = '';
        if (document.getElementById('orderDiscountInput')) document.getElementById('orderDiscountInput').value = '0';
        this.updateOrderSummary();
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

    viewOrder(orderId) {
        const order = DataStore.orders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('viewOrderModal');
        if (!modal) return;

        document.getElementById('viewOrderId').textContent = order.order_id || order.orderId;
        document.getElementById('viewOrderCustomer').textContent = order.customer_name || order.customerName;
        document.getElementById('viewOrderPhone').textContent = order.customer_phone || order.customerPhone || 'N/A';
        document.getElementById('viewOrderItems').innerHTML = (order.items || []).map(item => {
            let comboLine = '';
            if (item.isCombo && item.comboDescription) {
                comboLine = `<div class="view-item-combo"><i class="fas fa-list"></i> Items: ${item.comboDescription}</div>`;
            }
            return `
                <div class="view-item ${item.isCombo ? 'view-item-is-combo' : ''}">
                    <span>${item.isCombo ? '📦 ' : ''}${item.name}</span>
                    <span>${item.quantity} × ${Utils.formatCurrency(item.price)} = ${Utils.formatCurrency(item.total)}</span>
                    ${comboLine}
                </div>
            `;
        }).join('');
        document.getElementById('viewOrderTotal').textContent = Utils.formatCurrency(order.total);

        Modal.open('viewOrderModal');
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
