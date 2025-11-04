module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define("Order", {
    total: { type: DataTypes.FLOAT, allowNull: false },

    // Payment method (e.g., COD, PREPAID)
    paymentMethod: { type: DataTypes.STRING, allowNull: false, defaultValue: "COD" },

    // Payment lifecycle status (separate from fulfillment which is per OrderItem)
    paymentStatus: {
      type: DataTypes.ENUM("pending", "paid", "refunded", "failed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },

    // Razorpay fields (nullable until payment success)
    razorpayOrderId: { type: DataTypes.STRING, allowNull: true },
    razorpayPaymentId: { type: DataTypes.STRING, allowNull: true },
    razorpaySignature: { type: DataTypes.STRING, allowNull: true },

    // Address association (replaces direct address fields)
    addressId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Addresses', key: 'id' } }
  });
  return Order;
};
