CREATE DATABASE CampusTradingSystem DEFAULT CHARACTER SET utf8mb4;
USE CampusTradingSystem;

-- 1. 用户表
CREATE TABLE Users (
    UserID VARCHAR(20) PRIMARY KEY,
    UserName VARCHAR(50) NOT NULL,
    Password VARCHAR(50) NOT NULL,
    Phone VARCHAR(20),
    Email VARCHAR(100),
    StudentID VARCHAR(20),
    Avatar VARCHAR(255),
    Role INT DEFAULT 0, -- 0:普通用户, 1:管理员
    RegTime DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 分类表
CREATE TABLE Categories (
    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(50) NOT NULL
);

-- 3. 物品表
CREATE TABLE Items (
    ItemID INT AUTO_INCREMENT PRIMARY KEY,
    ItemName VARCHAR(100) NOT NULL,
    Description TEXT,
    Price DECIMAL(10, 2) NOT NULL,
    OriginalPrice DECIMAL(10, 2),
    UsageStatus VARCHAR(50), -- 全新、九成新、八成新等
    Image VARCHAR(255),
    Status INT DEFAULT 1, -- 1:在售, 0:已售, -1:下架
    SellerID VARCHAR(20),
    CategoryID INT,
    PublishTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SellerID) REFERENCES Users(UserID),
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);

-- 4. 订单表
CREATE TABLE Orders (
    OrderID VARCHAR(50) PRIMARY KEY,
    ItemID INT NOT NULL,
    BuyerID VARCHAR(20) NOT NULL,
    SellerID VARCHAR(20) NOT NULL,
    TotalAmount DECIMAL(10, 2) NOT NULL,
    OrderStatus INT DEFAULT 0, -- 0:待付款, 1:已付款, 2:待发货, 3:已发货, 4:已完成, 5:已取消
    OrderTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    PaymentTime DATETIME,
    ShippingTime DATETIME,
    CompletionTime DATETIME,
    FOREIGN KEY (ItemID) REFERENCES Items(ItemID),
    FOREIGN KEY (BuyerID) REFERENCES Users(UserID),
    FOREIGN KEY (SellerID) REFERENCES Users(UserID)
);

-- 5. 留言表
CREATE TABLE Comments (
    CommentID INT AUTO_INCREMENT PRIMARY KEY,
    ItemID INT NOT NULL,
    UserID VARCHAR(20) NOT NULL,
    Content TEXT NOT NULL,
    ParentID INT DEFAULT 0, -- 0:主留言, 其他:回复的留言ID
    CommentTime DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ItemID) REFERENCES Items(ItemID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (ParentID) REFERENCES Comments(CommentID)
);


-- 插入测试数据

-- 1. 插入分类数据
INSERT INTO Categories (CategoryName) VALUES
('电子产品'),
('书籍'),
('生活用品'),
('体育用品'),
('其他');

-- 2. 插入用户数据
INSERT INTO Users (UserID, UserName, Password, Phone, Email, StudentID, Avatar, Role) VALUES
('U001', '张三', '123456', '13800138001', 'zhangsan@example.com', '20200101', 'avatar1.jpg', 0),
('U002', '李四', '123456', '13900139002', 'lisi@example.com', '20200102', 'avatar2.jpg', 0),
('U003', '王五', '123456', '13700137003', 'wangwu@example.com', '20200103', 'avatar3.jpg', 1),
('U004', '赵六', '123456', '13600136004', 'zhaoliu@example.com', '20200104', 'avatar4.jpg', 0);

-- 3. 插入物品数据
INSERT INTO Items (ItemName, Description, Price, OriginalPrice, UsageStatus, Image, Status, SellerID, CategoryID) VALUES
('iPhone 13', '9成新，无划痕，配件齐全', 4999.00, 6999.00, '九成新', 'iphone13.jpg', 1, 'U001', 1),
('MacBook Pro', '2021款，16GB内存，512GB固态硬盘', 8999.00, 12999.00, '八成新', 'macbook.jpg', 1, 'U001', 1),
('《算法导论》', '全新，未拆封', 50.00, 100.00, '全新', 'algorithm.jpg', 1, 'U002', 2),
('《深入理解计算机系统》', '九成新，有少量笔记', 40.00, 80.00, '九成新', 'csapp.jpg', 1, 'U002', 2),
('蓝牙音箱', 'JBL品牌，音质好', 150.00, 300.00, '八成新', 'speaker.jpg', 1, 'U004', 3),
('运动水壶', '不锈钢材质，保温效果好', 30.00, 60.00, '全新', 'bottle.jpg', 1, 'U004', 3),
('篮球', '斯伯丁品牌，几乎全新', 80.00, 150.00, '九成新', 'basketball.jpg', 1, 'U001', 4),
('瑜伽垫', '加厚款，防滑', 40.00, 80.00, '全新', 'yoga.jpg', 1, 'U002', 4);

-- 4. 插入订单数据
INSERT INTO Orders (OrderID, ItemID, BuyerID, SellerID, TotalAmount, OrderStatus, OrderTime, PaymentTime) VALUES
('O20230101001', 1, 'U002', 'U001', 4999.00, 1, '2023-01-01 10:00:00', '2023-01-01 10:05:00'),
('O20230101002', 3, 'U001', 'U002', 50.00, 4, '2023-01-01 11:00:00', '2023-01-01 11:02:00'),
('O20230102001', 5, 'U003', 'U004', 150.00, 2, '2023-01-02 09:00:00', '2023-01-02 09:05:00');

-- 5. 插入留言数据
INSERT INTO Comments (ItemID, UserID, Content, ParentID) VALUES
(1, 'U002', '这个手机还能便宜吗？', 0),
(1, 'U001', '可以再便宜200元', 1),
(1, 'U002', '好的，成交', 2),
(3, 'U001', '这本书是第几版的？', 0),
(3, 'U002', '是第三版的', 4);
