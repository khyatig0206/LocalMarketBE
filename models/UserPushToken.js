module.exports = (sequelize, DataTypes) => {
  const UserPushToken = sequelize.define('UserPushToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
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
    tableName: 'UserPushTokens',
    indexes: [
      { fields: ['userId'] },
      { unique: true, fields: ['token'] },
    ],
  });
  return UserPushToken;
};
