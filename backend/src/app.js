const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');
const cron = require('node-cron');
const { ethers } = require("ethers");
const admin = require('firebase-admin');
const serviceAccount = require("../flaresec-1dfea-firebase-adminsdk-fbsvc-5c7870bb22.json");
const { MailerSend, Recipient, EmailParams, Sender } = require("mailersend");

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
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;
const TOKENX_ROUTER_ABI = [
    "event ApprovalCreated(uint256 indexed reqid, address indexed owner, address indexed spender, uint256 amount, uint8 status, uint256 initiatedTime, address validator, address contractAddress);",
    "event TransferCreated(uint256 indexed reqid, address indexed sender, address indexed receiver, uint256 amount, uint8 status, uint256 initiatedTime, address validator, address contractAddress);"
];

// Set up the contract and event listener once
const tokenRouterContract = new ethers.Contract(ROUTER_ADDRESS, TOKENX_ROUTER_ABI, provider);

const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY, // Ensure this is set in your .env file
});

const baseURL = "http://localhost:3300";

tokenRouterContract.on("ApprovalCreated", async (reqid, sender, receiver, _amount, status, initiatedTime, validator, tokenXAddress, event) => {
    const amount = ethers.formatEther(_amount);
    console.log(`Event Params: 
        reqid: ${reqid}, 
        sender: ${sender},
        receiver: ${receiver},
        amount: ${amount},
        status: ${status},
        initiatedTime: ${initiatedTime},
        tokenXAddress: ${tokenXAddress},
        validator: ${validator}`);

    // Store the event data in Firestore
    try {
        const docId = String(reqid);
        await db.collection('events').doc(docId).set({
            reqid,
            sender,
            receiver,
            amount,
            status,
            initiatedTime,
            tokenXAddress,
            txType: "Approve",
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
            const sentFrom = new Sender("no-reply@trial-z86org8pvwzlew13.mlsender.net", "FlareSec");
            const recipients = [new Recipient(userEmail, "User")];
            const emailParams = new EmailParams()
                .setFrom(sentFrom)
                .setTo(recipients)
                .setReplyTo(sentFrom)
                .setSubject("Approval Created Notification")
                .setHtml(`
                    <p><strong>An approval request has been initiated.</strong></p>
                    <p>Spender: ${receiver}</p>
                    <p>Amount: ${amount}</p>
                    <p>Please choose an option:</p>
                    <a href="${baseURL}/userValidation?reqId=${reqid}&status=1" style="display: inline-block; padding: 10px 20px; background: green; color: white; text-decoration: none; border-radius: 5px;">Approve ✅</a>
                    <a href="${baseURL}/userValidation?reqId=${reqid}&status=2" style="display: inline-block; padding: 10px 20px; background: red; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline ❌</a>
                `)
                .setText(`An appproval request has been initiated.
                    Spender: ${receiver}
                    Amount: ${amount}

                    Approve: ${baseURL}/userValidation?reqId=${reqid}&status=1
                    Decline: ${baseURL}/userValidation?reqId=${reqid}&status=2
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

tokenRouterContract.on("TransferCreated", async (reqid, sender, receiver, _amount, status, initiatedTime, validator, tokenXAddress, event) => {
    const amount = ethers.formatEther(_amount);
    console.log(`Event Params: 
        reqid: ${reqid}, 
        sender: ${sender},
        receiver: ${receiver},
        amount: ${amount},
        status: ${status},
        initiatedTime: ${initiatedTime},
        tokenXAddress: ${tokenXAddress},
        validator: ${validator}`);

    // Store the event data in Firestore
    try {
        const docId = String(reqid);
        await db.collection('events').doc(docId).set({
            reqid,
            sender,
            receiver,
            amount,
            status,
            initiatedTime,
            tokenXAddress,
            txType: "Transfer",
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
            const sentFrom = new Sender("no-reply@trial-z86org8pvwzlew13.mlsender.net", "FlareSec");
            const recipients = [new Recipient(userEmail, "User")];
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
                    <a href="${baseURL}/userValidation?reqId=${reqid}&status=1" style="display: inline-block; padding: 10px 20px; background: green; color: white; text-decoration: none; border-radius: 5px;">Approve ✅</a>
                    <a href="${baseURL}/userValidation?reqId=${reqid}&status=2" style="display: inline-block; padding: 10px 20px; background: red; color: white; text-decoration: none; border-radius: 5px; margin-left: 10px;">Decline ❌</a>
                `)
                .setText(`A transfer request has been initiated.
                    Receiver: ${receiver}
                    Amount: ${amount}

                    Approve: ${baseURL}/userValidation?reqId=${reqid}&status=1
                    Decline: ${baseURL}/userValidation?reqId=${reqid}&status=2
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
// cron.schedule('*/30 * * * * *', () => {
//     console.log('Running a task every 30 seconds');
//     // You can perform additional tasks here if needed
// });

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
            status
        });

        await db.collection('updatedEvents').doc(reqId).set({
            reqId,
            updatedAt: new Date() // Optional: timestamp of when the event was updated
        });

        console.log(`Event ${reqId} status updated to: ${status === 1 ? "Approved" : "Rejected"}`);
        return { reqId, status: status === 1 ? "Approved" : "Rejected" };
    } catch (error) {
        console.error("Error updating event status: ", error);
        throw new Error("Failed to update event status");
    }
}

// Endpoint to approve or reject a transaction
app.get('/userValidation', async (req, res) => {
    const { reqId, status } = req.query; // Get reqId and status from query parameters

    if (status !== '1' && status !== '2') {
        return res.status(400).send("Invalid status. Use 1 for approval and 2 for rejection.");
    }

    try {
        const result = await userValidation(reqId, parseInt(status));
        res.send(`<h2>Transaction ${result.status}</h2><p>Your transaction has been recorded.</p>`);
    } catch (error) {
        res.status(500).send(`<h2>Error</h2><p>${error.message}</p>`);
    }
});

// Endpoint to get an event by reqId
app.get('/event/:reqId', async (req, res) => {
    const { reqId } = req.params; // Get reqId from the request parameters

    try {
        const eventDoc = await db.collection('events').doc(reqId).get(); // Fetch the event from Firestore

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Event not found" }); // Return 404 if event does not exist
        }

        const eventData = eventDoc.data(); // Get the event data
        const amount = ethers.parseEther(eventData.amount);

        if (eventData.txType === "Approve") {
            const returnEvent = {
                owner: eventData.sender,
                spender: eventData.receiver,
                receiver: "0x0000000000000000000000000000000000000000",
                amount: amount,
                status: eventData.status,
                initiatedTime: eventData.initiatedTime
            }

            res.json(returnEvent);
        }

        else {
            const returnEvent = {
                owner: eventData.sender,
                spender: "0x0000000000000000000000000000000000000000",
                receiver: eventData.receiver,
                amount: amount,
                status: eventData.status,
                initiatedTime: eventData.initiatedTime
            }

            res.json(returnEvent);
        }

    } catch (error) {
        console.error("Error fetching event: ", error);
        res.status(500).json({ error: "Failed to fetch event" }); // Return 500 on error
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
