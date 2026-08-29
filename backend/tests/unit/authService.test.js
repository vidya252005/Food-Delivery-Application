jest.mock('../../src/repositories/userRepository');
jest.mock('../../src/repositories/restaurantRepository');
jest.mock('bcryptjs');

const bcrypt = require('bcryptjs');
const userRepository = require('../../src/repositories/userRepository');
const authService = require('../../src/services/authService');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('registerUser', () => {
  test('rejects registration when the email is already taken', async () => {
    userRepository.findByEmail.mockResolvedValueOnce({ id: 'existing-user' });

    await expect(
      authService.registerUser({ name: 'Asha', email: 'asha@example.com', password: 'secret123' })
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  test('hashes the password before storing and never returns it', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);
    bcrypt.hash.mockResolvedValueOnce('hashed-value');
    userRepository.create.mockResolvedValueOnce({
      id: 'u1', name: 'Asha', email: 'asha@example.com', role: 'user',
    });

    const result = await authService.registerUser({
      name: 'Asha',
      email: 'asha@example.com',
      password: 'secret123',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 12);
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed-value' })
    );
    expect(result.user).toEqual({
      id: 'u1', name: 'Asha', email: 'asha@example.com', role: 'user',
    });
  });
});

describe('loginUser', () => {
  test('rejects when no account exists for the email, without leaking which part was wrong', async () => {
    userRepository.findByEmail.mockResolvedValueOnce(null);

    await expect(
      authService.loginUser({ email: 'nobody@example.com', password: 'whatever' })
    ).rejects.toMatchObject({ statusCode: 401, message: 'Incorrect email or password' });
  });

  test('rejects an incorrect password', async () => {
    userRepository.findByEmail.mockResolvedValueOnce({ id: 'u1', password_hash: 'hashed-value' });
    bcrypt.compare.mockResolvedValueOnce(false);

    await expect(
      authService.loginUser({ email: 'asha@example.com', password: 'wrong' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('issues a token on correct credentials', async () => {
    userRepository.findByEmail.mockResolvedValueOnce({
      id: 'u1',
      name: 'Asha',
      email: 'asha@example.com',
      password_hash: 'hashed-value',
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.loginUser({ email: 'asha@example.com', password: 'secret123' });
    expect(typeof result.token).toBe('string');
    expect(result.user.email).toBe('asha@example.com');
    expect(result.user.role).toBe('user');
  });

  test('maps legacy customer role to user in API response and JWT', async () => {
    userRepository.findByEmail.mockResolvedValueOnce({
      id: 'u1',
      name: 'Asha',
      email: 'asha@example.com',
      password_hash: 'hashed-value',
      role: 'customer',
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const result = await authService.loginUser({ email: 'asha@example.com', password: 'secret123' });
    expect(result.user.role).toBe('user');

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(result.token, require('../../src/config/env').JWT_SECRET);
    expect(decoded.role).toBe('user');
  });
});
