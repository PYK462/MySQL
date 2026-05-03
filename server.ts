import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
// Using SQLite as a drop-in replacement compatible with the system format
const db = new Database('campus_trading.db');

// Setup DB schema based on user SQL
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
      UserID TEXT PRIMARY KEY,
      UserName TEXT NOT NULL,
      Password TEXT NOT NULL,
      Phone TEXT,
      Email TEXT,
      StudentID TEXT,
      Avatar TEXT,
      Role INTEGER DEFAULT 0,
      RegTime DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS Categories (
      CategoryID INTEGER PRIMARY KEY AUTOINCREMENT,
      CategoryName TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Items (
      ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
      ItemName TEXT NOT NULL,
      Description TEXT,
      Price REAL NOT NULL,
      OriginalPrice REAL,
      UsageStatus TEXT,
      Image TEXT,
      Status INTEGER DEFAULT 1,
      SellerID TEXT,
      CategoryID INTEGER,
      PublishTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (SellerID) REFERENCES Users(UserID),
      FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
  );

  CREATE TABLE IF NOT EXISTS Orders (
      OrderID TEXT PRIMARY KEY,
      ItemID INTEGER NOT NULL,
      BuyerID TEXT NOT NULL,
      SellerID TEXT NOT NULL,
      TotalAmount REAL NOT NULL,
      OrderStatus INTEGER DEFAULT 0,
      OrderTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      PaymentTime DATETIME,
      ShippingTime DATETIME,
      CompletionTime DATETIME,
      FOREIGN KEY (ItemID) REFERENCES Items(ItemID),
      FOREIGN KEY (BuyerID) REFERENCES Users(UserID),
      FOREIGN KEY (SellerID) REFERENCES Users(UserID)
  );

  CREATE TABLE IF NOT EXISTS Comments (
      CommentID INTEGER PRIMARY KEY AUTOINCREMENT,
      ItemID INTEGER NOT NULL,
      UserID TEXT NOT NULL,
      Content TEXT NOT NULL,
      ParentID INTEGER DEFAULT 0,
      CommentTime DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ItemID) REFERENCES Items(ItemID),
      FOREIGN KEY (UserID) REFERENCES Users(UserID)
  );

  CREATE INDEX IF NOT EXISTS idx_items_category ON Items(CategoryID);
  CREATE INDEX IF NOT EXISTS idx_items_status ON Items(Status);
`);

// Seed data if empty
const usersCount = db.prepare('SELECT COUNT(*) as count FROM Users').get() as { count: number };
if (usersCount.count === 0) {
  // Run insert mock data
  db.exec(`
    INSERT INTO Categories (CategoryName) VALUES ('电子产品'), ('书籍'), ('生活用品'), ('体育用品'), ('其他');
    
    INSERT INTO Users (UserID, UserName, Password, Phone, Email, StudentID, Avatar, Role) VALUES
    ('U001', '张三', '123456', '13800138001', 'zhangsan@example.com', '20200101', 'avatar1.jpg', 0),
    ('U002', '李四', '123456', '13900139002', 'lisi@example.com', '20200102', 'avatar2.jpg', 0),
    ('U003', '王五', '123456', '13700137003', 'wangwu@example.com', '20200103', 'avatar3.jpg', 1),
    ('U004', '赵六', '123456', '13600136004', 'zhaoliu@example.com', '20200104', 'avatar4.jpg', 0);

    INSERT INTO Items (ItemName, Description, Price, OriginalPrice, UsageStatus, Image, Status, SellerID, CategoryID) VALUES
    ('iPhone 13', '9成新，无划痕，配件齐全', 4999.00, 6999.00, '九成新', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5', 1, 'U001', 1),
    ('MacBook Pro', '2021款，16GB内存，512GB固态硬盘', 8999.00, 12999.00, '八成新', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 1, 'U001', 1),
    ('算法导论', '全新，未拆封', 50.00, 100.00, '全新', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f', 1, 'U002', 2),
    ('蓝牙音箱', 'JBL品牌，音质好', 150.00, 300.00, '八成新', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1', 1, 'U004', 3),
    ('篮球', '斯伯丁品牌，几乎全新', 80.00, 150.00, '九成新', 'https://images.unsplash.com/photo-1546519638-68e109498ffc', 1, 'U001', 4);

    INSERT INTO Orders (OrderID, ItemID, BuyerID, SellerID, TotalAmount, OrderStatus, OrderTime) VALUES
    ('O20230101001', 1, 'U002', 'U001', 4999.00, 1, '2023-01-01 10:00:00');

    INSERT INTO Comments (ItemID, UserID, Content, ParentID) VALUES
    (1, 'U002', '这个手机还能便宜吗？', 0),
    (1, 'U001', '可以再便宜200元', 1);
  `);
}

// API Routes
app.get('/api/users', (req, res) => {
  const stmt = db.prepare('SELECT * FROM Users ORDER BY RegTime DESC');
  res.json(stmt.all());
});

app.post('/api/users', (req, res) => {
  const { UserID, UserName, Password, Phone, Email, StudentID, Avatar, Role } = req.body;
  const stmt = db.prepare(`
    INSERT INTO Users (UserID, UserName, Password, Phone, Email, StudentID, Avatar, Role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  try {
    stmt.run(UserID, UserName, Password, Phone, Email, StudentID, Avatar, Role);
    res.json({ success: true, UserID });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'UserID already exists' });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

app.delete('/api/users/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (userId !== req.params.id && role !== '1') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    db.transaction(() => {
      db.prepare('DELETE FROM Comments WHERE UserID = ?').run(req.params.id);
      db.prepare('DELETE FROM Orders WHERE BuyerID = ? OR SellerID = ?').run(req.params.id, req.params.id);
      db.prepare('DELETE FROM Items WHERE SellerID = ?').run(req.params.id);
      db.prepare('DELETE FROM Users WHERE UserID = ?').run(req.params.id);
    })();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/categories', (req, res) => {
  const stmt = db.prepare('SELECT * FROM Categories');
  res.json(stmt.all());
});

app.get('/api/items', (req, res) => {
  const { categoryId, search } = req.query;
  let query = `
    SELECT i.*, u.UserName as SellerName, c.CategoryName 
    FROM Items i
    JOIN Users u ON i.SellerID = u.UserID
    JOIN Categories c ON i.CategoryID = c.CategoryID
    WHERE i.Status = 1
  `;
  
  const queryParams: any[] = [];
  
  if (categoryId) {
    query += ` AND i.CategoryID = ?`;
    queryParams.push(Number(categoryId));
  }
  
  if (search) {
    query += ` AND (i.ItemName LIKE ? OR i.Description LIKE ?)`;
    queryParams.push(`%${search}%`, `%${search}%`);
  }
  
  query += ' ORDER BY i.PublishTime DESC';
  
  const stmt = db.prepare(query);
  res.json(stmt.all(...queryParams));
});

app.get('/api/items/:id', (req, res) => {
  const stmt = db.prepare(`
    SELECT i.*, u.UserName as SellerName, u.Avatar as SellerAvatar, c.CategoryName 
    FROM Items i
    JOIN Users u ON i.SellerID = u.UserID
    JOIN Categories c ON i.CategoryID = c.CategoryID
    WHERE i.ItemID = ? AND i.Status = 1
  `);
  const item = stmt.get(req.params.id);
  if (item) res.json(item);
  else res.status(404).json({ error: 'Item not found' });
});

app.post('/api/items', (req, res) => {
  const { ItemName, Description, Price, OriginalPrice, UsageStatus, ImageUrl, SellerID, CategoryID } = req.body;
  const stmt = db.prepare(`
    INSERT INTO Items (ItemName, Description, Price, OriginalPrice, UsageStatus, Image, SellerID, CategoryID)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const originalPriceVal = OriginalPrice === '' ? null : OriginalPrice;
  const imageVal = ImageUrl === '' ? null : ImageUrl;
  
  const info = stmt.run(ItemName, Description, Price, originalPriceVal, UsageStatus, imageVal, SellerID, CategoryID);
  res.json({ success: true, ItemID: info.lastInsertRowid });
});

app.put('/api/items/:id', (req, res) => {
  const { ItemName, Description, Price, UsageStatus, OriginalPrice, SellerID } = req.body;
  const stmt = db.prepare(`
    UPDATE Items 
    SET ItemName = ?, Description = ?, Price = ?, UsageStatus = ?, OriginalPrice = ?
    WHERE ItemID = ? AND SellerID = ?
  `);
  
  const originalPriceVal = OriginalPrice === '' ? null : OriginalPrice;
  
  const info = stmt.run(ItemName, Description, Price, UsageStatus, originalPriceVal, req.params.id, SellerID);
  
  if (info.changes > 0) {
    res.json({ success: true });
  } else {
    res.status(403).json({ error: 'Not authorized or item not found' });
  }
});

app.delete('/api/items/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const itemStmt = db.prepare('SELECT SellerID FROM Items WHERE ItemID = ?');
  const item = itemStmt.get(req.params.id) as { SellerID: string } | undefined;

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (item.SellerID === userId || role === '1') {
    const stmt = db.prepare('UPDATE Items SET Status = -1 WHERE ItemID = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});

app.get('/api/items/:id/comments', (req, res) => {
  // Left join self for nesting could be done in SQL or Code. Since it's light, we do in sql
  const stmt = db.prepare(`
    SELECT c.*, u.UserName as CommentUser 
    FROM Comments c
    JOIN Users u ON c.UserID = u.UserID
    WHERE c.ItemID = ?
    ORDER BY c.CommentTime ASC
  `);
  res.json(stmt.all(req.params.id));
});

app.post('/api/items/:id/comments', (req, res) => {
  const { UserID, Content, ParentID = 0 } = req.body;
  const stmt = db.prepare(`
    INSERT INTO Comments (ItemID, UserID, Content, ParentID) 
    VALUES (?, ?, ?, ?)
  `);
  const info = stmt.run(req.params.id, UserID, Content, ParentID);
  
  const newCommentStmt = db.prepare(`
    SELECT c.*, u.UserName as CommentUser 
    FROM Comments c
    JOIN Users u ON c.UserID = u.UserID
    WHERE c.CommentID = ?
  `);
  const newComment = newCommentStmt.get(info.lastInsertRowid);
  res.json(newComment);
});

// Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Prod route mapping
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
