import express from 'express';
import crypto from 'crypto';
import Payment from '../models/payment.model.js';
import fetch from 'node-fetch';
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const notificationsKey = process.env.IPN_SECRET_KEY || "9IcCONun1cpsZmwImOwOCrC7yfLxruww";

function sortObject(obj) {
    return Object.keys(obj).sort().reduce(
        (result, key) => {
            result[key] = (obj[key] && typeof obj[key] === 'object') ? sortObject(obj[key]) : obj[key];
            return result;
        },
        {}
    );
}

function verifySignature(params, signature) {
    const hmac = crypto.createHmac('sha512', notificationsKey);
    hmac.update(JSON.stringify(sortObject(params)));
    const generatedSignature = hmac.digest('hex');
    return generatedSignature === signature;
}

router.post('/webhook', (req, res) => {
    const receivedSignature = req.headers['x-nowpayments-sig'];

    if (!receivedSignature) {
        console.log('No signature provided');
        return res.status(400).send('No signature provided');
    }

    const isValid = verifySignature(req.body, receivedSignature);

    if (isValid) {
        console.log('Received valid webhook:', req.body);
        res.status(200).send('Webhook received');
    } else {
        console.log('Invalid webhook signature');
        res.status(400).send('Invalid signature');
    }
});

export default router;