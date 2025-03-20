const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');
const cron = require('node-cron');
const { ethers } = require("ethers");
const admin = require('firebase-admin');
const serviceAccount = require('./flaresec-1dfea-firebase-adminsdk-fbsvc-5c7870bb22.json');
const MailerSend = require('mailersend');
const { EmailParams, Sender, Recipient } = MailerSend;

dotenv.config();

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3300;

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
    "event ApprovalCreated(uint256 indexed reqid, address indexed owner, address indexed spender, uint256 amount, Status status, uint256 initiatedTime, string endpoint, address validator)",
    "event TransferCreated(uint256 indexed reqid, address indexed sender, address indexed receiver, uint256 amount, Status status, uint256 initiatedTime, string endpoint, address validator)"
];

// Set up the contract and event listener once
const contract = new ethers.Contract(CONTRACT_ADDRESS, TOKENX_ABI, provider);

const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY, // Ensure this is set in your .env file
});

contract.on("TransferCreated", async (reqid, sender, receiver, _amount, status, initiatedTime, endpoint, validator, event) => {
    const amount = ethers.utils.formatEther(_amount);
    console.log(`Event Params: 
        reqid: ${reqid}, 
        sender: ${sender}, 
        receiver: ${receiver}, 
        amount: ${amount}, 
        status: ${status}, 
        initiatedTime: ${initiatedTime}, 
        endpoint: ${endpoint}, 
        validator: ${validator}`);

    // Store the event data in Firestore
    try {
        const eventRef = db.collection('events');
        await eventRef.doc(reqid).set({
            reqid,
            sender,
            receiver,
            amount,
            status,
            initiatedTime,
            endpoint,
            validator,
            createdAt: new Date() // Optional: timestamp of when the event was stored
        });
        console.log(`Event stored with ID: ${reqid}`);
    } catch (error) {
        console.error("Error storing event: ", error);
    }

    // Check for the user associated with the sender's address
    try {
        const userSnapshot = await db.collection('users').where('address', '==', sender).get();
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            const userEmail = userData.email;

            // Prepare email parameters
            const sentFrom = new Sender("no-reply@trial-z86org8pvwzlew13.mlsender.net", "FlareSec"); // Replace with your sender email and name
            const recipients = [new Recipient(userEmail, "User")]; // Use the user's email
            const emailParams = new EmailParams()
                .setFrom(sentFrom)
                .setTo(recipients)
                .setReplyTo(sentFrom)
                .setSubject("Transfer Created Notification")
                .setHtml(`
                    <p><strong>A transfer request has been initiated.</strong></p>
                    <p>Receiver: ${receiver}</p>
                    <p>Amount: ${amount}</p>
                    <p>Please choose an option:</p>
                    <a href="${approvalUrl}" style="display: inline-block; padding: 10px 20px; background: green; color: white; text-decoration: none; border-radius: 5px;">Approve ✅</a>
                    <a href="${declineUrl}" style="display: inline-block; padding: 10px 20px; background: red; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline ❌</a>
                `)
                .setText(`A transfer request has been initiated.
                    Receiver: ${receiver}
                    Amount: ${amount}

                    Approve: ${approvalUrl}
                    Decline: ${declineUrl}
                `);
            const emailResponse = await mailerSend.email.send(emailParams);
            console.log(`Email sent to ${userEmail}: `, emailResponse);
        } else {
            console.log(`No user found for sender address: ${sender}`);
        }
    } catch (error) {
        console.error("Error sending email: ", error);
    }
});

// Schedule a cron job to run every 30 seconds
cron.schedule('*/30 * * * * *', () => {
    console.log('Running a task every 30 seconds');
    // You can perform additional tasks here if needed
});

// Function to create a user in Firestore
async function createUser(email, phone, address) {
    try {
        const userRef = db.collection('users'); // Reference to the users collection
        const newUser = {
            email: email,
            phone: phone,
            address: address, // Include the address in the document
            createdAt: new Date() // Optional: timestamp of when the user was created
        };

        // Add the new user document to Firestore using the address as the document ID
        await userRef.doc(address).set(newUser); // Use set() to create or overwrite the document
        console.log(`User created with ID: ${address}`);
        return { id: address, ...newUser }; // Return the created user data
    } catch (error) {
        console.error("Error creating user: ", error);
        throw new Error("Failed to create user");
    }
}

// Example usage of createUser function
app.post('/createUser', async (req, res) => {
    const { email, phone, address } = req.body;

    try {
        const newUser = await createUser(email, phone, address);
        res.status(201).json(newUser); // Respond with the created user data
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Function to approve or reject a transaction
async function userValidation(reqId, status) {
    try {
        const eventRef = db.collection('events').doc(reqId); // Reference to the specific event document
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            throw new Error("Event not found");
        }

        // Update the status field
        await eventRef.update({
            status: status === 1 ? "Approved" : "Rejected" // Set status to "Approved" or "Rejected"
        });

        console.log(`Event ${reqId} status updated to: ${status === 1 ? "Approved" : "Rejected"}`);
        return { reqId, status: status === 1 ? "Approved" : "Rejected" };
    } catch (error) {
        console.error("Error updating event status: ", error);
        throw new Error("Failed to update event status");
    }
}

// Endpoint to approve or reject a transaction
app.post('/userValidation', async (req, res) => {
    const { reqId, status } = req.body; // Expecting reqId and status in the request body

    if (status !== 1 && status !== 2) {
        return res.status(400).json({ error: "Invalid status. Use 1 for approval and 2 for rejection." });
    }

    try {
        const result = await userValidation(reqId, status);
        res.status(200).json(result); // Respond with the updated status
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
