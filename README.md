# 🫙 90's JAR - Homemade Pickles & Snacks Management System

A comprehensive web application to manage your homemade pickles and snacks business.

## ✨ Features

### 📊 Dashboard
- Real-time statistics (today's orders, revenue, pending orders)
- Popular items tracking
- Upcoming deliveries with deadlines
- Stock alerts
- Revenue charts

### 🛒 Orders Management
- Create orders with customer details
- Add regular items or combo packs
- Order status workflow (Pending → Preparing → Ready → Delivered)
- Deadline tracking
- Discount support

### 📦 Inventory Management
- Two categories: **Homemade Pickles** & **Homemade Snacks**
- Track cost price, selling price, stock
- Margin calculation
- Low stock alerts

### 🎁 Combo Packs
- Create special combo deals
- Bundle multiple items
- Special combo pricing
- Customer savings display

### 📖 Recipes
- Full recipe management
- Ingredients with costs
- Step-by-step instructions
- Duration & tips for each step
- Consistency maintenance

### 👥 Customers
- Auto-captured from orders
- Track orders & spending
- VIP customer badges

### 💰 Finance & Budget
- Income & expense tracking
- Category-wise breakdown
- Monthly charts
- Net profit calculation

### 🏷️ Labels & Pricing
- Create promotional offers
- Generate printable labels
- Pricing management

### 📜 Order History
- Complete delivered orders archive
- Export to CSV
- Statistics & analytics

## 🚀 Local Development

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/90s-jar.git
cd 90s-jar
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the app:
```bash
python server.py
```

4. Open browser: `http://localhost:5000`

## 🌐 Deploy to Render (FREE)

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Create repository named `90s-jar`
3. Push your code:

```bash
git init
git add .
git commit -m "Initial commit - 90s JAR"
git remote add origin https://github.com/YOUR_USERNAME/90s-jar.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to https://render.com (Sign up with GitHub)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Fill in details:
   - **Name:** `90s-jar`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn wsgi:app`
   - **Instance Type:** Free

5. Click **Create Web Service**
6. Wait 2-3 minutes for deployment
7. Your URL: `https://90s-jar.onrender.com`

## 📱 Usage

- **Add Items:** Go to Inventory → Add Item
- **Create Orders:** Click "New Order" → Add customer & items
- **Track Orders:** Update status as you prepare and deliver
- **Manage Recipes:** Add complete recipes for consistency
- **View Analytics:** Dashboard shows all key metrics

## 💾 Data Storage

All data is stored in the browser's localStorage:
- Persistent across sessions
- Backup/restore available in Settings
- Export data as JSON

## 🎨 Features

- 🌙 Dark mode support
- 📱 Responsive design (mobile-friendly)
- 🔔 Stock alerts & notifications
- 🔍 Global search
- 📊 Charts & analytics

## 📄 License

MIT License - Feel free to use and modify!

---

Made with ❤️ for homemade food businesses
