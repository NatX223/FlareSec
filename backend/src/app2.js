const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');
const cron = require('node-cron');
const { ethers } = require("ethers");

dotenv.config();


const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Routes
app.use('/api', routes);

const RPC_URL = process.env.FLARE_RPC_URL;
const provider = new ethers.JsonRpcProvider(RPC_URL);
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const TOKENX_ABI = [
    "event ApprovalCreated(uint256 indexed reqid, address indexed owner, address indexed spender, uint256 amount, uint8 status, uint256 initiatedTime, string endpoint, address validator)",
    "event TransferCreated(uint256 indexed reqid, address indexed sender, address indexed receiver, uint256 amount, uint8 status, uint256 initiatedTime, string endpoint, address validator)"
];

// Set up the contract and event listener once
const contract = new ethers.Contract(CONTRACT_ADDRESS, TOKENX_ABI, provider);

const baseURL = "http://localhost:3300";

// Schedule a cron job to run every 30 seconds
cron.schedule('*/30 * * * * *', () => {
    console.log('Running a task every 30 seconds');
    // You can perform additional tasks here if needed
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
