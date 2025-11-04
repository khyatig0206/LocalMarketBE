module.exports = (sequelize, DataTypes) => {
  const AdminWallet = sequelize.define("AdminWallet", {
    balance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0.0 },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "INR" }
  });
  return AdminWallet;
};