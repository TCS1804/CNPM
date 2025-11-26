// payment-service/controllers/splitController.js
const SplitConfig = require('../models/SplitConfig');

// ✅ HÀM THUẦN: dùng nội bộ để lấy config active
async function getActiveConfig(restaurantId) {
  const filter = { active: true };
  if (restaurantId) filter.restaurantId = restaurantId;
  const doc = await SplitConfig.findOne(filter).sort({ createdAt: -1 });
  return doc || null;
}

exports.getActive = async (req, res) => {
  const { restaurantId } = req.query;
  const doc = await getActiveConfig(restaurantId);
  res.json(doc || {});
};

exports.upsert = async (req, res) => {
  const payload = req.body || {};
  const { method = 'percent', percent, fixed, currency = 'VND', restaurantId } = payload;

  if (method === 'percent') {
    const p = percent || {};
    const sum = (p.admin || 0) + (p.restaurant || 0) + (p.delivery || 0);
    if (sum !== 100) {
      return res.status(400).json({ message: 'Tổng phần trăm phải = 100' });
    }
  }

  const filt = restaurantId ? { restaurantId } : {};
  await SplitConfig.updateMany({ ...filt }, { active: false });

  const doc = await SplitConfig.create({
    method,
    percent,
    fixed,
    currency,
    active: true,
    restaurantId
  });

  res.json(doc);
};

// ✅ export hàm thuần để service dùng
exports.getActiveConfig = getActiveConfig;
