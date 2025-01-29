const generateOrderId = (buyerId, sellerId, groupId) => {
    const timestamp = Date.now();
    const data = JSON.stringify({ buyerId, sellerId, groupId, timestamp });
    const encodedData = Buffer.from(data).toString('base64');
    return encodedData;
};

const decodeOrderId = (orderId) => {
    const decodedData = Buffer.from(orderId, 'base64').toString('utf-8');
    const { buyerId, sellerId, groupId, timestamp } = JSON.parse(decodedData);
    return { buyerId, sellerId, groupId, timestamp };
};

const orderId = generateOrderId(1111, 2222, 3333);
console.log('Generated order ID', orderId);
console.log('Decoded order ID', decodeOrderId(orderId));
