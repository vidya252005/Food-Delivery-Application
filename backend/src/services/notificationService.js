const notificationRepository = require('../repositories/notificationRepository');

async function create({ userId, orderId, title, body }) {
  return notificationRepository.create({ userId, orderId, title, body });
}

async function listForUser(userId) {
  return notificationRepository.findByUser(userId);
}

module.exports = { create, listForUser };
