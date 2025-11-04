module.exports = (sequelize, DataTypes) => {
  const ProducerPushToken = sequelize.define('ProducerPushToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    producerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      unique: true,
    },
    platform: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
  }, {
    tableName: 'ProducerPushTokens',
    indexes: [
      { fields: ['producerId'] },
      { unique: true, fields: ['token'] },
    ],
  });
  return ProducerPushToken;
};
