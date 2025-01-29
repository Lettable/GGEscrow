import Escrow from "../models/Escrow";
import moment from 'moment';

export async function createEscrowDeal({ buyerId, sellerId, buyerCryptoChoice, groupId, buyerAddressForPayment, sellerUSDTAddress, amountInUSDT }) {
  try {
    const newEscrow = new Escrow({
      buyerId,
      sellerId,
      buyerCryptoChoice,
      groupId,
      buyerAddressForPayment,
      sellerUSDTAddress,
      amountInUSDT,
      expirationTime: moment().add(30, 'minutes').toDate(),
      metaId: generateMetaId(),
    });

    await newEscrow.save();
    console.log('New escrow deal created:', newEscrow);
    return newEscrow;
  } catch (err) {
    console.error('Error creating escrow deal:', err);
  }
}

export async function updateEscrowStatus(metaId, updates) {
  try {
    const escrowDeal = await Escrow.findOne({ metaId });
    if (escrowDeal) {
      Object.assign(escrowDeal, updates);
      await escrowDeal.save();
      console.log('Escrow deal status updated:', escrowDeal);
      return escrowDeal;
    } else {
      console.log('Escrow deal not found');
      return null;
    }
  } catch (err) {
    console.error('Error updating escrow status:', err);
  }
}

export async function getEscrowByMetaId(metaId) {
  try {
    const escrowDeal = await Escrow.findOne({ metaId });
    if (escrowDeal) {
      return escrowDeal;
    } else {
      console.log('Escrow deal not found');
      return null;
    }
  } catch (err) {
    console.error('Error fetching escrow deal:', err);
  }
}

export async function countTotalEscrowDeals() {
  try {
    const totalEscrows = await Escrow.countDocuments();
    return totalEscrows;
  } catch (err) {
    console.error('Error counting total escrow deals:', err);
  }
}

export async function countActiveEscrowDeals() {
  try {
    const activeEscrows = await Escrow.countDocuments({ 
      status: { $ne: 'completed' }, 
      status: { $ne: 'expired' },
      status: { $ne: 'canceled' }
    });
    return activeEscrows;
  } catch (err) {
    console.error('Error counting active escrow deals:', err);
  }
}

export async function isEscrowDealExisted(metaId) {
  try {
    const escrowDeal = await Escrow.findOne({ metaId });
    return escrowDeal !== null;
  } catch (err) {
    console.error('Error checking if escrow deal exists:', err);
    return false;
  }
}

export async function expireEscrowDeals() {
  try {
    const now = new Date();
    const expiredDeals = await Escrow.updateMany({
      expirationTime: { $lte: now },
      status: { $ne: 'completed' },
      status: { $ne: 'canceled' },
    }, { status: 'expired', isExpired: true });

    console.log('Expired deals:', expiredDeals);
  } catch (err) {
    console.error('Error expiring escrow deals:', err);
  }
}

// Helper function to generate unique metaId (you can implement your own)
function generateMetaId() {
  // Assuming a simple hash-based or random ID generation function
  return `escrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
