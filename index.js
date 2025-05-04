const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Add this middleware
app.use(express.json());

// Set your verify token (this must match the one you used in Meta)
const VERIFY_TOKEN = 'EAAY3iro0UKw...'; // Truncated for security

// Step 1: Webhook verification (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook Verified');
            res.status(200).send(challenge);
        } else {
            res.status(403).send('❌ Verification failed. Tokens do not match.');
        }
    } else {
        res.status(400).send('❌ Missing mode or token.');
    }
});

// Step 2: Handle webhook events (POST)
app.post('/webhook', (req, res) => {
    console.log('📩 New Webhook Event:', JSON.stringify(req.body, null, 2));
    res.status(200).send('EVENT_RECEIVED');
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});


const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// ✅ Root route to test Render deployment
app.get('/', (req, res) => {
  res.send('Deji WhatsApp Webhook is live!');
});

const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// Webhook verification
app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Handle incoming messages
app.post('/webhook', (req, res) => {
    const body = req.body;
    console.log('Received webhook:', JSON.stringify(body, null, 2));
    res.status(200).send('EVENT_RECEIVED');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Deji webhook is running on port ${PORT}`));
