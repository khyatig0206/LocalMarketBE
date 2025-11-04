module.exports = (sequelize, DataTypes) => {
  const Producer = sequelize.define("Producer", {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    businessName: { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT },

    // Permanent address (auto-filled from Aadhaar via Gemini)
    addressLine1: { type: DataTypes.STRING, allowNull: true },
    addressLine2: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: true },
    state: { type: DataTypes.STRING, allowNull: true },
    postalCode: { type: DataTypes.STRING, allowNull: true },
    country: { type: DataTypes.STRING, allowNull: true },

    // Business address (entered by producer or copied from permanent)
    businessAddressLine1: { type: DataTypes.STRING, allowNull: true },
    businessAddressLine2: { type: DataTypes.STRING, allowNull: true },
    businessCity: { type: DataTypes.STRING, allowNull: true },
    businessState: { type: DataTypes.STRING, allowNull: true },
    businessPostalCode: { type: DataTypes.STRING, allowNull: true },
    businessCountry: { type: DataTypes.STRING, allowNull: true, defaultValue: "India" },
    businessSameAsPermanent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

    // Full business address (optional display string)
    location: { type: DataTypes.STRING },

    // Business location coordinates (captured from browser during signup/update)
    latitude: { type: DataTypes.FLOAT, allowNull: true },
    longitude: { type: DataTypes.FLOAT, allowNull: true },

    businessLogo: { type: DataTypes.STRING },

    // Aggregate ratings across all products' reviews
    averageRating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    totalReviews: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // Aadhaar fields (do NOT store number)
    aadharImages: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true }, // Cloudinary URLs
    aadharAddressRaw: { type: DataTypes.TEXT, allowNull: true },

    // KYC documents
    idDocuments: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Array of file URLs
      allowNull: true,
    },
    addressProofs: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Array of file URLs
      allowNull: true,
    },
    kycStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    kycRemarks: {
      type: DataTypes.TEXT, // Admin can leave rejection reason or comments
      allowNull: true,
    },
  });

  return Producer;
};
