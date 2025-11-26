const connectService = require('../services/connectService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

exports.restaurantOnboardingLink = async (req, res) => {
  try {
    const { restaurantId, email } = req.body;
    if (!restaurantId || !email) {
      return res.status(400).json({ message: 'restaurantId & email are required' });
    }

    const acc = await connectService.createOrGetAccount('restaurant', restaurantId, email);
    const url = await connectService.createOnboardingLink(
      acc.stripeAccountId,
      `${FRONTEND_URL}/stripe/onboarding/success`,
      `${FRONTEND_URL}/stripe/onboarding/refresh`
    );

    res.json({ url });
  } catch (e) {
    console.error('restaurantOnboardingLink error:', e);
    res.status(400).json({ message: e.message });
  }
};

exports.deliveryOnboardingLink = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id; // shipper id từ auth-service

    const acc = await connectService.createOrGetAccount('delivery', userId, email);
    const url = await connectService.createOnboardingLink(
      acc.stripeAccountId,
      `${FRONTEND_URL}/stripe/onboarding/success`,
      `${FRONTEND_URL}/stripe/onboarding/refresh`
    );

    res.json({ url });
  } catch (e) {
    console.error('deliveryOnboardingLink error:', e);
    res.status(400).json({ message: e.message });
  }
};
