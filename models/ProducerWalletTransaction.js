module.exports = (sequelize, DataTypes) => {
  const ProducerWalletTransaction = sequelize.define("ProducerWalletTransaction", {
    type: {
      type: DataTypes.ENUM("credit", "debit"),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "INR",
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Optional linkage to an order (credits will typically reference an order)
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });

  return ProducerWalletTransaction;
};