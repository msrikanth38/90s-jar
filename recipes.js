// ===== Recipes Module =====
const Recipes = {
    currentRecipe: { ingredients: [], steps: [] },

    refresh() {
        this.renderRecipes();
    },

    renderRecipes() {
        const container = document.getElementById('recipesGrid');
        const recipes = DataStore.recipes;

        if (recipes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-book-open"></i>
                    <h3>No Recipes Yet</h3>
                    <p>Add your secret recipes</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" data-id="${recipe.id}">
                <div class="recipe-header">
                    <span class="recipe-category ${recipe.category}">${recipe.category === 'pickles' ? '🥒' : '🍪'} ${recipe.category}</span>
                </div>
                <h3 class="recipe-name">${recipe.name}</h3>
                <div class="recipe-meta">
                    <span><i class="fas fa-clock"></i> ${recipe.total_time || recipe.totalTime || 'N/A'}</span>
                    <span><i class="fas fa-balance-scale"></i> ${recipe.batch_size || recipe.batchSize || 'N/A'}</span>
                </div>
                <div class="recipe-cost">
                    <span>Ingredient Cost:</span>
                    <strong>${Utils.formatCurrency(recipe.total_ingredient_cost || recipe.totalIngredientCost || 0)}</strong>
                </div>
                <div class="recipe-actions">
                    <button class="btn btn-sm" onclick="Recipes.viewRecipe('${recipe.id}')"><i class="fas fa-eye"></i> View</button>
                    <button class="btn-icon" onclick="Recipes.editRecipe('${recipe.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon danger" onclick="Recipes.deleteRecipe('${recipe.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    },

    addIngredient() {
        const name = document.getElementById('ingredientName').value.trim();
        const quantity = document.getElementById('ingredientQty').value.trim();
        const cost = parseFloat(document.getElementById('ingredientCost').value) || 0;

        if (!name) {
            Toast.warning('Enter Name', 'Please enter ingredient name');
            return;
        }

        this.currentRecipe.ingredients.push({ name, quantity, cost });
        this.updateIngredientsList();

        document.getElementById('ingredientName').value = '';
        document.getElementById('ingredientQty').value = '';
        document.getElementById('ingredientCost').value = '';
    },

    removeIngredient(index) {
        this.currentRecipe.ingredients.splice(index, 1);
        this.updateIngredientsList();
    },

    updateIngredientsList() {
        const container = document.getElementById('ingredientsList');
        
        if (this.currentRecipe.ingredients.length === 0) {
            container.innerHTML = '<p class="empty-text">No ingredients added</p>';
            document.getElementById('totalIngredientCost').textContent = '$0.00';
            return;
        }

        container.innerHTML = this.currentRecipe.ingredients.map((ing, index) => `
            <div class="ingredient-item">
                <span class="ing-name">${ing.name}</span>
                <span class="ing-qty">${ing.quantity}</span>
                <span class="ing-cost">${Utils.formatCurrency(ing.cost)}</span>
                <button class="btn-remove" onclick="Recipes.removeIngredient(${index})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');

        const totalCost = this.currentRecipe.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
        document.getElementById('totalIngredientCost').textContent = Utils.formatCurrency(totalCost);
    },

    addStep() {
        const step = document.getElementById('recipeStep').value.trim();

        if (!step) {
            Toast.warning('Enter Step', 'Please enter a step');
            return;
        }

        this.currentRecipe.steps.push(step);
        this.updateStepsList();
        document.getElementById('recipeStep').value = '';
    },

    removeStep(index) {
        this.currentRecipe.steps.splice(index, 1);
        this.updateStepsList();
    },

    updateStepsList() {
        const container = document.getElementById('stepsList');
        
        if (this.currentRecipe.steps.length === 0) {
            container.innerHTML = '<p class="empty-text">No steps added</p>';
            return;
        }

        container.innerHTML = this.currentRecipe.steps.map((step, index) => `
            <div class="step-item">
                <span class="step-num">${index + 1}</span>
                <span class="step-text">${step}</span>
                <button class="btn-remove" onclick="Recipes.removeStep(${index})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    },

    async saveRecipe() {
        const name = document.getElementById('recipeName').value.trim();
        const category = document.getElementById('recipeCategory').value;
        const batchSize = document.getElementById('recipeBatchSize')?.value.trim() || '';
        const totalTime = document.getElementById('recipeTotalTime')?.value.trim() || '';
        const notes = document.getElementById('recipeNotes')?.value.trim() || '';

        if (!name) {
            Toast.error('Name Required', 'Please enter recipe name');
            return;
        }

        const totalIngredientCost = this.currentRecipe.ingredients.reduce((sum, ing) => sum + ing.cost, 0);

        const recipe = {
            id: document.getElementById('recipeId')?.value || null,
            name,
            category,
            batchSize,
            totalTime,
            ingredients: this.currentRecipe.ingredients,
            steps: this.currentRecipe.steps,
            notes,
            totalIngredientCost
        };

        const result = await API.saveRecipe(recipe);
        
        if (result.success) {
            Toast.success('Saved', `${name} recipe has been saved`);
            await DataStore.loadAll();
            Modal.close('recipeModal');
            this.refresh();
            this.clearForm();
        } else {
            Toast.error('Error', 'Failed to save recipe');
        }
    },

    clearForm() {
        this.currentRecipe = { ingredients: [], steps: [] };
        if (document.getElementById('recipeId')) document.getElementById('recipeId').value = '';
        document.getElementById('recipeName').value = '';
        document.getElementById('recipeCategory').value = 'pickles';
        if (document.getElementById('recipeBatchSize')) document.getElementById('recipeBatchSize').value = '';
        if (document.getElementById('recipeTotalTime')) document.getElementById('recipeTotalTime').value = '';
        if (document.getElementById('recipeNotes')) document.getElementById('recipeNotes').value = '';
        this.updateIngredientsList();
        this.updateStepsList();
    },

    editRecipe(recipeId) {
        const recipe = DataStore.recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        this.currentRecipe = {
            ingredients: [...(recipe.ingredients || [])],
            steps: [...(recipe.steps || [])]
        };

        if (document.getElementById('recipeId')) document.getElementById('recipeId').value = recipe.id;
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeCategory').value = recipe.category;
        if (document.getElementById('recipeBatchSize')) document.getElementById('recipeBatchSize').value = recipe.batch_size || recipe.batchSize || '';
        if (document.getElementById('recipeTotalTime')) document.getElementById('recipeTotalTime').value = recipe.total_time || recipe.totalTime || '';
        if (document.getElementById('recipeNotes')) document.getElementById('recipeNotes').value = recipe.notes || '';

        this.updateIngredientsList();
        this.updateStepsList();
        Modal.open('recipeModal');
    },

    viewRecipe(recipeId) {
        const recipe = DataStore.recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        const modal = document.getElementById('viewRecipeModal');
        if (!modal) return;

        document.getElementById('viewRecipeName').textContent = recipe.name;
        document.getElementById('viewRecipeCategory').textContent = recipe.category;
        document.getElementById('viewRecipeBatchSize').textContent = recipe.batch_size || recipe.batchSize || 'N/A';
        document.getElementById('viewRecipeTime').textContent = recipe.total_time || recipe.totalTime || 'N/A';
        
        document.getElementById('viewRecipeIngredients').innerHTML = (recipe.ingredients || []).map(ing => 
            `<li>${ing.name} - ${ing.quantity} (${Utils.formatCurrency(ing.cost)})</li>`
        ).join('');
        
        document.getElementById('viewRecipeSteps').innerHTML = (recipe.steps || []).map((step, i) => 
            `<li>${step}</li>`
        ).join('');
        
        document.getElementById('viewRecipeNotes').textContent = recipe.notes || 'No notes';
        document.getElementById('viewRecipeTotalCost').textContent = Utils.formatCurrency(recipe.total_ingredient_cost || recipe.totalIngredientCost || 0);

        Modal.open('viewRecipeModal');
    },

    async deleteRecipe(recipeId) {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        const result = await API.deleteRecipe(recipeId);
        
        if (result.success) {
            Toast.success('Deleted', 'Recipe has been deleted');
            await DataStore.loadAll();
            this.refresh();
        }
    }
};
