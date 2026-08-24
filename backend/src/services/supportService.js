const supportRepository = require('../repositories/supportRepository');
const { mapSupportTicket } = require('../utils/mappers');
const AppError = require('../utils/AppError');

async function create({ name, email, issue }) {
  if (!name || !email || !issue) {
    throw new AppError('All fields are required', 400);
  }
  const ticket = await supportRepository.create({ name, email, issue });
  return mapSupportTicket(ticket);
}

async function listAll() {
  const rows = await supportRepository.findAll();
  return rows.map(mapSupportTicket);
}

module.exports = { create, listAll };
