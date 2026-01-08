// ===== Main App Initialization =====
async function initApp() {
    // Show loading
    document.body.classList.add('loading');
    
    // Load all data from API
    await DataStore.loadAll();
    
    // Initialize modules
    Navigation.init();
    Modal.init();
    Settings.init();
    
    // Apply dark mode if enabled
    if (DataStore.settings.darkMode) {
        document.body.classList.add('dark-mode');
    }
    
    // Initial refresh
    Dashboard.refresh();
    
    // Hide loading
    document.body.classList.remove('loading');
    
    console.log("90's JAR App initialized successfully!");
}

// ===== Event Listeners =====
document.addEventListener('DOMContentLoaded', initApp);

// Global functions for button clicks
window.openNewOrder = function() {
    Orders.clearOrderForm();
    Orders.populateItemSelect();
    Orders.populateComboSelect();
    Modal.open('orderModal');
};

window.openNewItem = function() {
    Inventory.clearForm();
    Modal.open('inventoryModal');
};

window.openNewCombo = function() {
    Combos.clearForm();
    Combos.populateComboItems();
    Modal.open('comboModal');
};

window.openNewRecipe = function() {
    Recipes.clearForm();
    Modal.open('recipeModal');
};

window.openNewCustomer = function() {
    Customers.clearForm();
    Modal.open('customerModal');
};

window.openNewTransaction = function() {
    Finance.clearForm();
    Modal.open('transactionModal');
};

// Mobile menu overlay close
document.addEventListener('click', function(e) {
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('mobileMenuToggle');
    
    if (sidebar.classList.contains('mobile-open') && 
        !sidebar.contains(e.target) && 
        !menuToggle.contains(e.target)) {
        sidebar.classList.remove('mobile-open');
    }
});
