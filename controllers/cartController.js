const { Cart, CartItem, Product } = require("../models/index");

// Get current user's cart with items
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      where: { userId: req.user.id },
      include: [{ model: CartItem, include: [Product] }],
    });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch cart" });
  }
};

// Add or update product in cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity, replace } = req.body;
    const qty = Number.isFinite(quantity) ? Number(quantity) : 1;

    const cart = await Cart.findOne({ where: { userId: req.user.id } });
    if (!cart) {
      return res.status(400).json({ message: "Cart not found" });
    }

    let item = await CartItem.findOne({ where: { cartId: cart.id, productId } });

    if (item) {
      if (replace) {
        item.quantity = Math.max(1, qty);
      } else {
        item.quantity = Math.max(1, item.quantity + qty);
      }
      await item.save();
    } else {
      item = await CartItem.create({ cartId: cart.id, productId, quantity: Math.max(1, qty) });
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

// Remove product from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const cart = await Cart.findOne({ where: { userId: req.user.id } });
    await CartItem.destroy({ where: { cartId: cart.id, productId } });
    res.json({ message: "Removed from cart" });
  } catch (err) {
    res.status(500).json({ message: "Failed to remove from cart" });
  }
};
