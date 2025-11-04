module.exports = (sequelize, DataTypes) => {
  const Address = sequelize.define("Address", {
    label: { type: DataTypes.STRING, allowNull: true }, // e.g., "Home", "Office"
    contactName: { type: DataTypes.STRING, allowNull: false },
    contactPhone: { type: DataTypes.STRING, allowNull: false },
    addressLine1: { type: DataTypes.STRING, allowNull: false },
    addressLine2: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    postalCode: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false, defaultValue: "India" },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Location coordinates (captured from browser or geocoded from address)
    latitude: { type: DataTypes.FLOAT, allowNull: true },
    longitude: { type: DataTypes.FLOAT, allowNull: true },
  });
  return Address;
};