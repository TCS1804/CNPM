const Stripe = require('stripe');
const ConnectAccount = require('../models/ConnectAccount');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createOrGetAccount = async (type, internalId, email) => {
  let doc = await ConnectAccount.findOne({ type, internalId });
  if (doc) return doc;

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  doc = await ConnectAccount.create({
    type,
    internalId,
    stripeAccountId: account.id,
    payoutsEnabled: account.payouts_enabled,
    chargesEnabled: account.charges_enabled,
  });

  return doc;
};

exports.createOnboardingLink = async (stripeAccountId, returnUrl, refreshUrl) => {
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return link.url;
};

exports.getStripeAccountId = async (type, internalId) => {
  const doc = await ConnectAccount.findOne({ type, internalId });
  return doc?.stripeAccountId || null;
};
