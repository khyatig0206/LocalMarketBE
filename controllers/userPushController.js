const { UserPushToken } = require('../models');

exports.registerUserToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { token, platform } = req.body || {};
    if (!token) return res.status(400).json({ message: 'token required' });

    let row = await UserPushToken.findOne({ where: { token } });
    if (row) {
      row.userId = userId;
      row.platform = platform || row.platform;
      await row.save();
    } else {
      row = await UserPushToken.create({ userId, token, platform: platform || null });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to register token' });
  }
};

exports.unregisterUserToken = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ message: 'token required' });
    await UserPushToken.destroy({ where: { token, userId } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to unregister token' });
  }
};
