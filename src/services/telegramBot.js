import { Telegraf, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { mention } from "telegraf/format";
import { createTransaction } from "../controllers/transaction.controller.js";
import createPayment from "../controllers/payment.controller.js";
import dotenv from "dotenv";
import getPaymentStatus from "../hooks/paymentStatus.js";
import sendPayoutToSeller from "../controllers/payout.controller.js";
import axios from 'axios';

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || "7619435655:AAEws5zQdjrzcCZioFynQbYgKpAMHa9Ev4I");
const serverUrl = process.env.SERVER_URL || "https://escrowly.onrender.com";
const ipnAddress = process.env.IPN_ADDRESS || "https://escrowly.onrender.com/api/v1/webhook";

bot.start(async (ctx) => {
    const image = "./public/start.jpg";
    const captionMessage = `💥 *Tired of scams, delays, and broken trust?*\n\n`
        + `🔐 *Escrowly is here to revolutionize how you deal!* \n\n`
        + `📌 *Why Escrowly?*\n`
        + ` • *Say goodbye to risks* – We ensure your funds are safe.\n`
        + ` • *No more uncertainties* – Transactions made simple, fast, and transparent.\n`
        + ` • *For buyers and sellers* – A trusted middleman for all your crypto deals.\n\n`
        + `🌍 Escrowly is built to protect your trades and bring peace of mind, whether you're sealing small deals or managing high-value trades.\n\n`
        + `⚡ Ready to take the stress out of trading? Let’s get started! 🚀`;

    await ctx.replyWithPhoto({ source: image }, {
        caption: captionMessage,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("📜 Learn How It Works", "how_it_works")],
            [Markup.button.url("🌐 Visit Our Website", `${serverUrl}`)],
            [Markup.button.callback("⚡ Start Trading", "help_menu")]
        ])
    });
});


bot.action("start", async (ctx) => {
    const image = "./public/start.jpg";
    const captionMessage = `💥 *Tired of scams, delays, and broken trust?*\n\n`
        + `🔐 *Escrowly is here to revolutionize how you deal!* \n\n`
        + `📌 *Why Escrowly?*\n`
        + ` • *Say goodbye to risks* – We ensure your funds are safe.\n`
        + ` • *No more uncertainties* – Transactions made simple, fast, and transparent.\n`
        + ` • *For buyers and sellers* – A trusted middleman for all your crypto deals.\n\n`
        + `🌍 Escrowly is built to protect your trades and bring peace of mind, whether you're sealing small deals or managing high-value trades.\n\n`
        + `⚡ Ready to take the stress out of trading? Let’s get started! 🚀`;

    await ctx.editMessageMedia(
        {
            type: 'photo',
            media: { source: image },
            caption: captionMessage,
            parse_mode: 'Markdown',
        },
        Markup.inlineKeyboard([
            [Markup.button.callback("🔍 How It Works", "how_it_works")],
            [Markup.button.url("🌐 Visit Website", `${serverUrl}`)],
            [Markup.button.callback("❓ Need Help", "help_menu")]]
        )
    )
});

bot.on("new_chat_members", async (ctx) => {
    const newChatMember = ctx.update.message.new_chat_member;

    if (newChatMember && newChatMember.id === ctx.botInfo.id) {
        const groupIntro = `💬 Hello! I’m *Escrowly Bot*, your trusted partner for secure crypto transactions.\n\nHere’s how I can help:\n 1️⃣ A buyer deposits their crypto into escrow.\n 2️⃣ I securely hold the funds.\n 3️⃣ Once both parties confirm, I release the funds to the seller.\n\nType */escrow* to start a transaction or click below to learn more.`;
        await ctx.reply(groupIntro, Markup.inlineKeyboard([
            [Markup.button.callback("🔍 How It Works", "how_it_works")],
            [Markup.button.url("🌐 Visit Website", `${serverUrl}`)],
            [Markup.button.callback("📚 Help & Commands", "help_menu")],
        ]));
    }
});

const groupData = {};

bot.command('escrow', (ctx) => {
    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const groupId = ctx.chat.id;

        if (groupData[groupId]) {
            return ctx.reply('There is already an escrow initiated in this chat. Use /cancel to cancel the current escrow.');
        }

        groupData[groupId] = {
            buyer: null,
            seller: null,
            disputeOpened: false,
            isRefundRequested: false,
            deal: {
                orderId: null,
                description: null,
                buyerCrypto: null,
                sellerCrypto: null,
                sellerWallet: null,
                buyerProvidedWallet: false,
                amount: null,
                amountWeReceived: null,
                gasFeePayer: null,
            },
        };

        const { deal } = groupData[groupId];

        const amountText = ctx.message.text.split(' ')[1];
        const amount = parseFloat(amountText);

        if (isNaN(amount) || amount <= 0) {
            delete groupData[groupId];
            return ctx.reply('Please provide a valid amount in USD (e.g., /escrow 43).');
        }

        if (amount > 50000) {
            delete groupData[groupId];
            return ctx.reply('The bot currently does not support escrow for amounts larger than $50,000.');
        }

        if (amount < 10) {
            delete groupData[groupId];
            return ctx.reply('The bot currently does not support escrow for amounts smaller than $10.');
        }

        deal.amount = amount;

        ctx.reply(
            `Escrow for ${deal.amount}$ has been initiated\nChoose your role in this escrow:`,
            {
                parse_mode: 'Markdown', ...Markup.inlineKeyboard([
                    Markup.button.callback('I am Buyer', 'role_buyer'),
                    Markup.button.callback('I am Seller', 'role_seller'),
                ])
            }
        );
    } else {
        ctx.reply('Create a new group and add me there as admin to use me as your secure MM / Escrow.');
    }
});

bot.command('cancel', (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) {
        return ctx.reply('There is no active escrow to cancel.');
    }

    const { buyer, seller } = groupData[groupId];

    if (userId === buyer.userId) {
        ctx.reply(
            `${seller.mention}, the buyer wants to cancel the escrow. Do you agree?`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Yes', 'confirm_cancel_seller'),
                    Markup.button.callback('No', 'deny_cancel_seller')
                ])
            }
        );
    } else if (userId === seller.userId) {
        ctx.reply(
            `${buyer.mention}, the seller wants to cancel the escrow. Do you agree?`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Yes', 'confirm_cancel_buyer'),
                    Markup.button.callback('No', 'deny_cancel_buyer')
                ])
            }
        );
    } else {
        ctx.reply('Only the buyer or seller can request to cancel the escrow.');
    }
});

bot.action('confirm_cancel_seller', (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];

    if (userId !== seller.userId) {
        return ctx.answerCbQuery('Only the seller can confirm the cancellation.');
    }

    delete groupData[groupId];
    ctx.reply('The escrow has been canceled by mutual agreement.');
});

bot.action('deny_cancel_seller', (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];

    if (userId !== seller.userId) {
        return ctx.answerCbQuery('Only the seller can deny the cancellation.');
    }

    ctx.reply(`${buyer.mention}, the seller has denied the request to cancel the escrow.`, { parse_mode: 'Markdown' });
});

bot.action('confirm_cancel_buyer', (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];

    if (userId !== buyer.userId) {
        return ctx.answerCbQuery('Only the buyer can confirm the cancellation.');
    }

    delete groupData[groupId];
    ctx.reply('The escrow has been canceled by mutual agreement.');
});

bot.action('deny_cancel_buyer', (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];

    if (userId !== buyer.userId) {
        return ctx.answerCbQuery('Only the buyer can deny the cancellation.');
    }

    ctx.reply(`${seller.mention}, the buyer has denied the request to cancel the escrow.`, { parse_mode: 'Markdown' });
});

bot.action('role_buyer', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return ctx.reply('Please start with /escrow');

    if (groupData[groupId].buyer) {
        return ctx.answerCbQuery('A Buyer is already set!');
    }
    if (groupData[groupId].seller?.userId === ctx.from.id) {
        return ctx.answerCbQuery('You are already the Seller!');
    }

    groupData[groupId].buyer = {
        userId: ctx.from.id,
        mention: `[${mention(ctx.from.first_name, ctx.from.id).text}](tg://user?id=${ctx.from.id})`,
        address: null,
    };

    ctx.answerCbQuery('You are Buyer. Please wait for the Seller to join.');
});

bot.action('role_seller', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return ctx.reply('Please start with /escrow');

    if (!groupData[groupId].buyer) {
        return ctx.answerCbQuery('There should be a Buyer first!');
    }

    if (groupData[groupId].seller) {
        return ctx.answerCbQuery('A Seller is already set!');
    }
    if (groupData[groupId].buyer?.userId === ctx.from.id) {
        return ctx.answerCbQuery('You are already the Buyer!');
    }

    groupData[groupId].seller = {
        userId: ctx.from.id,
        mention: `[${mention(ctx.from.first_name, ctx.from.id).text}](tg://user?id=${ctx.from.id})`,
        address: null,
    };

    ctx.answerCbQuery('You are Seller!');
    ctx.reply(
        `Buyer: ${groupData[groupId].buyer.mention}!\nSeller: ${groupData[groupId].seller.mention}!\nClick on crypto to choose cryptocurrency`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('Choose currency', 'choose_crypto_method')
            ]),

        }
    );
});

bot.action('choose_crypto_method', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return ctx.reply('Please start with /escrow');

    const { buyer, seller } = groupData[groupId];
    if (!buyer || !seller) {
        return ctx.reply('Both Buyer and Seller need to be assigned roles first.');
    }

    if (ctx.from.id !== buyer.userId) {
        return ctx.answerCbQuery('Only the buyer can choose the payment crypto!');
    }

    ctx.reply(
        `${buyer.mention}, in what cryptocurrency will you send funds?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('USDT', 'buyer_crypto_usdt'),
                Markup.button.callback('BTC', 'buyer_crypto_btc'),
                Markup.button.callback('ETH', 'buyer_crypto_eth'),
                Markup.button.callback('SOL', 'buyer_crypto_sol'),
            ])
        }
    );
});


bot.action(/buyer_crypto_(.+)/, (ctx) => {
    const groupId = ctx.chat.id;
    const crypto = ctx.match[1];

    if (!groupData[groupId]) return;

    const buyer = groupData[groupId].buyer;

    if (ctx.from.id !== buyer.userId) {
        return ctx.answerCbQuery('You are not allowed to do this!');
    }
    groupData[groupId].deal.buyerCrypto = crypto;
    ctx.reply(
        `${buyer.mention} will send funds using ${crypto}. ${groupData[groupId].seller.mention}, in what cryptocurrency would you like to receive payment?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('USDT', 'seller_crypto_usdt'),
                Markup.button.callback('BTC', 'seller_crypto_btc'),
                Markup.button.callback('ETH', 'seller_crypto_eth'),
                Markup.button.callback('SOL', 'seller_crypto_sol'),
            ])
        }
    );
});

bot.action(/seller_crypto_(.+)/, (ctx) => {
    const groupId = ctx.chat.id;
    const crypto = ctx.match[1];

    if (!groupData[groupId]) return;

    const seller = groupData[groupId].seller;

    if (ctx.from.id !== seller.userId) {
        return ctx.answerCbQuery('You are not allowed to do this!');
    }

    if (groupData[groupId].deal.sellerCrypto !== null) {
        return ctx.answerCbQuery('You have already chosen the crypto!');
    }

    groupData[groupId].deal.sellerCrypto = crypto;
    ctx.reply(
        `${groupData[groupId].seller.mention}, please provide your wallet address where you will receive the funds after the deal confirms.`,
        { parse_mode: 'Markdown' }
    );
});

// bot.on(message('text'), (ctx) => {
//     const groupId = ctx.chat.id;

//     if (!groupData[groupId]) return;

//     const { buyer, seller } = groupData[groupId];

//     if (seller?.userId === ctx.from.id && !seller.address) {
//         groupData[groupId].seller.address = ctx.message.text;
//         ctx.reply(
//             `${buyer.mention}, please provide a description of the transaction.`,
//             { parse_mode: 'Markdown' }
//         );
//         return;
//     }

//     if (buyer?.userId === ctx.from.id && !seller.address) {
//         return ctx.reply('Please wait for the Seller to provide their wallet address first.');
//     }

//     const deal = groupData[groupId].deal;
//     if (buyer?.userId === ctx.from.id && !deal.description) {
//         deal.description = ctx.message.text;
//         ctx.reply(
//             `Transaction Description: "${deal.description}"\n\n${seller.mention}, is this correct?`,
//             {
//                 parse_mode: 'Markdown',
//                 ...Markup.inlineKeyboard([
//                     Markup.button.callback('Yes', 'confirm_description'),
//                     Markup.button.callback('No', 'reject_description'),
//                 ])
//             },
//         );
//     }
// });

async function validateAddress(address) {
    try {
        const response = await axios.get(`https://blockstream.info/api/address/${address}`);
        if (response.data && response.data.address) {
            return true;
        }
    } catch (error) {
        if (error.response && error.response.data && error.response.data.error === 'base58 error') {
            return false;
        }
    }
    return false;
}

bot.on(message('text'), async (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];

    if (seller?.userId === ctx.from.id && !seller.address && groupData[groupId].deal.sellerCrypto !== null && groupData[groupId].deal.buyerCrypto !== null) {
        const isValid = await validateAddress(ctx.message.text);
        if (!isValid) {
            return ctx.reply('Please provide a valid address.');
        }
        groupData[groupId].seller.address = ctx.message.text;
        ctx.reply(
            `${buyer.mention}, please provide a description of the transaction.`,
            { parse_mode: 'Markdown' }
        );
        return;
    }

    if (buyer?.userId === ctx.from.id && !seller.address && groupData[groupId].deal.sellerCrypto !== null ) {
        return ctx.reply('Please wait for the Seller to provide their wallet address first.');
    }

    const deal = groupData[groupId].deal;
    if (buyer?.userId === ctx.from.id && !deal.description && groupData[groupId].deal.sellerCrypto !== null ) {
        deal.description = ctx.message.text;
        ctx.reply(
            `Transaction Description: "${deal.description}"\n\n${seller.mention}, is this correct?`,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Yes', 'confirm_description'),
                    Markup.button.callback('No', 'reject_description'),
                ])
            },
        );
    }
});

bot.action('confirm_description', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller, deal } = groupData[groupId];
    if (!seller || seller.userId !== ctx.from.id) {
        return ctx.answerCbQuery('Only the Seller can confirm the description!');
    }

    ctx.reply(
        `Description confirmed by Seller. ${buyer.mention}, who will pay the gas fee?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('Buyer', 'gas_fee_buyer'),
                Markup.button.callback('Seller', 'gas_fee_seller'),
            ])
        }
    );
});

bot.action('reject_description', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];
    if (!seller || seller.userId !== ctx.from.id) {
        return ctx.answerCbQuery('Only the Seller can reject the description!');
    }

    ctx.reply(
        `❌ Description rejected by Seller. ${buyer.mention}, please provide a new description.`,
        { parse_mode: 'Markdown' }
    );

    groupData[groupId].deal.description = null;
});

bot.action('gas_fee_buyer', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller, deal } = groupData[groupId];

    if (ctx.from.id !== buyer.userId) {
        return ctx.answerCbQuery('Only the Buyer can choose this option!');
    }

    deal.gasFeePayer = 'buyer';
    ctx.reply(
        `${buyer.mention} chose to pay the gas fee. ${seller.mention}, do you agree?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('Yes', 'confirm_gas_fee'),
                Markup.button.callback('No', 'reject_gas_fee'),
            ])
        }
    );
});

bot.action('gas_fee_seller', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller, deal } = groupData[groupId];

    if (ctx.from.id !== buyer.userId) {
        return ctx.answerCbQuery('Only the Buyer can choose this option!');
    }

    deal.gasFeePayer = 'seller';
    ctx.reply(
        `${buyer.mention} chose the Seller to pay the gas fee. ${seller.mention}, do you agree?`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('Yes', 'confirm_gas_fee'),
                Markup.button.callback('No', 'reject_gas_fee'),
            ])
        }
    );
});

bot.action('confirm_gas_fee', async (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller, deal } = groupData[groupId];
    if (!seller || seller.userId !== ctx.from.id) {
        return ctx.answerCbQuery('Only the Seller can confirm the gas fee payer!');
    }

    ctx.reply(
        `✅ Gas fee payer confirmed by Seller. Finalizing the transaction:\n\n` +
        `👤 **Buyer:** ${buyer.mention}\n` +
        `👤 **Seller:** ${seller.mention}\n` +
        `💳 **Seller Wallet:** \`${seller.address}\`\n` +
        `📃 **Amount:** \`$${deal.amount}\`\n` +
        `📃 **Buyer will pay in** \`${deal.buyerCrypto}\`\n` +
        `📃 **Seller will receive in** \`${deal.sellerCrypto}\`\n` +
        `📃 **Gas fee paid by Buyer:** ${deal.gasFeePayer === 'buyer'}`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('✅ Confirm', 'finalize_transaction'),
                Markup.button.callback('❌ Cancel', 'cancel_transaction')
            ])
        }
    );
});

bot.action('finalize_transaction', async (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller, deal } = groupData[groupId];

    if (!buyer || buyer.userId !== ctx.from.id) {
        return ctx.answerCbQuery('Only the Buyer can confirm the Transaction.');
    }

    try {
        await createTransaction({
            status: 'pending',
            groupId: groupId.toString(),
            buyerId: buyer.userId.toString(),
            buyerName: buyer.mention,
            sellerId: seller.userId.toString(),
            sellerName: seller.mention,
            amount: deal.amount,
            buyerPreferedCurrency: deal.buyerCrypto,
            sellerPreferedCurrency: deal.sellerCrypto,
            sellerWalletAddress: seller.address,
            description: deal.description,
            gassFeePaidByUser: deal.gasFeePayer === 'buyer'
        });

        const createdPayment = await createPayment({
            priceAmount: deal.amount,
            priceCurrency: 'USD',
            payCurrency: deal.buyerCrypto,
            buyerId: buyer.userId.toString(),
            sellerId: seller.userId.toString(),
            groupId: groupId.toString(),
            orderDescription: deal.description,
            ipnCallbackUrl: `${ipnAddress}`,
            gassFeePaidByUser: deal.gasFeePayer === 'buyer'
        });

        if (!deal.orderId) {
            groupData[groupId].deal.orderId = createdPayment.order_id;
        }

        if (!deal.amountWeReceived) {
            groupData[groupId].deal.amountWeReceived = createdPayment.amount_received
        }

        if (createdPayment.lambda) {
            return ctx.reply(`Error creating payment: ${createdPayment.message}`);
        }

        const expirationTime = new Date(createdPayment.expiration_estimate_date).getTime();
        const remainingTime = expirationTime - Date.now();
        const minutes = Math.floor(remainingTime / 60000);
        const seconds = Math.floor((remainingTime % 60000) / 1000);

        const paymentDetails = `
        📄 *Payment Details:*
- **Order ID:** ${createdPayment.order_id}
- **Description:** ${createdPayment.order_description}
- **Amount to Pay:** ${createdPayment.pay_amount} ${createdPayment.pay_currency}
- **Amount to Receive:** ${createdPayment.amount_received} ${createdPayment.price_currency}
- **Payment Address:** ${createdPayment.pay_address}
- **Expires In:** ${minutes} minutes ${seconds} seconds
- **Expires Time:** ${new Date(expirationTime).toLocaleString()}
- **Fixed Rate:** ${createdPayment.is_fixed_rate ? 'Yes' : 'No'}
- **Fee Paid by Buyer:** ${createdPayment.is_fee_paid_by_user ? 'Yes' : 'No'}

💳 *Buyer* will send **${createdPayment.pay_amount} ${createdPayment.pay_currency}**.
💰 *Bot* will receive **${createdPayment.amount_received} ${createdPayment.price_currency}** after the deal is confirmed.`;

        await ctx.replyWithMarkdown(paymentDetails,
            {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🔄 Refresh Expiration Time', `refresh_expiration_${expirationTime}`)],
                    [Markup.button.callback('✅ Check Payment Status', 'check_payment_status')]
                ])
            });

    } catch (error) {
        console.error('Error finalizing transaction:', error);
        ctx.reply('There was an error finalizing the transaction. Please try again.');
    }
});

bot.action(/refresh_expiration_(.+)/, async (ctx) => {
    const expirationTime = parseInt(ctx.match[1]);
    const remainingTime = expirationTime - Date.now();

    if (remainingTime <= 0) {
        return ctx.reply('The payment has expired.');
    }

    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);

    const updatedExpiration = `Expires In: ${minutes} minutes ${seconds} seconds remaining`;

    const messageText = ctx.update.callback_query.message.text;
    const updatedMessageText = messageText.replace(/Expires In:.*\n/, `${updatedExpiration}\n`);

    await ctx.editMessageText(updatedMessageText, Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Refresh Expiration Time', `refresh_expiration_${expirationTime}`)],
        [Markup.button.callback('✅ Check Payment Status', 'check_payment_status')]
    ]));
});

bot.action('check_payment_status', async (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return ctx.reply('No active transaction found.');

    const { buyer, deal } = groupData[groupId];

    try {
        const data = await getPaymentStatus(deal.orderId);

        let statusMessage = `📄 *Payment Status:*\n` +
            `- **Payment Status:** ${data.payment_status}\n` +
            `- **Payment Address:** ${data.pay_address}\n` +
            `- **Price Amount:** ${data.price_amount} ${data.price_currency}\n` +
            `- **Pay Amount:** ${data.pay_amount} ${data.pay_currency}\n` +
            `- **Actually Paid:** ${data.actually_paid} ${data.pay_currency}\n` +
            `- **Outcome Amount:** ${data.outcome_amount} ${data.outcome_currency}\n` +
            `- **Created At:** ${data.created_at}\n` +
            `- **Updated At:** ${data.updated_at}\n`;

        switch (data.payment_status) {
            case 'waiting':
                return ctx.answerCbQuery('⏳ Waiting for the customer to send the payment.');
            case 'confirming':
                return ctx.answerCbQuery('🔄 The transaction is being processed on the blockchain.');
            case 'confirmed':
                statusMessage += `✅ Payment confirmed! We have received ${data.actually_paid} ${data.pay_currency}. You can now proceed with your deal.`;
                break;
            case 'sending':
                return ctx.answerCbQuery('🚀 The funds are being sent to our wallet.');
            case 'partially_paid':
                statusMessage += `⚠️ The buyer sent less than the actual price. Received: ${data.actually_paid} ${data.pay_currency}.`;
                break;
            case 'finished':
                statusMessage += '🎉 We\'ve received the funds and the payment is finished. You can now proceed with your deal.';
                break;
            case 'failed':
                return ctx.reply('❌ The payment wasn\'t completed due to an error.', Markup.inlineKeyboard([
                    Markup.button.callback('Open Dispute', 'open_dispute')
                ]));
            case 'refunded':
                return ctx.answerCbQuery('💸 The funds were refunded back to the user.');
            case 'expired':
                return ctx.answerCbQuery('⌛ The user didn\'t send the funds to the specified address in the 7 days time window.');
            default:
                return ctx.answerCbQuery('❓ Unknown payment status.');
        }

        await ctx.replyWithMarkdown(statusMessage + '\n\nAfter completing your deal, click on the confirm button below.',
            Markup.inlineKeyboard([
                Markup.button.callback('Confirm', 'confirm_escrow')
            ]));
    } catch (error) {
        console.error('Error checking payment status:', error);
        ctx.reply('There was an error checking the payment status. Please try again.');
    }
});

bot.action('confirm_escrow', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return ctx.reply('No active transaction found.');

    const { buyer, seller } = groupData[groupId];

    ctx.reply(
        `👤 ${buyer.mention} and ${seller.mention}, please confirm the deal:`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('Yes', 'confirm_yes'),
                Markup.button.callback('No', 'confirm_no')
            ])
        }
    );
});

const confirmationStatus = {};

// bot.action('confirm_yes', (ctx) => {
//     const groupId = ctx.chat.id;
//     const userId = ctx.from.id;

//     if (!groupData[groupId]) return;

//     const { buyer, seller } = groupData[groupId];

//     if (!confirmationStatus[groupId]) {
//         confirmationStatus[groupId] = { buyerYes: false, sellerYes: false, buyerNo: false, sellerNo: false };
//     }

//     if (userId === buyer.userId) {
//         if (confirmationStatus[groupId].buyerYes) {
//             return ctx.answerCbQuery('You have already confirmed the deal.');
//         }
//         confirmationStatus[groupId].buyerYes = true;
//         ctx.answerCbQuery('Buyer has confirmed the deal. Waiting for the seller to confirm the deal.');
//     } else if (userId === seller.userId) {
//         if (confirmationStatus[groupId].sellerYes) {
//             return ctx.answerCbQuery('You have already confirmed the deal.');
//         }
//         confirmationStatus[groupId].sellerYes = true;
//         ctx.answerCbQuery('Seller has confirmed the deal. Waiting for the buyer to confirm the deal.');
//     }

//     if (confirmationStatus[groupId].buyerYes && confirmationStatus[groupId].sellerYes) {
//         ctx.reply('The deal has been successfully confirmed by both parties.');
//         delete groupData[groupId];
//         delete confirmationStatus[groupId];
//     }
// });

bot.action('confirm_no', (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];

    if (!confirmationStatus[groupId]) {
        confirmationStatus[groupId] = { buyerYes: false, sellerYes: false, buyerNo: false, sellerNo: false };
    }

    if (userId === buyer.userId) {
        if (confirmationStatus[groupId].buyerNo) {
            return ctx.answerCbQuery('You have already confirmed or denied the deal.');
        }
        confirmationStatus[groupId].buyerNo = true;
        ctx.reply('Buyer has denied the deal.');
    } else if (userId === seller.userId) {
        if (confirmationStatus[groupId].sellerNo) {
            return ctx.answerCbQuery('You have already confirmed or denied the deal.');
        }
        confirmationStatus[groupId].sellerNo = true;
        ctx.reply('Seller has denied the deal.');
    }

    if (confirmationStatus[groupId].buyerNo && confirmationStatus[groupId].sellerNo) {
        ctx.reply(
            'Since both the buyer and seller have denied the deal, it seems you both do not agree on the deal. Buyer can request a refund by opening a dispute.',
            Markup.inlineKeyboard([Markup.button.callback('Open Dispute', 'open_dispute')])
        );
        delete groupData[groupId];
        delete confirmationStatus[groupId];
    } else {
        ctx.reply(
            'It seems there is a disagreement between the buyer and the seller. You can open a dispute to resolve this issue or request a refund if applicable.',
            Markup.inlineKeyboard([Markup.button.callback('Open Dispute', 'open_dispute')])
        );
    }
});

bot.action('confirm_yes', async (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return;

    const { buyer, seller, deal } = groupData[groupId];

    if (!confirmationStatus[groupId]) {
        confirmationStatus[groupId] = { buyerYes: false, sellerYes: false, buyerNo: false, sellerNo: false };
    }

    if (userId === buyer.userId) {
        if (confirmationStatus[groupId].buyerYes) {
            return ctx.answerCbQuery('You have already confirmed the deal.');
        }
        confirmationStatus[groupId].buyerYes = true;
        ctx.answerCbQuery('Buyer has confirmed the deal. Waiting for the seller to confirm the deal.');
    } else if (userId === seller.userId) {
        if (confirmationStatus[groupId].sellerYes) {
            return ctx.answerCbQuery('You have already confirmed the deal.');
        }
        confirmationStatus[groupId].sellerYes = true;
        ctx.answerCbQuery('Seller has confirmed the deal. Waiting for the buyer to confirm the deal.');
    }

    if (confirmationStatus[groupId].buyerYes && confirmationStatus[groupId].sellerYes) {
        try {
            const payoutResponse = await sendPayoutToSeller({
                sellerWalletAddress: seller.address,
                currency: deal.sellerCrypto,
                amount: deal.amountWeReceived,
                ipnCallbackUrl: ipnAddress,
                uniqueExternalId: `${groupId}-${seller.userId}`
            });

            if (payoutResponse.success) {
                ctx.reply(
                    'The deal has been successfully confirmed by both parties and payout has been sent to the seller. If the seller does not receive the funds, they can open a dispute.',
                    Markup.inlineKeyboard([
                        Markup.button.callback('Open Dispute', 'open_dispute')
                    ])
                );
            } else {
                ctx.reply('Failed to process payout. Please try again.');
            }
        } catch (error) {
            console.error('Error processing payout:', error);
            ctx.reply('There was an error processing the payout. Please try again.');
        }

        delete groupData[groupId];
        delete confirmationStatus[groupId];
    }
});

bot.action('open_dispute', async (ctx) => {
    const groupId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];

    if (confirmationStatus[groupId]?.disputeOpened) {
        return ctx.answerCbQuery('A dispute is already opened for this group. Please wait for resolution.');
    }

    confirmationStatus[groupId].disputeOpened = true;

    const botMember = await ctx.telegram.getChatMember(groupId, ctx.botInfo.id);
    if (botMember.status !== 'administrator') {
        return ctx.reply(
            'The bot is not an admin in this group. Please make the bot an admin with all rights first to open a dispute.'
        );
    }

    try {
        const inviteLink = await ctx.telegram.exportChatInviteLink(groupId);

        const disputeMessage = `
            🚨 *Dispute Opened* 🚨
            
            📄 *Transaction Details:*
            - **Group ID:** ${groupId}
            - **Buyer:** ${buyer.mention} (ID: ${buyer.userId})
            - **Seller:** ${seller.mention} (ID: ${seller.userId})
            - **Amount:** $${groupData[groupId].deal.amount}
            - **Buyer Crypto:** ${groupData[groupId].deal.buyerCrypto}
            - **Seller Crypto:** ${groupData[groupId].deal.sellerCrypto}
            - **Seller Wallet:** ${groupData[groupId].seller.address}
            - **Description:** ${groupData[groupId].deal.description}
            - **Gas Fee Payer:** ${groupData[groupId].deal.gasFeePayer === 'buyer' ? 'Buyer' : 'Seller'}
            
            📌 *Group Invite Link:* [Invite Link](${inviteLink})
        `;

        await ctx.telegram.sendMessage(7019407723, disputeMessage, { parse_mode: 'Markdown' });

        ctx.reply('A dispute has been opened. The developer or admin will review the matter. Please provide details already in the group for resolution.');

        delete groupData[groupId];
        delete confirmationStatus[groupId];
    } catch (error) {
        console.error('Error exporting invite link:', error);
        ctx.reply('There was an error opening the dispute. Please try again.');
    }
});

// Refund logic for future

// bot.action('request_refund', (ctx) => {
//     const groupId = ctx.chat.id;

//     if (!groupData[groupId]) return;

//     const { buyer } = groupData[groupId];

//     if (groupData[groupId].isRefundRequested) {
//         return ctx.answerCbQuery('A refund was already requested.');
//     }

//     if (ctx.from.id !== buyer.userId) {
//         return ctx.answerCbQuery('Only the Buyer can request a refund.');
//     }

//     ctx.reply(
//         `${buyer.mention}, in what cryptocurrency would you like to receive the refund?`,
//         Markup.inlineKeyboard([
//             Markup.button.callback('USDT', 'refund_crypto_usdt'),
//             Markup.button.callback('BTC', 'refund_crypto_btc'),
//             Markup.button.callback('ETH', 'refund_crypto_eth'),
//             Markup.button.callback('SOL', 'refund_crypto_sol'),
//         ]),
//         { parse_mode: 'Markdown' }
//     );
// });

// bot.action(/refund_crypto_(.+)/, (ctx) => {
//     const groupId = ctx.chat.id;
//     const crypto = ctx.match[1];

//     if (!groupData[groupId]) return;

//     const buyer = groupData[groupId].buyer;

//     if (ctx.from.id !== buyer.userId) {
//         return ctx.answerCbQuery('Only the Buyer can choose the refund cryptocurrency.');
//     }

//     ctx.reply(
//         `${buyer.mention}, please provide your wallet address to process the refund in ${crypto}.`,
//         { parse_mode: 'Markdown' }
//     );
// });
//
// bot.on(message('text'), async (ctx) => {
//     const groupId = ctx.chat.id;

//     if (!groupData[groupId]) return;

//     const { buyer, deal } = groupData[groupId];

//     if (ctx.from.id === buyer.userId && !deal.buyerProvidedWallet) {
//         const buyerWalletAddress = ctx.message.text;
//         const currency = deal.buyerCrypto;
//         const amount = deal.amountWeReceived;

//         try {
//             const refundResponse = await sendRefundToBuyer({
//                 buyerWalletAddress,
//                 currency,
//                 amount,
//                 ipnCallbackUrl: ipnAddress,
//                 uniqueExternalId: `${groupId}-${buyer.userId}`
//             });

//             if (refundResponse.success) {
//                 ctx.reply('Refund has been successfully processed.');
//                 groupData[groupId].isRefundRequested = true;
//             } else {
//                 ctx.reply('Failed to process refund. Please try again.');
//             }
//         } catch (error) {
//             console.error('Error processing refund:', error);
//             ctx.reply('There was an error processing the refund. Please try again.');
//         }
//     }
// });

bot.action('cancel_transaction', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    delete groupData[groupId];

    ctx.reply('Transaction has been canceled.');
});

bot.action('reject_gas_fee', (ctx) => {
    const groupId = ctx.chat.id;

    if (!groupData[groupId]) return;

    const { buyer, seller } = groupData[groupId];
    if (!seller || seller.userId !== ctx.from.id) {
        return ctx.answerCbQuery('Only the Seller can reject the gas fee payer!');
    }

    ctx.reply(
        `❌ Gas fee payer rejected by Seller. ${buyer.mention}, please choose again.`,
        {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                Markup.button.callback('Buyer', 'gas_fee_buyer'),
                Markup.button.callback('Seller', 'gas_fee_seller'),
            ])
        }
    );

    groupData[groupId].deal.gasFeePayer = null;
});

bot.action("how_it_works", async (ctx) => {
    await ctx.answerCbQuery();

    const howItWorks = `🔍 *How Escrowly Works:*\n 1️⃣ You deposit your crypto into escrow.\n2️⃣ I hold it securely until the transaction is verified.\n 3️⃣ Once both parties confirm, the funds are released to the seller.\n\nKey Features:\n💎 Multi-currency support (BTC, USDT, ETH, etc.)\n🔐 Secure & transparent process\n💸 Low fees, faster transactions\n\nStart your transaction with /escrow or use /help for more details!`;
    await ctx.editMessageCaption(howItWorks, Markup.inlineKeyboard([
        [Markup.button.callback("↩️ Back to Menu", "start")],
        [Markup.button.url("🌐 Visit Website", `${serverUrl}`)],
    ]));
});

bot.action("help_menu", async (ctx) => {
    await ctx.answerCbQuery();
    const helpMessage = `❓ *Help & Commands:*\n- /start: View your options\n- /escrow: Start an escrow transaction\n- /help: Display this help menu\n\nNeed assistance? Click below to contact support.`;
    await ctx.editMessageCaption(helpMessage, Markup.inlineKeyboard([
        [Markup.button.url("🌐 Visit Website", `${serverUrl}`)],
        [Markup.button.callback("🔧 Contact Support", "contact_support")],
    ]));
});

bot.action("contact_support", async (ctx) => {
    await ctx.answerCbQuery();
    const supportMessage = `📞 *Contact Support:*\n\nFor assistance, reach out via:\n💬 Telegram: @YourSupportHandle\n📧 Email: support@yourwebsite.com\n\nWe’re here to help with any issues!`;

    await ctx.editMessageCaption(supportMessage, Markup.inlineKeyboard([
        [Markup.button.callback("↩️ Back to Help Menu", "help_menu")],
    ]));
});

bot.action("start_escrow", async (ctx) => {
    await ctx.answerCbQuery();
    const escrowSteps = `🚀 *Setting Up Your Escrow:* \n\nFollow these steps to start your transaction:\n
  1️⃣ Provide the buyer and seller details.\n
  2️⃣ Enter the transaction amount.\n
  3️⃣ Confirm the details before proceeding.\n\n
  Let's get started!`;

    await ctx.editMessageText(escrowSteps, Markup.inlineKeyboard([
        [Markup.button.callback("🔢 Enter Transaction Details", "enter_details")],
        [Markup.button.callback("↩️ Back to Menu", "start")],
    ]));
});

bot.on("text", (ctx) => {
    ctx.reply(
        `🤖 Sorry, I didn’t understand that. Use /help for the list of commands.`
    );
});


export { bot }