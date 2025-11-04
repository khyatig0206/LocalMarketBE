const sequelize = require("../config/db");
const { DataTypes } = require("sequelize");

// Import models
const Category = require("./Category")(sequelize, DataTypes);
const Product = require("./Product")(sequelize, DataTypes);
const Producer = require("./Producer")(sequelize, DataTypes);
const User = require("./User")(sequelize, DataTypes);
// Admin model exports an already-defined instance; do not invoke as a factory
const Admin = require("./Admin");
const Cart = require("./Cart")(sequelize, DataTypes);
const Order = require("./Order")(sequelize, DataTypes);
const Address = require("./Address")(sequelize, DataTypes);
const ProducerWallet = require("./ProducerWallet")(sequelize, DataTypes);
const AdminWallet = require("./AdminWallet")(sequelize, DataTypes);

// Associations
// Product belongs to one Producer
Product.belongsTo(Producer, {
  foreignKey: {
    name: "producerId",
    allowNull: false,
  },
  onDelete: "CASCADE",
});
Producer.hasMany(Product, {
  foreignKey: "producerId",
});

// Product belongs to one Category
Product.belongsTo(Category, {
  foreignKey: {
    name: "categoryId",
    allowNull: false,
  },
  onDelete: "CASCADE",
});
Category.hasMany(Product, {
  foreignKey: "categoryId",
});


// Producer belongs to many Categories
Producer.belongsToMany(Category, {
  through: "ProducerCategories",
  onDelete: "CASCADE",
});
Category.belongsToMany(Producer, {
  through: "ProducerCategories",
  onDelete: "CASCADE",
});

// User has one Cart
User.hasOne(Cart, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });
Cart.belongsTo(User, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });

// User has many Orders
User.hasMany(Order, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });
Order.belongsTo(User, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });

// User has many Addresses
User.hasMany(Address, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });
Address.belongsTo(User, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });

// Order belongs to one Address
Order.belongsTo(Address, { foreignKey: { name: "addressId", allowNull: true }, onDelete: "SET NULL" });
Address.hasMany(Order, { foreignKey: { name: "addressId", allowNull: true }, onDelete: "SET NULL" });

// CartItems and OrderItems associations
const CartItem = require("./CartItem")(sequelize, DataTypes);
const OrderItem = require("./OrderItem")(sequelize, DataTypes);
const ProducerWalletTransaction = require("./ProducerWalletTransaction")(sequelize, DataTypes);
const Review = require("./Review")(sequelize, DataTypes);
const ProducerPushToken = require("./ProducerPushToken")(sequelize, DataTypes);
const UserPushToken = require("./UserPushToken")(sequelize, DataTypes);
const Dispute = require("./Dispute")(sequelize, DataTypes);
const DisputeMessage = require("./DisputeMessage")(sequelize, DataTypes);

// Cart <-> Product (many-to-many through CartItem)
Cart.belongsToMany(Product, { through: CartItem, foreignKey: "cartId" });
Product.belongsToMany(Cart, { through: CartItem, foreignKey: "productId" });
Cart.hasMany(CartItem, { foreignKey: "cartId" });
CartItem.belongsTo(Cart, { foreignKey: "cartId" });
Product.hasMany(CartItem, { foreignKey: "productId" });
CartItem.belongsTo(Product, { foreignKey: "productId" });

// Order <-> Product (many-to-many through OrderItem)
Order.belongsToMany(Product, { through: OrderItem, foreignKey: "orderId" });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: "productId" });
Order.hasMany(OrderItem, { foreignKey: "orderId" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });
Product.hasMany(OrderItem, { foreignKey: "productId" });
OrderItem.belongsTo(Product, { foreignKey: "productId" });

// Wallet associations
Producer.hasOne(ProducerWallet, { foreignKey: { name: "producerId", allowNull: false }, onDelete: "CASCADE" });
ProducerWallet.belongsTo(Producer, { foreignKey: { name: "producerId", allowNull: false }, onDelete: "CASCADE" });

// Wallet transactions (audit trail)
Producer.hasMany(ProducerWalletTransaction, { foreignKey: { name: "producerId", allowNull: false }, onDelete: "CASCADE" });
ProducerWalletTransaction.belongsTo(Producer, { foreignKey: { name: "producerId", allowNull: false }, onDelete: "CASCADE" });

// Review associations
User.hasMany(Review, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });
Review.belongsTo(User, { foreignKey: { name: "userId", allowNull: false }, onDelete: "CASCADE" });

Product.hasMany(Review, { foreignKey: { name: "productId", allowNull: false }, onDelete: "CASCADE" });
Review.belongsTo(Product, { foreignKey: { name: "productId", allowNull: false }, onDelete: "CASCADE" });

// Push tokens
Producer.hasMany(ProducerPushToken, { foreignKey: { name: 'producerId', allowNull: false }, onDelete: 'CASCADE' });
ProducerPushToken.belongsTo(Producer, { foreignKey: { name: 'producerId', allowNull: false }, onDelete: 'CASCADE' });
User.hasMany(UserPushToken, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
UserPushToken.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });

// Disputes
Order.hasMany(Dispute, { foreignKey: { name: 'orderId', allowNull: false }, onDelete: 'CASCADE' });
Dispute.belongsTo(Order, { foreignKey: { name: 'orderId', allowNull: false }, onDelete: 'CASCADE' });
OrderItem.hasMany(Dispute, { foreignKey: { name: 'orderItemId', allowNull: true }, onDelete: 'SET NULL' });
Dispute.belongsTo(OrderItem, { foreignKey: { name: 'orderItemId', allowNull: true }, onDelete: 'SET NULL' });
User.hasMany(Dispute, { foreignKey: { name: 'userId', allowNull: true }, onDelete: 'SET NULL' });
Dispute.belongsTo(User, { foreignKey: { name: 'userId', allowNull: true }, onDelete: 'SET NULL' });
Producer.hasMany(Dispute, { foreignKey: { name: 'producerId', allowNull: true }, onDelete: 'SET NULL' });
Dispute.belongsTo(Producer, { foreignKey: { name: 'producerId', allowNull: true }, onDelete: 'SET NULL' });
Admin.hasMany(Dispute, { foreignKey: { name: 'assignedAdminId', allowNull: true }, onDelete: 'SET NULL' });
Dispute.belongsTo(Admin, { as: 'assignedAdmin', foreignKey: { name: 'assignedAdminId', allowNull: true }, onDelete: 'SET NULL' });

Dispute.hasMany(DisputeMessage, { foreignKey: { name: 'disputeId', allowNull: false }, onDelete: 'CASCADE' });
DisputeMessage.belongsTo(Dispute, { foreignKey: { name: 'disputeId', allowNull: false }, onDelete: 'CASCADE' });

// Export models and sequelize
module.exports = {
  sequelize,
  Category,
  Product,
  Producer,
  User,
  Admin,
  Cart,
  Order,
  Address,
  ProducerWallet,
  AdminWallet,
  ProducerWalletTransaction,
  CartItem,
  OrderItem,
  Review,
  ProducerPushToken,
  UserPushToken,
  Dispute,
  DisputeMessage,
};
