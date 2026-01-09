// ===== Customers Module =====
const Customers = {
    searchQuery: '',
    
    refresh() {
        this.renderCustomers();
    },

    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderCustomers();
    },

    clearSearch() {
        this.searchQuery = '';
        document.getElementById('customersSearch').value = '';
        this.renderCustomers();
    },

    renderCustomers() {
        const container = document.getElementById('customersTable');
        let customers = DataStore.customers;
        
        // Apply search filter
        if (this.searchQuery) {
            customers = customers.filter(customer => {
                const searchText = this.searchQuery;
                return (
                    customer.name?.toLowerCase().includes(searchText) ||
                    customer.phone?.toLowerCase().includes(searchText) ||
                    customer.email?.toLowerCase().includes(searchText) ||
                    customer.address?.toLowerCase().includes(searchText) ||
                    String(customer.total_orders || customer.totalOrders || 0).includes(searchText)
                );
            });
        }

        if (customers.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-users"></i>
                            <h3>${this.searchQuery ? 'No Customers Found' : 'No Customers Yet'}</h3>
                            <p>${this.searchQuery ? 'Try a different search term' : 'Customers will appear here when orders are created'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = customers.map(customer => `
            <tr data-id="${customer.id}">
                <td>
                    <div class="customer-cell">
                        <div class="customer-avatar">${Utils.getInitials(customer.name)}</div>
                        <span>${customer.name}</span>
                    </div>
                </td>
                <td>${customer.phone || 'N/A'}</td>
                <td>${customer.email || 'N/A'}</td>
                <td>${customer.total_orders || customer.totalOrders || 0}</td>
                <td>${Utils.formatCurrency(customer.total_spent || customer.totalSpent || 0)}</td>
                <td>
                    <button class="btn-icon" onclick="Customers.viewCustomer('${customer.id}')" title="View"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon" onclick="Customers.editCustomer('${customer.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="Customers.deleteCustomer('${customer.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async saveCustomer() {
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const email = document.getElementById('customerEmail')?.value.trim() || '';
        const address = document.getElementById('customerAddress')?.value.trim() || '';
        const notes = document.getElementById('customerNotes')?.value.trim() || '';

        if (!name) {
            Toast.error('Name Required', 'Please enter customer name');
            return;
        }

        const customer = {
            id: document.getElementById('customerId')?.value || null,
            name,
            phone,
            email,
            address,
            notes
        };

        const result = await API.saveCustomer(customer);
        
        if (result.success) {
            Toast.success('Saved', `${name} has been saved`);
            await DataStore.loadAll();
            Modal.close('customerModal');
            this.refresh();
            this.clearForm();
        } else {
            Toast.error('Error', 'Failed to save customer');
        }
    },

    clearForm() {
        if (document.getElementById('customerId')) document.getElementById('customerId').value = '';
        document.getElementById('customerName').value = '';
        document.getElementById('customerPhone').value = '';
        if (document.getElementById('customerEmail')) document.getElementById('customerEmail').value = '';
        if (document.getElementById('customerAddress')) document.getElementById('customerAddress').value = '';
        if (document.getElementById('customerNotes')) document.getElementById('customerNotes').value = '';
    },

    editCustomer(customerId) {
        const customer = DataStore.customers.find(c => c.id === customerId);
        if (!customer) return;

        if (document.getElementById('customerId')) document.getElementById('customerId').value = customer.id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerPhone').value = customer.phone || '';
        if (document.getElementById('customerEmail')) document.getElementById('customerEmail').value = customer.email || '';
        if (document.getElementById('customerAddress')) document.getElementById('customerAddress').value = customer.address || '';
        if (document.getElementById('customerNotes')) document.getElementById('customerNotes').value = customer.notes || '';

        Modal.open('customerModal');
    },

    viewCustomer(customerId) {
        const customer = DataStore.customers.find(c => c.id === customerId);
        if (!customer) return;

        // Get customer orders
        const customerOrders = [...DataStore.orders, ...DataStore.orderHistory].filter(o => 
            (o.customer_name || o.customerName).toLowerCase() === customer.name.toLowerCase()
        );

        alert(`Customer: ${customer.name}\nPhone: ${customer.phone || 'N/A'}\nEmail: ${customer.email || 'N/A'}\nAddress: ${customer.address || 'N/A'}\nTotal Orders: ${customer.total_orders || customer.totalOrders || 0}\nTotal Spent: ${Utils.formatCurrency(customer.total_spent || customer.totalSpent || 0)}\nNotes: ${customer.notes || 'None'}`);
    },

    async deleteCustomer(customerId) {
        if (!confirm('Are you sure you want to delete this customer?')) return;

        const result = await API.deleteCustomer(customerId);
        
        if (result.success) {
            Toast.success('Deleted', 'Customer has been deleted');
            await DataStore.loadAll();
            this.refresh();
            Dashboard.refresh();
        }
    }
};

// ===== Finance Module =====
const Finance = {
    refresh() {
        this.updateSummary();
        this.renderTransactions();
    },

    updateSummary() {
        // Calculate total income from orders
        const totalIncome = [...DataStore.orders, ...DataStore.orderHistory]
            .reduce((sum, o) => sum + (o.total || 0), 0);

        // Calculate total expenses
        const totalExpenses = DataStore.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Calculate additional income from transactions
        const additionalIncome = DataStore.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        const netProfit = totalIncome + additionalIncome - totalExpenses;

        document.getElementById('totalIncome').textContent = Utils.formatCurrency(totalIncome + additionalIncome);
        document.getElementById('totalExpenses').textContent = Utils.formatCurrency(totalExpenses);
        document.getElementById('netProfit').textContent = Utils.formatCurrency(netProfit);
        document.getElementById('netProfit').className = netProfit >= 0 ? 'profit' : 'loss';
    },

    renderTransactions() {
        const container = document.getElementById('transactionsTable');
        const transactions = DataStore.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (transactions.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-receipt"></i>
                            <h3>No Transactions Yet</h3>
                            <p>Add income or expenses to track finances</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = transactions.map(trans => `
            <tr data-id="${trans.id}" class="${trans.type}">
                <td>${Utils.formatDate(trans.date)}</td>
                <td><span class="trans-type ${trans.type}">${trans.type === 'income' ? '↑' : '↓'} ${trans.type}</span></td>
                <td>${trans.category || 'Other'}</td>
                <td class="amount ${trans.type}">${trans.type === 'income' ? '+' : '-'}${Utils.formatCurrency(trans.amount)}</td>
                <td>
                    <span class="trans-desc">${trans.description || 'No description'}</span>
                    <button class="btn-icon danger" onclick="Finance.deleteTransaction('${trans.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    async addTransaction() {
        const type = document.getElementById('transType').value;
        const category = document.getElementById('transCategory').value;
        const amount = parseFloat(document.getElementById('transAmount').value) || 0;
        const date = document.getElementById('transDate').value || new Date().toISOString().split('T')[0];
        const description = document.getElementById('transDescription')?.value.trim() || '';

        if (amount <= 0) {
            Toast.error('Invalid Amount', 'Please enter a valid amount');
            return;
        }

        const transaction = { type, category, amount, date, description };

        const result = await API.saveTransaction(transaction);
        
        if (result.success) {
            Toast.success('Added', `${type} of ${Utils.formatCurrency(amount)} recorded`);
            await DataStore.loadAll();
            Modal.close('transactionModal');
            this.refresh();
            this.clearForm();
        } else {
            Toast.error('Error', 'Failed to add transaction');
        }
    },

    clearForm() {
        document.getElementById('transType').value = 'expense';
        document.getElementById('transCategory').value = 'ingredients';
        document.getElementById('transAmount').value = '';
        document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
        if (document.getElementById('transDescription')) document.getElementById('transDescription').value = '';
    },

    async deleteTransaction(transId) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        const result = await API.deleteTransaction(transId);
        
        if (result.success) {
            Toast.success('Deleted', 'Transaction has been deleted');
            await DataStore.loadAll();
            this.refresh();
        }
    }
};

// ===== History Module =====
const History = {
    searchQuery: '',
    
    refresh() {
        this.renderHistory();
    },

    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.renderHistory();
    },

    clearSearch() {
        this.searchQuery = '';
        document.getElementById('historySearch').value = '';
        this.renderHistory();
    },

    renderHistory() {
        const container = document.getElementById('historyTable');
        let orders = DataStore.orderHistory;
        
        // Apply search filter
        if (this.searchQuery) {
            orders = orders.filter(order => {
                const searchText = this.searchQuery;
                const orderId = order.order_id || order.orderId || '';
                const customerName = order.customer_name || order.customerName || '';
                const customerPhone = order.customer_phone || order.customerPhone || '';
                const itemNames = (order.items || []).map(i => i.name).join(' ').toLowerCase();
                
                return (
                    orderId.toLowerCase().includes(searchText) ||
                    customerName.toLowerCase().includes(searchText) ||
                    customerPhone.toLowerCase().includes(searchText) ||
                    itemNames.includes(searchText) ||
                    String(order.total).includes(searchText)
                );
            });
        }

        if (orders.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-cell">
                        <div class="empty-state">
                            <i class="fas fa-history"></i>
                            <h3>${this.searchQuery ? 'No Records Found' : 'No History Yet'}</h3>
                            <p>${this.searchQuery ? 'Try a different search term' : 'Delivered orders will appear here'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = orders.map(order => `
            <tr data-id="${order.id}">
                <td><strong>${order.order_id || order.orderId}</strong></td>
                <td>
                    <div class="customer-cell">
                        <span class="customer-name">${order.customer_name || order.customerName}</span>
                        <span class="customer-phone">${order.customer_phone || order.customerPhone || ''}</span>
                    </div>
                </td>
                <td class="items-cell">${(order.items || []).map(i => `<span class="item-badge">${i.name} × ${i.quantity}</span>`).join(' ')}</td>
                <td><strong class="total-amount">${Utils.formatCurrency(order.total)}</strong></td>
                <td>${Utils.formatDateTime(order.delivered_at || order.deliveredAt)}</td>
                <td class="history-actions">
                    <button class="btn-icon" onclick="History.viewLabels('${order.id}')" title="View Labels"><i class="fas fa-tag"></i></button>
                    <button class="btn-icon" onclick="History.viewDetails('${order.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                    <button class="btn-icon danger" onclick="History.deleteRecord('${order.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    viewDetails(orderId) {
        const order = DataStore.orderHistory.find(o => o.id === orderId);
        if (!order) return;

        const itemsHtml = (order.items || []).map(item => `
            <div class="history-item">
                <span class="item-name">${item.isCombo ? '📦 ' : ''}${item.name}</span>
                <span class="item-qty">${item.quantity} × ${Utils.formatCurrency(item.price)}</span>
                <span class="item-total">${Utils.formatCurrency(item.total || item.price * item.quantity)}</span>
            </div>
        `).join('');

        const modalHtml = `
            <div id="historyDetailModal" class="modal active">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-receipt"></i> Order ${order.order_id || order.orderId}</h3>
                        <button class="modal-close" onclick="History.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="history-detail-grid">
                            <div class="detail-section">
                                <h4>Customer</h4>
                                <p><strong>${order.customer_name || order.customerName}</strong></p>
                                <p>📞 ${order.customer_phone || order.customerPhone || 'N/A'}</p>
                                <p>📧 ${order.customer_email || order.customerEmail || 'N/A'}</p>
                                <p>📍 ${order.customer_address || order.customerAddress || 'N/A'}</p>
                            </div>
                            <div class="detail-section">
                                <h4>Order Info</h4>
                                <p><strong>Delivered:</strong> ${Utils.formatDateTime(order.delivered_at || order.deliveredAt)}</p>
                                <p><strong>Notes:</strong> ${order.notes || 'None'}</p>
                            </div>
                        </div>
                        <h4>Items</h4>
                        <div class="history-items-list">${itemsHtml}</div>
                        <div class="history-totals">
                            <div class="total-row"><span>Subtotal:</span><span>${Utils.formatCurrency(order.subtotal || order.total)}</span></div>
                            <div class="total-row"><span>Discount:</span><span>-${Utils.formatCurrency(order.discount || 0)}</span></div>
                            <div class="total-row grand"><span>Total:</span><span>${Utils.formatCurrency(order.total)}</span></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="History.closeModal()">Close</button>
                        <button class="btn btn-primary" onclick="History.viewLabels('${order.id}')">
                            <i class="fas fa-tag"></i> Print Labels
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('historyDetailModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    viewLabels(orderId) {
        const order = DataStore.orderHistory.find(o => o.id === orderId);
        if (!order) return;

        const customer = {
            name: order.customer_name || order.customerName,
            phone: order.customer_phone || order.customerPhone
        };

        // Generate labels for all items
        const labelsHtml = (order.items || []).map(item => {
            if (item.isCombo && item.comboItems) {
                return item.comboItems.map(comboItem => {
                    const invItem = DataStore.inventory.find(i => i.id === comboItem.itemId);
                    const category = invItem?.category === 'pickles' ? '🥒 Homemade Pickle' : '🍪 Homemade Snack';
                    return this.createLabelHtml(comboItem.name, category, item.price / item.comboItems.length, 1, customer, order.delivered_at || order.deliveredAt);
                }).join('');
            } else {
                const invItem = DataStore.inventory.find(i => i.id === item.itemId);
                const category = invItem?.category === 'pickles' ? '🥒 Homemade Pickle' : '🍪 Homemade Snack';
                return this.createLabelHtml(item.name, category, item.price, item.quantity, customer, order.delivered_at || order.deliveredAt);
            }
        }).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Labels - ${order.order_id || order.orderId}</title>
                <style>
                    @page { size: 4in 3in; margin: 0.2in; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10px; margin: 0; }
                    .labels-grid { display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; }
                    .label-preview { 
                        border: 2px solid #8B4513; border-radius: 12px; padding: 15px; 
                        width: 280px; text-align: center; background: #fff; page-break-inside: avoid;
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
                    .label-date { font-size: 10px; color: #888; margin-top: 4px; }
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

    createLabelHtml(name, category, price, qty, customer, deliveredDate) {
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
                    ${deliveredDate ? `<div class="label-date">Delivered: ${Utils.formatDate(deliveredDate)}</div>` : ''}
                </div>
            </div>
        `;
    },

    async deleteRecord(orderId) {
        if (!confirm('Are you sure you want to delete this history record?')) return;

        const result = await API.deleteHistory(orderId);
        
        if (result.success) {
            Toast.success('Deleted', 'History record has been removed');
            await DataStore.loadAll();
            this.refresh();
        } else {
            Toast.error('Error', 'Failed to delete record');
        }
    },

    closeModal() {
        document.getElementById('historyDetailModal')?.remove();
    }
};

// ===== Labels Module =====
const Labels = {
    refresh() {
        this.populateItems();
        this.loadLabelCustomers();
    },

    populateItems() {
        const container = document.getElementById('labelItemsCheckboxes');
        if (!container) return;

        const pickles = DataStore.inventory.filter(i => i.category === 'pickles');
        const snacks = DataStore.inventory.filter(i => i.category === 'snacks');
        
        let html = '';
        
        if (pickles.length > 0) {
            html += `<div class="label-category-group"><div class="category-title">🥒 Pickles</div>`;
            pickles.forEach(item => {
                html += `
                    <label class="label-item-checkbox">
                        <input type="checkbox" name="labelItemCheck" value="${item.id}" 
                            data-name="${item.name}" 
                            data-price="${item.selling_price || item.sellingPrice}"
                            data-category="${item.category}">
                        <span class="checkbox-label">${item.name} - ${Utils.formatCurrency(item.selling_price || item.sellingPrice)}</span>
                    </label>
                `;
            });
            html += `</div>`;
        }
        
        if (snacks.length > 0) {
            html += `<div class="label-category-group"><div class="category-title">🍪 Snacks</div>`;
            snacks.forEach(item => {
                html += `
                    <label class="label-item-checkbox">
                        <input type="checkbox" name="labelItemCheck" value="${item.id}" 
                            data-name="${item.name}" 
                            data-price="${item.selling_price || item.sellingPrice}"
                            data-category="${item.category}">
                        <span class="checkbox-label">${item.name} - ${Utils.formatCurrency(item.selling_price || item.sellingPrice)}</span>
                    </label>
                `;
            });
            html += `</div>`;
        }
        
        container.innerHTML = html || '<p>No items available</p>';
    },

    generateLabel() {
        const checkedItems = document.querySelectorAll('input[name="labelItemCheck"]:checked');
        const weight = document.getElementById('labelWeight')?.value || '';
        const quantity = document.getElementById('labelQuantity')?.value || '1';
        const customPrice = document.getElementById('labelPrice')?.value || '';
        const expiryDate = document.getElementById('labelExpiry')?.value || '';
        const offerText = document.getElementById('labelOffer')?.value.trim() || '';
        const customerId = document.getElementById('labelCustomer')?.value || '';

        if (checkedItems.length === 0) {
            Toast.warning('Select Items', 'Please select at least one item');
            return;
        }

        const customer = customerId ? DataStore.customers.find(c => c.id === customerId) : null;

        // Generate labels for all selected items
        let labelsHtml = '';
        
        checkedItems.forEach(cb => {
            const itemName = cb.dataset.name;
            const itemPrice = customPrice || cb.dataset.price;
            const itemCategory = cb.dataset.category === 'pickles' ? '🥒 Homemade Pickle' : '🍪 Homemade Snack';
            
            labelsHtml += `
                <div class="label-preview">
                    <div class="label-header">
                        <div class="label-logo">90's JAR</div>
                        <div class="label-tagline">Homemade Sankranti Snacks</div>
                    </div>
                    
                    <div class="label-divider"></div>
                    
                    <div class="label-product">
                        <div class="product-name">${itemName}</div>
                        <div class="product-category">${itemCategory}</div>
                    </div>
                    
                    <div class="label-details">
                        <div class="detail-row">
                            ${weight ? `<span class="detail-item"><strong>Wt:</strong> ${weight}</span>` : ''}
                            <span class="detail-item"><strong>Qty:</strong> ${quantity}</span>
                            <span class="detail-item detail-price"><strong>${Utils.formatCurrency(itemPrice)}</strong></span>
                        </div>
                    </div>
                    
                    ${offerText ? `<div class="label-offer">${offerText}</div>` : ''}
                    
                    ${expiryDate ? `<div class="label-expiry"><strong>Best Before:</strong> ${Utils.formatDate(expiryDate)}</div>` : ''}
                    
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
        });

        document.getElementById('labelOutput').innerHTML = `<div class="labels-multi-preview">${labelsHtml}</div>`;
    },

    loadLabelCustomers() {
        const select = document.getElementById('labelCustomer');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- No Customer --</option>';
        DataStore.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    },

    printLabel() {
        const labelContent = document.getElementById('labelOutput').innerHTML;
        if (!labelContent || labelContent.includes('empty-state')) {
            Toast.warning('Generate First', 'Please generate a label first');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
            <head>
                <title>Print Label - 90's JAR</title>
                <style>
                    @page { size: 4in 3in; margin: 0.2in; }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        padding: 0; 
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .label-preview { 
                        border: 2px solid #8B4513; 
                        border-radius: 12px;
                        padding: 15px 20px; 
                        max-width: 320px; 
                        width: 100%;
                        text-align: center;
                        background: #fff;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    .label-header { margin-bottom: 8px; }
                    .label-logo { 
                        font-size: 28px; 
                        font-weight: bold; 
                        color: #8B4513; 
                        font-family: 'Georgia', serif;
                        letter-spacing: 1px;
                    }
                    .label-tagline { 
                        font-size: 11px; 
                        color: #666; 
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .label-divider {
                        height: 1px;
                        background: linear-gradient(to right, transparent, #ccc, transparent);
                        margin: 10px 0;
                    }
                    .label-product { margin: 10px 0; }
                    .product-name { 
                        font-size: 20px; 
                        font-weight: bold; 
                        color: #333;
                        margin-bottom: 4px;
                    }
                    .product-category { 
                        font-size: 12px; 
                        color: #666; 
                    }
                    .label-details {
                        background: #f8f8f8;
                        border-radius: 8px;
                        padding: 10px;
                        margin: 10px 0;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 15px;
                        flex-wrap: wrap;
                    }
                    .detail-item {
                        font-size: 13px;
                        color: #444;
                    }
                    .detail-price {
                        font-size: 18px;
                        color: #2E7D32;
                    }
                    .label-offer {
                        background: #e74c3c;
                        color: white;
                        padding: 5px 12px;
                        border-radius: 15px;
                        font-size: 12px;
                        font-weight: bold;
                        display: inline-block;
                        margin: 8px 0;
                    }
                    .label-expiry { 
                        font-size: 11px; 
                        color: #888;
                        margin: 8px 0;
                    }
                    .label-customer {
                        background: #fff3e0;
                        border-radius: 8px;
                        padding: 10px;
                        margin: 8px 0;
                    }
                    .customer-title {
                        font-size: 10px;
                        color: #888;
                        text-transform: uppercase;
                        margin-bottom: 4px;
                    }
                    .customer-name {
                        font-size: 14px;
                        font-weight: bold;
                        color: #333;
                    }
                    .customer-phone {
                        font-size: 12px;
                        color: #666;
                    }
                    .label-footer { 
                        margin-top: 8px;
                    }
                    .footer-contact {
                        font-size: 11px;
                        color: #666;
                    }
                    .footer-love {
                        font-size: 10px;
                        color: #e91e63;
                        margin-top: 4px;
                    }
                    @media print {
                        body { min-height: auto; }
                        .label-preview { box-shadow: none; border: 2px solid #8B4513; }
                    }
                </style>
            </head>
            <body onload="window.print();">${labelContent}</body>
            </html>
        `);
    }
};

// ===== Settings Module =====
const Settings = {
    init() {
        this.loadSettings();
    },

    loadSettings() {
        document.getElementById('businessName').value = DataStore.settings.businessName || '';
        document.getElementById('businessPhone').value = DataStore.settings.phone || '';
        document.getElementById('businessEmail').value = DataStore.settings.email || '';
        document.getElementById('businessAddress').value = DataStore.settings.address || '';
        document.getElementById('lowStockThreshold').value = DataStore.settings.lowStockThreshold || 5;
        document.getElementById('darkModeToggle').checked = DataStore.settings.darkMode || false;
    },

    saveSettings() {
        DataStore.settings.businessName = document.getElementById('businessName').value;
        DataStore.settings.phone = document.getElementById('businessPhone').value;
        DataStore.settings.email = document.getElementById('businessEmail').value;
        DataStore.settings.address = document.getElementById('businessAddress').value;
        DataStore.settings.lowStockThreshold = parseInt(document.getElementById('lowStockThreshold').value) || 5;
        DataStore.settings.darkMode = document.getElementById('darkModeToggle').checked;

        DataStore.saveSettings();

        if (DataStore.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }

        Toast.success('Settings Saved', 'Your settings have been saved');
    },

    async exportData() {
        try {
            const data = await API.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `90s_jar_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            Toast.success('Exported', 'Data has been exported');
        } catch (error) {
            Toast.error('Error', 'Failed to export data');
        }
    },

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const result = await API.importData(data);
                    if (result.success) {
                        await DataStore.loadAll();
                        Toast.success('Imported', 'Data has been imported');
                        location.reload();
                    }
                } catch (error) {
                    Toast.error('Error', 'Invalid backup file');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    async checkDatabaseStatus() {
        const statusIcon = document.getElementById('dbStatusIcon');
        const statusText = document.getElementById('dbStatusText');
        const statusDetails = document.getElementById('dbStatusDetails');
        const statusCard = document.getElementById('dbStatusCard');
        
        statusIcon.textContent = '⏳';
        statusText.textContent = 'Checking database...';
        statusCard.className = 'db-status-card checking';
        
        try {
            const debug = await API.getDebugInfo();
            
            if (debug.using_postgres) {
                statusIcon.textContent = '✅';
                statusText.textContent = 'PostgreSQL Connected (Data Persists)';
                statusCard.className = 'db-status-card connected';
                statusDetails.innerHTML = `
                    <p><strong>Status:</strong> Your data is safely stored in PostgreSQL database.</p>
                    <p><strong>Persistence:</strong> Data will NOT be lost on server restart.</p>
                `;
            } else {
                statusIcon.textContent = '⚠️';
                statusText.textContent = 'SQLite Mode (Ephemeral Storage)';
                statusCard.className = 'db-status-card warning';
                
                let reason = 'Unknown';
                if (!debug.database_url_set) {
                    reason = 'DATABASE_URL environment variable is not set';
                } else if (!debug.has_postgres) {
                    reason = 'psycopg module not available: ' + (debug.postgres_import_error || 'Unknown error');
                }
                
                statusDetails.innerHTML = `
                    <p><strong>Warning:</strong> Using SQLite (local/temporary storage).</p>
                    <p><strong>Reason:</strong> ${reason}</p>
                    <p><strong>Impact:</strong> Data may be lost when server restarts!</p>
                    <p><strong>Solution:</strong> Set DATABASE_URL in Render environment variables.</p>
                `;
            }
            
            // Show backup info
            const backup = localStorage.getItem('data_backup');
            if (backup) {
                const data = JSON.parse(backup);
                document.getElementById('backupInfoText').textContent = 
                    `Last local backup: ${new Date(data.timestamp).toLocaleString()}`;
            }
            
        } catch (error) {
            statusIcon.textContent = '❌';
            statusText.textContent = 'Cannot connect to server';
            statusCard.className = 'db-status-card error';
            statusDetails.innerHTML = `
                <p><strong>Error:</strong> ${error.message || 'Server unreachable'}</p>
                <p><strong>Solution:</strong> Check if the server is running.</p>
            `;
        }
    }
};
