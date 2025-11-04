const { Dispute, DisputeMessage, Order, OrderItem, Product, User, Producer, Admin } = require('../models');

exports.userCreateDispute = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { orderId, orderItemId, reason, description } = req.body;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!orderId || !reason) return res.status(400).json({ message: 'orderId and reason are required' });

    // Ownership + eager load items/products to infer producers
    const order = await Order.findByPk(orderId, { include: [{ model: OrderItem, include: [Product] }] });
    if (!order || order.userId !== userId) return res.status(403).json({ message: 'You cannot dispute this order' });

    const images = (req.files || []).map(f => f.path).slice(0, 5);

    // If a specific order item is provided -> single dispute targeting that product's producer
    if (orderItemId) {
      const item = order.OrderItems?.find(it => String(it.id) === String(orderItemId));
      const producerId = item?.Product?.producerId || null;
      const dispute = await Dispute.create({
        orderId,
        orderItemId,
        userId,
        producerId,
        createdBy: 'user',
        status: 'open',
        reason,
        description: description || null,
        images,
      });
      return res.status(201).json({ message: 'Dispute created', dispute });
    }

    // Order-level dispute: create one dispute per unique producer in this order so each producer can see it
    const producerIds = Array.from(new Set((order.OrderItems || []).map(it => it?.Product?.producerId).filter(Boolean)));
    if (producerIds.length === 0) {
      // fallback: create a single dispute without producerId (admin-only)
      const dispute = await Dispute.create({ orderId, orderItemId: null, userId, producerId: null, createdBy: 'user', status: 'open', reason, description: description || null, images });
      return res.status(201).json({ message: 'Dispute created (admin will triage)', dispute });
    }
    const created = [];
    for (const pid of producerIds) {
      const d = await Dispute.create({ orderId, orderItemId: null, userId, producerId: pid, createdBy: 'user', status: 'open', reason, description: description || null, images });
      created.push(d);
    }
    return res.status(201).json({ message: `Disputes created for ${created.length} producer(s)`, disputes: created });
  } catch (err) {
    console.error('userCreateDispute error:', err);
    res.status(500).json({ message: 'Failed to create dispute' });
  }
};

exports.userListDisputes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const rows = await Dispute.findAll({ where: { userId }, order: [['createdAt','DESC']] });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.getDisputeByIdForUser = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const dispute = await Dispute.findByPk(id);
    if (!dispute || dispute.userId !== userId) return res.status(404).json({ message: 'Dispute not found' });
    const messages = await DisputeMessage.findAll({ where: { disputeId: dispute.id }, order: [['createdAt','ASC']] });
    res.json({ dispute, messages });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dispute' });
  }
};

exports.userPostMessage = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { message } = req.body;
    const dispute = await Dispute.findByPk(id);
    if (!dispute || dispute.userId !== userId) return res.status(404).json({ message: 'Dispute not found' });
    const images = (req.files || []).map(f => f.path).slice(0, 5);
    const msg = await DisputeMessage.create({ disputeId: dispute.id, senderRole: 'user', senderId: userId, message: message || null, images });
    // Bump status to awaiting_admin review if open
    if (dispute.status === 'open') await dispute.update({ status: 'under_review' });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: 'Failed to post message' });
  }
};

exports.producerListDisputes = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    if (!producerId) return res.status(401).json({ message: 'Unauthorized' });
    const { status, q } = req.query;
    const where = { producerId };
    if (status) where.status = status;
    if (q) {
      const { Op } = require('sequelize');
      if (/^\d+$/.test(q)) where.orderId = parseInt(q, 10);
      else where.reason = { [Op.iLike]: `%${q}%` };
    }
    const rows = await Dispute.findAll({ where, order: [['createdAt','DESC']] });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.getDisputeByIdForProducer = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    const { id } = req.params;
    const dispute = await Dispute.findByPk(id);
    if (!dispute || dispute.producerId !== producerId) return res.status(404).json({ message: 'Dispute not found' });
    const messages = await DisputeMessage.findAll({ where: { disputeId: dispute.id }, order: [['createdAt','ASC']] });
    res.json({ dispute, messages });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dispute' });
  }
};

exports.producerPostMessage = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    const { id } = req.params;
    const { message } = req.body;
    const dispute = await Dispute.findByPk(id);
    if (!dispute || dispute.producerId !== producerId) return res.status(404).json({ message: 'Dispute not found' });
    const images = (req.files || []).map(f => f.path).slice(0, 5);
    const msg = await DisputeMessage.create({ disputeId: dispute.id, senderRole: 'producer', senderId: producerId, message: message || null, images });
    await dispute.update({ status: 'under_review' });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: 'Failed to post message' });
  }
};

exports.adminListDisputes = async (req, res) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) where.reason = { [require('sequelize').Op.iLike]: `%${q}%` };
    const rows = await Dispute.findAll({ where, order: [['createdAt','DESC']] });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch disputes' });
  }
};

exports.adminGetDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const dispute = await Dispute.findByPk(id, { include: [Order, OrderItem, User, Producer] });
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    const messages = await DisputeMessage.findAll({ where: { disputeId: dispute.id }, order: [['createdAt','ASC']] });
    res.json({ dispute, messages });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch dispute' });
  }
};

exports.adminUpdateDisputeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    const allowed = ['open','under_review','awaiting_user','awaiting_producer','resolved','refunded','rejected'];
    if (!allowed.includes(String(status))) return res.status(400).json({ message: 'Invalid status' });
    const dispute = await Dispute.findByPk(id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    await dispute.update({ status, resolution: resolution || dispute.resolution });
    res.json({ message: 'Dispute updated', dispute });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update dispute' });
  }
};

exports.adminAssignDispute = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const { id } = req.params;
    const { assignedAdminId } = req.body;
    const dispute = await Dispute.findByPk(id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    // basic: allow any admin to assign to any admin id
    await dispute.update({ assignedAdminId: assignedAdminId || adminId, status: 'under_review' });
    res.json({ message: 'Assigned', dispute });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign dispute' });
  }
};

exports.adminPostMessage = async (req, res) => {
  try {
    const adminId = req.admin?.id;
    const { id } = req.params;
    const { message } = req.body;
    const dispute = await Dispute.findByPk(id);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    const images = (req.files || []).map(f => f.path).slice(0, 5);
    const msg = await DisputeMessage.create({ disputeId: dispute.id, senderRole: 'admin', senderId: adminId, message: message || null, images });
    await dispute.update({ status: 'under_review' });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: 'Failed to post message' });
  }
};
