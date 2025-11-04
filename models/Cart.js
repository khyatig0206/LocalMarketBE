module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define("Cart", {
    // No extra fields needed, just associations
  });
  return Cart;
};
