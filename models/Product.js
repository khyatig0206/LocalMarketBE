module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define("Product", {
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    // Base price for a single sellable unit (see unitLabel + unitSize)
    price: { type: DataTypes.FLOAT, allowNull: false },
    // Inventory counts the number of sellable units available (each unit is unitSize of unitLabel)
    inventory: { type: DataTypes.INTEGER, defaultValue: 0 },
    images: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true }, // up to 5 image URLs

    // Selling unit info (professional apps: allow arbitrary labels with a default set on UI)
    // Examples:
    // - unitLabel: 'kg', unitSize: 0.5  => price is per 0.5 kg
    // - unitLabel: 'piece', unitSize: 1 => price is per 1 piece
    unitLabel: { type: DataTypes.STRING, allowNull: false, defaultValue: 'piece' },
    unitSize: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.0 },

    // Discount model
    // - discountType: 'none' | 'percentage' | 'flat'
    // - discountValue: for percentage (0-100), for flat = currency amount
    discountType: { type: DataTypes.STRING, allowNull: false, defaultValue: 'none' },
    discountValue: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    // Optional conditions to qualify for discount
    // If both provided, BOTH must be met
    discountMinQuantity: { type: DataTypes.INTEGER, allowNull: true }, // minimum units to get discount
    discountMinSubtotal: { type: DataTypes.FLOAT, allowNull: true },   // minimum line subtotal (before discount)

    averageRating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    totalReviews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  });

  return Product;
};
