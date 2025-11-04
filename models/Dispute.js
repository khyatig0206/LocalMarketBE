module.exports = (sequelize, DataTypes) => {
  const Dispute = sequelize.define("Dispute", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    orderItemId: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    producerId: { type: DataTypes.INTEGER, allowNull: true },
    assignedAdminId: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.ENUM('user', 'producer', 'admin'), allowNull: false },
    status: { type: DataTypes.ENUM('open', 'under_review', 'awaiting_user', 'awaiting_producer', 'resolved', 'refunded', 'rejected'), allowNull: false, defaultValue: 'open' },
    reason: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
    resolution: { type: DataTypes.TEXT, allowNull: true },
  }, {
    tableName: 'Disputes',
    timestamps: true,
  });
  return Dispute;
};
