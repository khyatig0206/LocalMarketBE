const { ProducerPushToken } = require('../models');

exports.registerProducerToken = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    if (!producerId) return res.status(401).json({ message: 'Unauthorized' });
    const { token, platform } = req.body || {};
    if (!token) return res.status(400).json({ message: 'token required' });

    // Upsert by token to avoid duplicates
    let row = await ProducerPushToken.findOne({ where: { token } });
    if (row) {
      row.producerId = producerId;
      row.platform = platform || row.platform;
      await row.save();
    } else {
      row = await ProducerPushToken.create({ producerId, token, platform: platform || null });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to register token' });
  }
};

exports.unregisterProducerToken = async (req, res) => {
  try {
    const producerId = req.producer?.id;
    if (!producerId) return res.status(401).json({ message: 'Unauthorized' });
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: 'token required' });
    await ProducerPushToken.destroy({ where: { token, producerId } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to unregister token' });
  }
};
