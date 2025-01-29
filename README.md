# GGEscrow

GGEscrow is a fully decentralized Telegram escrow bot that ensures secure transactions without storing any data on a centralized database. All transaction fees are transparently stored on the blockchain.

## Features

- Decentralized system with no hidden fees
- Only 0.05% fee for gas, decentralized system, and payment gateway
- Secure and transparent transactions
- No data storage on centralized databases

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Telegram Bot Token
- NOWPayments API Key

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/lettable/GGEscrow.git
    cd GGEscrow
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Create a `.env` file in the root directory and add the following environment variables:

    ```properties
    BOT_TOKEN=your-telegram-bot-token
    NOWPAYMENT_X_API_KEY=your-nowpayments-api-key
    IPN_ADDRESS=your-ipn-address
    IPN_SECRET_KEY=your-ipn-secret-key
    NOWPAYMENT_BASE_API_URL=https://api.nowpayments.io/v1
    SERVER_URL=your-server-url
    PORT=3000
    ```

4. Start the server:

    ```bash
    npm start
    ```

### Usage

1. Add the bot to your Telegram group.
2. Use the `/start` command to initialize the bot.
3. Follow the on-screen instructions to create and manage escrow transactions.

### Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.

### License

This project is licensed under the GNU GENERAL PUBLIC LICENSE.

### Disclaimer

This project is still under development and is not production-ready. Use at your own risk.
