const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 

const Admin = sequelize.define('Admin', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Distance range in kilometers for nearby producer suggestions (default 10km)
  nearbyProducerRangeKm: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 10.0
  }
}, {
  timestamps: true
});

module.exports = Admin;
