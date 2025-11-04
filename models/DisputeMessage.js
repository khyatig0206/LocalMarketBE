module.exports = (sequelize, DataTypes) => {
  const DisputeMessage = sequelize.define("DisputeMessage", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    disputeId: { type: DataTypes.INTEGER, allowNull: false },
    senderRole: { type: DataTypes.ENUM('user', 'producer', 'admin'), allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: true },
    images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  }, {
    tableName: 'DisputeMessages',
    timestamps: true,
  });
  return DisputeMessage;
};
