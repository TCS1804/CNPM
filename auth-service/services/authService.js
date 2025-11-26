const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

exports.register = async (payload = {}) => {
  const { username, password, role } = payload;
  if (!username || !password || !role) {
    const err = new Error('Missing fields');
    err.statusCode = 400;
    throw err;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed, role });
  await user.save();
};

exports.login = async (payload = {}) => {
  const { username, email, password } = payload;
  if (!password || (!username && !email)) {
    const err = new Error('Missing username/email or password'); err.statusCode = 400; throw err;
  }
  const query = username ? { username } : { email };
  const user = await User.findOne(query);
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) { const err = new Error('Invalid password'); err.statusCode = 401; throw err; }
  const token = generateToken(user);
  return { token, role: user.role };
};
