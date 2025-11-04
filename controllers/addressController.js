const { Address } = require("../models/index");

/**
 * List all addresses for current user
 */
exports.listAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { userId: req.user.id },
      order: [
        ["isDefault", "DESC"],
        ["updatedAt", "DESC"],
      ],
    });
    res.json(addresses);
  } catch (err) {
    console.error("listAddresses error:", err);
    res.status(500).json({ message: "Failed to fetch addresses" });
  }
};

/**
 * Create a new address for current user
 */
exports.createAddress = async (req, res) => {
  try {
    const {
      label,
      contactName,
      contactPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
      latitude,
      longitude,
    } = req.body;

    if (
      !contactName ||
      !contactPhone ||
      !addressLine1 ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      return res.status(400).json({ message: "Missing required address fields" });
    }

    // Check if this is the user's first address
    const existingCount = await Address.count({
      where: { userId: req.user.id }
    });
    
    // If first address, automatically set as default
    const shouldBeDefault = existingCount === 0 ? true : !!isDefault;

    // If this is to be default, unset any existing default first
    if (shouldBeDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    const address = await Address.create({
      userId: req.user.id,
      label: label || null,
      contactName,
      contactPhone,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      postalCode,
      country,
      isDefault: shouldBeDefault,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
    });

    res.status(201).json(address);
  } catch (err) {
    console.error("createAddress error:", err);
    res.status(500).json({ message: "Failed to create address" });
  }
};

/**
 * Update an existing address (must belong to current user)
 */
exports.updateAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const address = await Address.findOne({
      where: { id, userId: req.user.id },
    });
    if (!address) return res.status(404).json({ message: "Address not found" });

    const {
      label,
      contactName,
      contactPhone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      isDefault,
      latitude,
      longitude,
    } = req.body;

    // If setting default, unset others
    if (typeof isDefault === "boolean" && isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
      address.isDefault = true;
    } else if (typeof isDefault === "boolean") {
      address.isDefault = isDefault;
    }

    if (label !== undefined) address.label = label;
    if (contactName !== undefined) address.contactName = contactName;
    if (contactPhone !== undefined) address.contactPhone = contactPhone;
    if (addressLine1 !== undefined) address.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) address.addressLine2 = addressLine2;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (postalCode !== undefined) address.postalCode = postalCode;
    if (country !== undefined) address.country = country;
    if (latitude !== undefined && latitude !== null) address.latitude = parseFloat(latitude);
    if (longitude !== undefined && longitude !== null) address.longitude = parseFloat(longitude);

    await address.save();
    res.json(address);
  } catch (err) {
    console.error("updateAddress error:", err);
    res.status(500).json({ message: "Failed to update address" });
  }
};

/**
 * Delete an address
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await Address.destroy({
      where: { id, userId: req.user.id },
    });
    if (!count) return res.status(404).json({ message: "Address not found" });
    res.json({ message: "Address deleted" });
  } catch (err) {
    console.error("deleteAddress error:", err);
    res.status(500).json({ message: "Failed to delete address" });
  }
};

/**
 * Set default address
 */
exports.setDefault = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({
      where: { id, userId: req.user.id },
    });
    if (!address) return res.status(404).json({ message: "Address not found" });

    await Address.update(
      { isDefault: false },
      { where: { userId: req.user.id } }
    );
    address.isDefault = true;
    await address.save();

    res.json({ message: "Default address set", id: address.id });
  } catch (err) {
    console.error("setDefault error:", err);
    res.status(500).json({ message: "Failed to set default address" });
  }
/**
 * Get single address by ID (must belong to current user)
 */

};

exports.getAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const address = await Address.findOne({
      where: { id, userId: req.user.id },
    });
    if (!address) return res.status(404).json({ message: "Address not found" });
    res.json(address);
  } catch (err) {
    console.error("getAddress error:", err);
    res.status(500).json({ message: "Failed to fetch address" });
  }
};