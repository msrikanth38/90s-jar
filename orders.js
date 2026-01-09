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
                'ready': 'check',
                'delivered': 'truck',
                'completed': 'check-circle',
                'cancelled': 'times-circle'
            };
            const statusIcon = statusIcons[order.status] || 'clock';
            
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
                        <button class="btn-icon" onclick="Orders.viewOrder('${order.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon" onclick="Orders.editOrder('${order.id}')" title="Edit Order"><i class="fas fa-edit"></i></button>
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
        
        // Update status to completed and move to history
        const result = await API.updateOrderStatus(this.viewingOrderId, 'completed');
        
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
        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 5px; border-bottom: 1px dashed #ddd;">${item.isCombo ? '📦 ' : ''}${item.name}</td>
                <td style="padding: 5px; border-bottom: 1px dashed #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 5px; border-bottom: 1px dashed #ddd; text-align: right;">$${item.price.toFixed(2)}</td>
                <td style="padding: 5px; border-bottom: 1px dashed #ddd; text-align: right;">$${item.total.toFixed(2)}</td>
            </tr>
        `).join('');
        
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
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
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

    generateLabelsFromOrder() {
        if (!this.viewingOrderId) return;
        
        const order = DataStore.orders.find(o => o.id === this.viewingOrderId);
        if (!order) return;

        const customer = {
            name: order.customer_name || order.customerName,
            phone: order.customer_phone || order.customerPhone
        };

        // Generate labels for all items in the order
        const labelsHtml = (order.items || []).map(item => {
            if (item.isCombo && item.comboItems) {
                // For combos, create labels for each item in combo
                return item.comboItems.map(comboItem => {
                    const invItem = DataStore.inventory.find(i => i.id === comboItem.itemId);
                    const category = invItem?.category === 'pickles' ? '🥒 Homemade Pickle' : '🍪 Homemade Snack';
                    return this.createLabelHtml(comboItem.name, category, item.price / item.comboItems.length, 1, customer);
                }).join('');
            } else {
                const invItem = DataStore.inventory.find(i => i.id === item.itemId);
                const category = invItem?.category === 'pickles' ? '🥒 Homemade Pickle' : '🍪 Homemade Snack';
                return this.createLabelHtml(item.name, category, item.price, item.quantity, customer);
            }
        }).join('');

        // Open print window
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Order Labels - ${order.order_id || order.orderId}</title>
                <style>
                    @page { size: 4in 3in; margin: 0.2in; }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        padding: 10px; 
                        margin: 0;
                    }
                    .labels-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 15px;
                        justify-content: center;
                    }
                    .label-preview { 
                        border: 2px solid #8B4513; 
                        border-radius: 12px;
                        padding: 15px; 
                        width: 280px;
                        text-align: center;
                        background: #fff;
                        page-break-inside: avoid;
                    }
                    .label-logo { font-size: 22px; font-weight: bold; color: #8B4513; font-family: Georgia, serif; }
                    .label-tagline { font-size: 10px; color: #666; text-transform: uppercase; }
                    .label-divider { height: 1px; background: linear-gradient(to right, transparent, #ccc, transparent); margin: 8px 0; }
                    .product-name { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 4px; }
                    .product-category { font-size: 11px; color: #666; }
                    .label-details { background: #f8f8f8; border-radius: 8px; padding: 8px; margin: 8px 0; }
                    .detail-row { display: flex; justify-content: center; align-items: center; gap: 10px; }
                    .detail-price { font-size: 16px; color: #2E7D32; font-weight: bold; }
                    .label-customer { background: #fff3e0; border-radius: 8px; padding: 8px; margin: 6px 0; }
                    .customer-title { font-size: 9px; color: #888; text-transform: uppercase; }
                    .customer-name { font-size: 12px; font-weight: bold; }
                    .customer-phone { font-size: 11px; color: #666; }
                    .footer-contact { font-size: 10px; color: #666; }
                    .footer-love { font-size: 9px; color: #e91e63; }
                    @media print { .label-preview { box-shadow: none; } }
                </style>
            </head>
            <body>
                <div class="labels-grid">${labelsHtml}</div>
                <script>setTimeout(() => window.print(), 500);</script>
            </body>
            </html>
        `);
    },

    createLabelHtml(name, category, price, qty, customer) {
        return `
            <div class="label-preview">
                <div class="label-header">
                    <div class="label-logo">90's JAR</div>
                    <div class="label-tagline">Homemade Sankranti Snacks</div>
                </div>
                <div class="label-divider"></div>
                <div class="label-product">
                    <div class="product-name">${name}</div>
                    <div class="product-category">${category}</div>
                </div>
                <div class="label-details">
                    <div class="detail-row">
                        <span><strong>Qty:</strong> ${qty}</span>
                        <span class="detail-price"><strong>${Utils.formatCurrency(price)}</strong></span>
                    </div>
                </div>
                ${customer ? `
                <div class="label-divider"></div>
                <div class="label-customer">
                    <div class="customer-title">📦 Packed For:</div>
                    <div class="customer-name">${customer.name}</div>
                    ${customer.phone ? `<div class="customer-phone">📞 ${customer.phone}</div>` : ''}
                </div>
                ` : ''}
                <div class="label-divider"></div>
                <div class="label-footer">
                    <div class="footer-contact">📞 +1 6822742570</div>
                    <div class="footer-love">Made with ❤️ in USA</div>
                </div>
            </div>
        `;
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
