const { getMessagingClient } = require('./firebaseAdmin');

async function sendFcmV1Multicast({ tokens = [], title, body, data = {} }) {
  const messaging = getMessagingClient();
  if (!messaging) {
    console.warn('[push] Messaging not initialized; skipping send');
    return { skipped: true };
  }
  const payload = {
    tokens,
    notification: { title, body },
    data,
    webpush: {
      notification: {
        title,
        body,
        icon: '/icons/shop_verified.png',
      },
      fcmOptions: {
        link: process.env.WEB_BASE_URL || 'http://localhost:3015/producer',
      },
    },
  };
  const response = await messaging.sendEachForMulticast(payload);
  return response;
}

async function notifyProducerKyc({ tokens = [], status, remarks }) {
  const title = status === 'approved' ? 'KYC Approved' : 'KYC Rejected';
  const body = status === 'approved' ? 'Your producer KYC has been approved.' : `Your KYC was rejected${remarks ? `: ${remarks}` : ''}`;
  try {
    const res = await sendFcmV1Multicast({ tokens, title, body, data: { type: 'kyc', status, ...(remarks ? { remarks } : {}) } });
    return res;
  } catch (e) {
    console.error('[push] notifyProducerKyc error:', e.message);
    throw e;
  }
}

async function notifyUserOrder({ tokens = [], orderId, status }) {
  const title = `Order #${orderId} ${status}`;
  const body = status === 'delivered' ? 'Your order has been delivered.' : `Your order status is now ${status}.`;
  return await sendFcmV1Multicast({
    tokens,
    title,
    body,
    data: { type: 'order', orderId: String(orderId), status },
  });
}

async function notifyProducerOrderPlaced({ tokens = [], orderId, itemsCount }) {
  const title = `New order #${orderId}`;
  const body = `You have ${itemsCount} item${itemsCount === 1 ? '' : 's'} to fulfill.`;
  return await sendFcmV1Multicast({
    tokens,
    title,
    body,
    data: { type: 'order_placed', orderId: String(orderId), itemsCount: String(itemsCount) },
  });
}

module.exports = { sendFcmV1Multicast, notifyProducerKyc, notifyUserOrder, notifyProducerOrderPlaced };
