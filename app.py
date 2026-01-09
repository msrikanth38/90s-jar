"""
90's JAR - Flask Backend with PostgreSQL (Production) / SQLite (Local)
"""
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import psycopg (v3) for PostgreSQL, fallback to sqlite3
POSTGRES_IMPORT_ERROR = None
try:
    import psycopg
    from psycopg.rows import dict_row
    HAS_POSTGRES = True
    logger.info("psycopg loaded successfully")
except Exception as e:
    HAS_POSTGRES = False
    POSTGRES_IMPORT_ERROR = str(e)
    logger.warning(f"psycopg not available: {e}")

import sqlite3

app = Flask(__name__, static_folder='.')
CORS(app)

# Database setup - Use PostgreSQL if DATABASE_URL is set, otherwise SQLite
DATABASE_URL = os.environ.get('DATABASE_URL')
DB_FILE = 'jar_database.db'

logger.info(f"DATABASE_URL set: {bool(DATABASE_URL)}")
logger.info(f"HAS_POSTGRES: {HAS_POSTGRES}")
logger.info(f"Using PostgreSQL: {bool(DATABASE_URL and HAS_POSTGRES)}")

def get_db():
    """Get database connection - PostgreSQL in production, SQLite locally"""
    if DATABASE_URL and HAS_POSTGRES:
        conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
        return conn, True  # Return conn and is_postgres flag
    else:
        conn = sqlite3.connect(DB_FILE)
        conn.row_factory = sqlite3.Row
        return conn, False

def execute_query(query, params=(), fetch=False, fetchone=False, commit=False):
    """Execute a query with proper database handling"""
    conn, is_postgres = get_db()
    
    if is_postgres:
        cur = conn.cursor()
        # Convert ? placeholders to %s for PostgreSQL
        query = query.replace('?', '%s')
    else:
        cur = conn.cursor()
    
    try:
        cur.execute(query, params)
        
        if fetch:
            result = cur.fetchall()
            if is_postgres:
                result = [dict(row) if hasattr(row, 'keys') else row for row in result]
            else:
                result = [dict(row) for row in result]
            conn.close()
            return result
        elif fetchone:
            result = cur.fetchone()
            if result:
                result = dict(result)
            conn.close()
            return result
        elif commit:
            conn.commit()
            conn.close()
            return True
        else:
            conn.close()
            return None
    except Exception as e:
        conn.close()
        logger.error(f"Query error: {e}")
        raise e

def init_db():
    """Initialize database with tables"""
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    logger.info(f"init_db called - using PostgreSQL: {is_postgres}")
    
    if is_postgres:
        # PostgreSQL syntax
        cur.execute('''CREATE TABLE IF NOT EXISTS inventory (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            cost_price REAL NOT NULL,
            selling_price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            unit TEXT DEFAULT 'pcs',
            description TEXT,
            shelf_life INTEGER,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            total_orders INTEGER DEFAULT 0,
            total_spent REAL DEFAULT 0,
            created_at TEXT,
            last_order TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_email TEXT,
            customer_address TEXT,
            items TEXT,
            subtotal REAL,
            discount REAL DEFAULT 0,
            total REAL,
            deadline TEXT,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT,
            delivered_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS order_history (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_email TEXT,
            customer_address TEXT,
            items TEXT,
            subtotal REAL,
            discount REAL DEFAULT 0,
            total REAL,
            deadline TEXT,
            notes TEXT,
            status TEXT,
            created_at TEXT,
            delivered_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS combos (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            items TEXT,
            regular_total REAL,
            savings REAL,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            batch_size TEXT,
            total_time TEXT,
            ingredients TEXT,
            steps TEXT,
            notes TEXT,
            total_ingredient_cost REAL DEFAULT 0,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            category TEXT,
            amount REAL NOT NULL,
            date TEXT,
            description TEXT,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS offers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            value REAL,
            start_date TEXT,
            end_date TEXT,
            active INTEGER DEFAULT 1,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )''')
        
    else:
        # SQLite syntax
        cur.execute('''CREATE TABLE IF NOT EXISTS inventory (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            cost_price REAL NOT NULL,
            selling_price REAL NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            unit TEXT DEFAULT 'pcs',
            description TEXT,
            shelf_life INTEGER,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            total_orders INTEGER DEFAULT 0,
            total_spent REAL DEFAULT 0,
            created_at TEXT,
            last_order TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_email TEXT,
            customer_address TEXT,
            items TEXT,
            subtotal REAL,
            discount REAL DEFAULT 0,
            total REAL,
            deadline TEXT,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT,
            delivered_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS order_history (
            id TEXT PRIMARY KEY,
            order_id TEXT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_email TEXT,
            customer_address TEXT,
            items TEXT,
            subtotal REAL,
            discount REAL DEFAULT 0,
            total REAL,
            deadline TEXT,
            notes TEXT,
            status TEXT,
            created_at TEXT,
            delivered_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS combos (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            items TEXT,
            regular_total REAL,
            savings REAL,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS recipes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            batch_size TEXT,
            total_time TEXT,
            ingredients TEXT,
            steps TEXT,
            notes TEXT,
            total_ingredient_cost REAL DEFAULT 0,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            category TEXT,
            amount REAL NOT NULL,
            date TEXT,
            description TEXT,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS offers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            value REAL,
            start_date TEXT,
            end_date TEXT,
            active INTEGER DEFAULT 1,
            created_at TEXT
        )''')
        
        cur.execute('''CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )''')
    
    conn.commit()
    conn.close()
    
    logger.info("Database tables created")
    add_sample_data()

def add_sample_data():
    """Add sample inventory data if empty"""
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    if is_postgres:
        cur.execute('SELECT COUNT(*) as count FROM inventory')
    else:
        cur.execute('SELECT COUNT(*) FROM inventory')
    
    result = cur.fetchone()
    count = result['count'] if is_postgres else result[0]
    
    if count == 0:
        logger.info("Adding sample inventory data")
        now = datetime.now().isoformat()
        
        sample_items = [
            ('pickle1', 'Mango Pickle (Avakaya)', 'pickles', 2.50, 5.00, 20, '90g jar', 'Traditional Telugu style mango pickle', 180),
            ('pickle2', 'Lemon Pickle', 'pickles', 2.50, 5.00, 15, '90g jar', 'Tangy homemade lemon pickle', 180),
            ('pickle3', 'Gongura Pickle', 'pickles', 2.50, 5.00, 15, '90g jar', 'Authentic Andhra gongura pickle', 180),
            ('pickle4', 'Prawns Pickle', 'pickles', 3.00, 5.00, 10, '90g jar', 'Spicy prawns pickle', 90),
            ('pickle5', 'Chicken Pickle', 'pickles', 3.00, 5.00, 10, '90g jar', 'Delicious chicken pickle', 90),
            ('pickle6', 'Mutton Pickle', 'pickles', 3.50, 5.00, 8, '90g jar', 'Rich mutton pickle', 90),
            ('snack1', 'Chakkalu', 'snacks', 3.00, 6.00, 25, 'packet', 'Crispy rice flour chakralu', 30),
            ('snack2', 'Janthikalu', 'snacks', 3.00, 6.00, 25, 'packet', 'Traditional janthikalu snack', 30),
            ('snack3', 'Boondi', 'snacks', 2.50, 5.00, 20, 'packet', 'Crispy gram flour boondi', 30),
            ('snack4', 'Gavvalu', 'snacks', 3.00, 6.00, 20, 'packet', 'Shell shaped sweet snack', 30),
            ('snack5', 'Gulabilu', 'snacks', 3.50, 7.00, 15, 'packet', 'Rose shaped sweet gulabilu', 30),
            ('snack6', 'Kobbari Laddu', 'snacks', 4.00, 8.00, 15, 'packet', 'Coconut laddu', 15),
            ('snack7', 'Ravva Laddu', 'snacks', 3.50, 7.00, 15, 'packet', 'Semolina laddu', 15),
            ('snack8', 'Kajjikayalu', 'snacks', 4.00, 8.00, 15, 'packet', 'Sweet stuffed kajjikayalu', 15),
        ]
        
        for item in sample_items:
            if is_postgres:
                cur.execute('''
                    INSERT INTO inventory (id, name, category, cost_price, selling_price, stock, unit, description, shelf_life, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                ''', (*item, now))
            else:
                cur.execute('''
                    INSERT OR IGNORE INTO inventory (id, name, category, cost_price, selling_price, stock, unit, description, shelf_life, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (*item, now))
        
        # Add default combos
        combos = [
            ('combo1', 'Any 4 Items Combo', 'Choose any 4 items from our snacks collection!', 22.00, '[]', 24.00, 2.00),
            ('combo2', 'Any 2 Items Combo', 'Choose any 2 items from our snacks collection!', 15.00, '[]', 12.00, 0.00),
        ]
        
        for combo in combos:
            if is_postgres:
                cur.execute('''
                    INSERT INTO combos (id, name, description, price, items, regular_total, savings, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                ''', (*combo, now))
            else:
                cur.execute('''
                    INSERT OR IGNORE INTO combos (id, name, description, price, items, regular_total, savings, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (*combo, now))
        
        conn.commit()
        logger.info("Sample data added")
    
    conn.close()

def generate_id():
    import random
    import string
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))

# ===== Static Files =====
@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# ===== Inventory API =====
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    items = execute_query('SELECT * FROM inventory ORDER BY name', fetch=True)
    return jsonify(items)

@app.route('/api/inventory', methods=['POST'])
def add_inventory_item():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    item_id = data.get('id') or generate_id()
    now = datetime.now().isoformat()
    
    if is_postgres:
        cur.execute('''
            INSERT INTO inventory (id, name, category, cost_price, selling_price, stock, unit, description, shelf_life, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, category = EXCLUDED.category, cost_price = EXCLUDED.cost_price,
                selling_price = EXCLUDED.selling_price, stock = EXCLUDED.stock, unit = EXCLUDED.unit,
                description = EXCLUDED.description, shelf_life = EXCLUDED.shelf_life
        ''', (item_id, data['name'], data['category'], data['costPrice'], data['sellingPrice'],
              data['stock'], data.get('unit', 'pcs'), data.get('description', ''), data.get('shelfLife'), now))
    else:
        cur.execute('''
            INSERT OR REPLACE INTO inventory (id, name, category, cost_price, selling_price, stock, unit, description, shelf_life, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (item_id, data['name'], data['category'], data['costPrice'], data['sellingPrice'],
              data['stock'], data.get('unit', 'pcs'), data.get('description', ''), data.get('shelfLife'), now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': item_id})

@app.route('/api/inventory/<item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    execute_query('DELETE FROM inventory WHERE id = ?', (item_id,), commit=True)
    return jsonify({'success': True})

@app.route('/api/inventory/<item_id>/stock', methods=['PUT'])
def update_stock(item_id):
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    if is_postgres:
        cur.execute('UPDATE inventory SET stock = stock + %s WHERE id = %s', (data['change'], item_id))
    else:
        cur.execute('UPDATE inventory SET stock = stock + ? WHERE id = ?', (data['change'], item_id))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ===== Customers API =====
@app.route('/api/customers', methods=['GET'])
def get_customers():
    customers = execute_query('SELECT * FROM customers ORDER BY total_spent DESC', fetch=True)
    return jsonify(customers)

@app.route('/api/customers', methods=['POST'])
def add_customer():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    customer_id = data.get('id') or generate_id()
    now = datetime.now().isoformat()
    
    if is_postgres:
        cur.execute('''
            INSERT INTO customers (id, name, phone, email, address, notes, total_orders, total_spent, created_at, last_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email,
                address = EXCLUDED.address, notes = EXCLUDED.notes
        ''', (customer_id, data['name'], data.get('phone', ''), data.get('email', ''),
              data.get('address', ''), data.get('notes', ''), data.get('totalOrders', 0),
              data.get('totalSpent', 0), now, data.get('lastOrder')))
    else:
        cur.execute('''
            INSERT OR REPLACE INTO customers (id, name, phone, email, address, notes, total_orders, total_spent, created_at, last_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (customer_id, data['name'], data.get('phone', ''), data.get('email', ''),
              data.get('address', ''), data.get('notes', ''), data.get('totalOrders', 0),
              data.get('totalSpent', 0), now, data.get('lastOrder')))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': customer_id})

@app.route('/api/customers/<customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    execute_query('DELETE FROM customers WHERE id = ?', (customer_id,), commit=True)
    return jsonify({'success': True})

# ===== Orders API =====
@app.route('/api/orders', methods=['GET'])
def get_orders():
    orders = execute_query('SELECT * FROM orders ORDER BY created_at DESC', fetch=True)
    for order in orders:
        order['items'] = json.loads(order['items']) if order['items'] else []
    return jsonify(orders)

@app.route('/api/orders', methods=['POST'])
def add_order():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    order_id = data.get('id') or generate_id()
    order_number = data.get('orderId') or f"ORD-{datetime.now().strftime('%H%M%S')}"
    now = datetime.now().isoformat()
    items_json = json.dumps(data.get('items', []))
    
    if is_postgres:
        cur.execute('''
            INSERT INTO orders (id, order_id, customer_name, customer_phone, customer_email, customer_address, items, subtotal, discount, total, deadline, notes, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                items = EXCLUDED.items, subtotal = EXCLUDED.subtotal, discount = EXCLUDED.discount,
                total = EXCLUDED.total, status = EXCLUDED.status, notes = EXCLUDED.notes
        ''', (order_id, order_number, data['customerName'], data.get('customerPhone', ''),
              data.get('customerEmail', ''), data.get('customerAddress', ''), items_json,
              data.get('subtotal', 0), data.get('discount', 0), data.get('total', 0),
              data.get('deadline'), data.get('notes', ''), data.get('status', 'pending'), now))
        
        # Update inventory stock
        for item in data.get('items', []):
            if not item.get('isCombo') and not item.get('isManual'):
                cur.execute('UPDATE inventory SET stock = stock - %s WHERE id = %s', (item['quantity'], item['itemId']))
        
        # Update/Create customer
        cur.execute('SELECT * FROM customers WHERE LOWER(name) = LOWER(%s)', (data['customerName'],))
        customer = cur.fetchone()
        
        if customer:
            cur.execute('''
                UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + %s, last_order = %s,
                phone = COALESCE(NULLIF(%s, ''), phone), email = COALESCE(NULLIF(%s, ''), email), address = COALESCE(NULLIF(%s, ''), address)
                WHERE LOWER(name) = LOWER(%s)
            ''', (data.get('total', 0), now, data.get('customerPhone', ''), data.get('customerEmail', ''), data.get('customerAddress', ''), data['customerName']))
        else:
            new_customer_id = generate_id()
            cur.execute('''
                INSERT INTO customers (id, name, phone, email, address, total_orders, total_spent, created_at, last_order)
                VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s)
            ''', (new_customer_id, data['customerName'], data.get('customerPhone', ''), data.get('customerEmail', ''), data.get('customerAddress', ''), data.get('total', 0), now, now))
    else:
        cur.execute('''
            INSERT OR REPLACE INTO orders (id, order_id, customer_name, customer_phone, customer_email, customer_address, items, subtotal, discount, total, deadline, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (order_id, order_number, data['customerName'], data.get('customerPhone', ''),
              data.get('customerEmail', ''), data.get('customerAddress', ''), items_json,
              data.get('subtotal', 0), data.get('discount', 0), data.get('total', 0),
              data.get('deadline'), data.get('notes', ''), data.get('status', 'pending'), now))
        
        # Update inventory stock
        for item in data.get('items', []):
            if not item.get('isCombo') and not item.get('isManual'):
                cur.execute('UPDATE inventory SET stock = stock - ? WHERE id = ?', (item['quantity'], item['itemId']))
        
        # Update/Create customer
        cur.execute('SELECT * FROM customers WHERE LOWER(name) = LOWER(?)', (data['customerName'],))
        customer = cur.fetchone()
        
        if customer:
            cur.execute('''
                UPDATE customers SET total_orders = total_orders + 1, total_spent = total_spent + ?, last_order = ?,
                phone = COALESCE(NULLIF(?, ''), phone), email = COALESCE(NULLIF(?, ''), email), address = COALESCE(NULLIF(?, ''), address)
                WHERE LOWER(name) = LOWER(?)
            ''', (data.get('total', 0), now, data.get('customerPhone', ''), data.get('customerEmail', ''), data.get('customerAddress', ''), data['customerName']))
        else:
            new_customer_id = generate_id()
            cur.execute('''
                INSERT INTO customers (id, name, phone, email, address, total_orders, total_spent, created_at, last_order)
                VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
            ''', (new_customer_id, data['customerName'], data.get('customerPhone', ''), data.get('customerEmail', ''), data.get('customerAddress', ''), data.get('total', 0), now, now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': order_id, 'orderId': order_number})

@app.route('/api/orders/<order_id>', methods=['PUT'])
def update_order(order_id):
    data = request.json
    items_json = json.dumps(data.get('items', []))
    now = datetime.now().isoformat()
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    if is_postgres:
        cur.execute('''
            UPDATE orders SET customer_name = %s, customer_phone = %s, customer_email = %s, customer_address = %s,
            items = %s, subtotal = %s, discount = %s, total = %s, deadline = %s, notes = %s
            WHERE id = %s
        ''', (data['customerName'], data.get('customerPhone', ''), data.get('customerEmail', ''), data.get('customerAddress', ''),
              items_json, data.get('subtotal', 0), data.get('discount', 0), data.get('total', 0),
              data.get('deadline'), data.get('notes', ''), order_id))
    else:
        cur.execute('''
            UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_address = ?,
            items = ?, subtotal = ?, discount = ?, total = ?, deadline = ?, notes = ?
            WHERE id = ?
        ''', (data['customerName'], data.get('customerPhone', ''), data.get('customerEmail', ''), data.get('customerAddress', ''),
              items_json, data.get('subtotal', 0), data.get('discount', 0), data.get('total', 0),
              data.get('deadline'), data.get('notes', ''), order_id))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': order_id})

@app.route('/api/orders/<order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    data = request.json
    new_status = data['status']
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    if new_status == 'delivered':
        # Get order details
        if is_postgres:
            cur.execute('SELECT * FROM orders WHERE id = %s', (order_id,))
        else:
            cur.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
        
        order = cur.fetchone()
        if order:
            order = dict(order)
            now = datetime.now().isoformat()
            
            if is_postgres:
                cur.execute('''
                    INSERT INTO order_history (id, order_id, customer_name, customer_phone, customer_email, customer_address, items, subtotal, discount, total, deadline, notes, status, created_at, delivered_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (order['id'], order['order_id'], order['customer_name'], order['customer_phone'], order['customer_email'], order['customer_address'], order['items'], order['subtotal'], order['discount'], order['total'], order['deadline'], order['notes'], 'delivered', order['created_at'], now))
                cur.execute('DELETE FROM orders WHERE id = %s', (order_id,))
            else:
                cur.execute('''
                    INSERT INTO order_history (id, order_id, customer_name, customer_phone, customer_email, customer_address, items, subtotal, discount, total, deadline, notes, status, created_at, delivered_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (order['id'], order['order_id'], order['customer_name'], order['customer_phone'], order['customer_email'], order['customer_address'], order['items'], order['subtotal'], order['discount'], order['total'], order['deadline'], order['notes'], 'delivered', order['created_at'], now))
                cur.execute('DELETE FROM orders WHERE id = ?', (order_id,))
    else:
        if is_postgres:
            cur.execute('UPDATE orders SET status = %s WHERE id = %s', (new_status, order_id))
        else:
            cur.execute('UPDATE orders SET status = ? WHERE id = ?', (new_status, order_id))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/orders/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    execute_query('DELETE FROM orders WHERE id = ?', (order_id,), commit=True)
    return jsonify({'success': True})

# ===== Order History API =====
@app.route('/api/history', methods=['GET'])
def get_order_history():
    orders = execute_query('SELECT * FROM order_history ORDER BY delivered_at DESC', fetch=True)
    for order in orders:
        order['items'] = json.loads(order['items']) if order['items'] else []
    return jsonify(orders)

@app.route('/api/history/<history_id>', methods=['DELETE'])
def delete_history(history_id):
    execute_query('DELETE FROM order_history WHERE id = ?', (history_id,), commit=True)
    return jsonify({'success': True})

# ===== Combos API =====
@app.route('/api/combos', methods=['GET'])
def get_combos():
    combos = execute_query('SELECT * FROM combos ORDER BY name', fetch=True)
    for combo in combos:
        combo['items'] = json.loads(combo['items']) if combo['items'] else []
    return jsonify(combos)

@app.route('/api/combos', methods=['POST'])
def add_combo():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    combo_id = data.get('id') or generate_id()
    now = datetime.now().isoformat()
    items_json = json.dumps(data.get('items', []))
    
    if is_postgres:
        cur.execute('''
            INSERT INTO combos (id, name, description, price, items, regular_total, savings, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
                items = EXCLUDED.items, regular_total = EXCLUDED.regular_total, savings = EXCLUDED.savings
        ''', (combo_id, data['name'], data.get('description', ''), data['price'],
              items_json, data.get('regularTotal', 0), data.get('savings', 0), now))
    else:
        cur.execute('''
            INSERT OR REPLACE INTO combos (id, name, description, price, items, regular_total, savings, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (combo_id, data['name'], data.get('description', ''), data['price'],
              items_json, data.get('regularTotal', 0), data.get('savings', 0), now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': combo_id})

@app.route('/api/combos/<combo_id>', methods=['DELETE'])
def delete_combo(combo_id):
    execute_query('DELETE FROM combos WHERE id = ?', (combo_id,), commit=True)
    return jsonify({'success': True})

# ===== Recipes API =====
@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    recipes = execute_query('SELECT * FROM recipes ORDER BY name', fetch=True)
    for recipe in recipes:
        recipe['ingredients'] = json.loads(recipe['ingredients']) if recipe['ingredients'] else []
        recipe['steps'] = json.loads(recipe['steps']) if recipe['steps'] else []
    return jsonify(recipes)

@app.route('/api/recipes', methods=['POST'])
def add_recipe():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    recipe_id = data.get('id') or generate_id()
    now = datetime.now().isoformat()
    ingredients_json = json.dumps(data.get('ingredients', []))
    steps_json = json.dumps(data.get('steps', []))
    
    if is_postgres:
        cur.execute('''
            INSERT INTO recipes (id, name, category, batch_size, total_time, ingredients, steps, notes, total_ingredient_cost, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, category = EXCLUDED.category, batch_size = EXCLUDED.batch_size,
                total_time = EXCLUDED.total_time, ingredients = EXCLUDED.ingredients, steps = EXCLUDED.steps,
                notes = EXCLUDED.notes, total_ingredient_cost = EXCLUDED.total_ingredient_cost
        ''', (recipe_id, data['name'], data.get('category', 'pickles'), data.get('batchSize', ''),
              data.get('totalTime', ''), ingredients_json, steps_json, data.get('notes', ''),
              data.get('totalIngredientCost', 0), now))
    else:
        cur.execute('''
            INSERT OR REPLACE INTO recipes (id, name, category, batch_size, total_time, ingredients, steps, notes, total_ingredient_cost, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (recipe_id, data['name'], data.get('category', 'pickles'), data.get('batchSize', ''),
              data.get('totalTime', ''), ingredients_json, steps_json, data.get('notes', ''),
              data.get('totalIngredientCost', 0), now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': recipe_id})

@app.route('/api/recipes/<recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    execute_query('DELETE FROM recipes WHERE id = ?', (recipe_id,), commit=True)
    return jsonify({'success': True})

# ===== Transactions API =====
@app.route('/api/transactions', methods=['GET'])
def get_transactions():
    transactions = execute_query('SELECT * FROM transactions ORDER BY date DESC', fetch=True)
    return jsonify(transactions)

@app.route('/api/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    trans_id = data.get('id') or generate_id()
    now = datetime.now().isoformat()
    
    if is_postgres:
        cur.execute('''
            INSERT INTO transactions (id, type, category, amount, date, description, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (trans_id, data['type'], data.get('category', 'other'), data['amount'],
              data.get('date', now[:10]), data.get('description', ''), now))
    else:
        cur.execute('''
            INSERT INTO transactions (id, type, category, amount, date, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (trans_id, data['type'], data.get('category', 'other'), data['amount'],
              data.get('date', now[:10]), data.get('description', ''), now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': trans_id})

@app.route('/api/transactions/<trans_id>', methods=['DELETE'])
def delete_transaction(trans_id):
    execute_query('DELETE FROM transactions WHERE id = ?', (trans_id,), commit=True)
    return jsonify({'success': True})

# ===== Offers API =====
@app.route('/api/offers', methods=['GET'])
def get_offers():
    offers = execute_query('SELECT * FROM offers ORDER BY created_at DESC', fetch=True)
    return jsonify(offers)

@app.route('/api/offers', methods=['POST'])
def add_offer():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    offer_id = data.get('id') or generate_id()
    now = datetime.now().isoformat()
    
    if is_postgres:
        cur.execute('''
            INSERT INTO offers (id, name, type, value, start_date, end_date, active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 1, %s)
        ''', (offer_id, data['name'], data.get('type', 'percentage'), data.get('value', 0),
              data.get('startDate'), data.get('endDate'), now))
    else:
        cur.execute('''
            INSERT INTO offers (id, name, type, value, start_date, end_date, active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        ''', (offer_id, data['name'], data.get('type', 'percentage'), data.get('value', 0),
              data.get('startDate'), data.get('endDate'), now))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': offer_id})

@app.route('/api/offers/<offer_id>', methods=['DELETE'])
def delete_offer(offer_id):
    execute_query('DELETE FROM offers WHERE id = ?', (offer_id,), commit=True)
    return jsonify({'success': True})

# ===== Dashboard Stats API =====
@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    if is_postgres:
        cur.execute('SELECT COUNT(*) as count FROM orders WHERE created_at LIKE %s', (f'{today}%',))
        today_orders = cur.fetchone()['count']
        
        cur.execute("SELECT COUNT(*) as count FROM orders WHERE status != 'delivered'")
        pending_orders = cur.fetchone()['count']
        
        cur.execute('SELECT COALESCE(SUM(total), 0) as sum FROM orders WHERE created_at LIKE %s', (f'{today}%',))
        today_revenue = cur.fetchone()['sum']
        
        cur.execute('SELECT COUNT(*) as count FROM inventory WHERE stock <= 5')
        low_stock = cur.fetchone()['count']
        
        cur.execute('SELECT COUNT(*) as count FROM customers')
        total_customers = cur.fetchone()['count']
        
        cur.execute('SELECT COALESCE(SUM(total), 0) as sum FROM orders')
        orders_revenue = cur.fetchone()['sum']
        
        cur.execute('SELECT COALESCE(SUM(total), 0) as sum FROM order_history')
        history_revenue = cur.fetchone()['sum']
        
        cur.execute("SELECT COALESCE(SUM(amount), 0) as sum FROM transactions WHERE type = 'expense'")
        total_expenses = cur.fetchone()['sum']
    else:
        cur.execute('SELECT COUNT(*) FROM orders WHERE created_at LIKE ?', (f'{today}%',))
        today_orders = cur.fetchone()[0]
        
        cur.execute('SELECT COUNT(*) FROM orders WHERE status != "delivered"')
        pending_orders = cur.fetchone()[0]
        
        cur.execute('SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at LIKE ?', (f'{today}%',))
        today_revenue = cur.fetchone()[0]
        
        cur.execute('SELECT COUNT(*) FROM inventory WHERE stock <= 5')
        low_stock = cur.fetchone()[0]
        
        cur.execute('SELECT COUNT(*) FROM customers')
        total_customers = cur.fetchone()[0]
        
        cur.execute('SELECT COALESCE(SUM(total), 0) FROM orders')
        orders_revenue = cur.fetchone()[0]
        
        cur.execute('SELECT COALESCE(SUM(total), 0) FROM order_history')
        history_revenue = cur.fetchone()[0]
        
        cur.execute('SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = "expense"')
        total_expenses = cur.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'todayOrders': today_orders,
        'pendingOrders': pending_orders,
        'todayRevenue': today_revenue,
        'lowStockCount': low_stock,
        'totalCustomers': total_customers,
        'totalRevenue': orders_revenue + history_revenue,
        'totalExpenses': total_expenses
    })

# ===== Export/Import API =====
@app.route('/api/export', methods=['GET'])
def export_data():
    data = {}
    for table in ['inventory', 'customers', 'orders', 'order_history', 'combos', 'recipes', 'transactions', 'offers']:
        data[table] = execute_query(f'SELECT * FROM {table}', fetch=True)
    return jsonify(data)

@app.route('/api/import', methods=['POST'])
def import_data():
    data = request.json
    conn, is_postgres = get_db()
    cur = conn.cursor()
    
    # Clear existing data
    for table in ['inventory', 'customers', 'orders', 'order_history', 'combos', 'recipes', 'transactions', 'offers']:
        cur.execute(f'DELETE FROM {table}')
    
    # Import inventory
    for item in data.get('inventory', []):
        if is_postgres:
            cur.execute('''
                INSERT INTO inventory (id, name, category, cost_price, selling_price, stock, unit, description, shelf_life, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (item.get('id'), item.get('name'), item.get('category'), 
                  item.get('cost_price') or item.get('costPrice'), 
                  item.get('selling_price') or item.get('sellingPrice'), 
                  item.get('stock'), item.get('unit'), item.get('description'), 
                  item.get('shelf_life') or item.get('shelfLife'), 
                  item.get('created_at') or item.get('createdAt')))
        else:
            cur.execute('''
                INSERT INTO inventory (id, name, category, cost_price, selling_price, stock, unit, description, shelf_life, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (item.get('id'), item.get('name'), item.get('category'), 
                  item.get('cost_price') or item.get('costPrice'), 
                  item.get('selling_price') or item.get('sellingPrice'), 
                  item.get('stock'), item.get('unit'), item.get('description'), 
                  item.get('shelf_life') or item.get('shelfLife'), 
                  item.get('created_at') or item.get('createdAt')))
    
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ===== Debug endpoint =====
@app.route('/api/debug', methods=['GET'])
def debug_info():
    return jsonify({
        'database_url_set': bool(DATABASE_URL),
        'has_postgres': HAS_POSTGRES,
        'using_postgres': bool(DATABASE_URL and HAS_POSTGRES),
        'postgres_import_error': POSTGRES_IMPORT_ERROR
    })

# Initialize database on startup
init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
