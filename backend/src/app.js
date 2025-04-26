const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');
const { ethers } = require("ethers");
const admin = require('firebase-admin');
const { MailerSend, Recipient, EmailParams, Sender } = require("mailersend");

dotenv.config();

const CREDENTIALS = JSON.parse(
    Buffer.from(process.env.CRED, 'base64').toString('utf-8')
);

admin.initializeApp({
    credential: admin.credential.cert(CREDENTIALS),
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
    "event ApprovalCreated(uint256 indexed reqid, address indexed owner, address indexed spender, uint256 amount, uint8 status, uint256 initiatedTime, address validator, address contractAddress)",
    "event TransferCreated(uint256 indexed reqid, address indexed sender, address indexed receiver, uint256 amount, uint8 status, uint256 initiatedTime, address validator, address contractAddress)"
];

// Set up the contract and event listener once
const tokenRouterContract = new ethers.Contract(ROUTER_ADDRESS, TOKENX_ROUTER_ABI, provider);

const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY, // Ensure this is set in your .env file
});

const baseURL = "https://flaresec-production.up.railway.app";

app.get('/', (req, res) => {
    res.send('Hello World');
});

tokenRouterContract.on("ApprovalCreated", async (reqid, sender, receiver, _amount, status, initiatedTime, validator, tokenXAddress, event) => {
    const amount_ = ethers.formatEther(_amount);
    const amount = Number(amount_);
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
    const amount_ = ethers.formatEther(_amount);
    const amount = Number(amount_);
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

// function to update a transaction to completed - rejected or accepted
async function txCompletion(reqId) {
    try {
        const updatedEventRef = db.collection('updatedEvents').doc(reqId); // Reference to the specific event document
        const updatedEventDoc = await updatedEventRef.get();

        if (!updatedEventDoc.exists) {
            throw new Error("Event not found");
        }

        await db.collection('completedEvents').doc(reqId).set({
            reqId,
            sender: updatedEventDoc.data().sender,
            receiver: updatedEventDoc.data().receiver,
            amount: updatedEventDoc.data().amount,
            status: updatedEventDoc.data().status,
            initiatedTime: eventDoc.data().initiatedTime,
            updatedAt: new Date(),
            validator: eventDoc.data().validator,
            txType: eventDoc.data().txType,
            tokenXAddress: eventDoc.data().tokenXAddress,
            createdAt: eventDoc.data().createdAt
        });

        await updatedEventRef.delete();
        console.log(`Transaction ${reqId} has been completed`);
    } catch (error) {
        console.error("Error updating event status: ", error);
        throw new Error("Failed to update event status");
    }
}

app.post('/txCompletion', async (req, res) => {
    const { reqId } = req.body;

    try {
      await txCompletion(reqId);

      res.send("Transaction completed successfully");
    } catch (error) {
      res.status(500).send(`An error occured: ${error.message}`)
    }
})

// Function to approve or reject a transaction
async function userValidation(reqId, status) {
    try {
        const eventRef = db.collection('events').doc(reqId); // Reference to the specific event document
        const eventDoc = await eventRef.get();

        if (!eventDoc.exists) {
            throw new Error("Event not found");
        }

        await db.collection('updatedEvents').doc(reqId).set({
            reqId,
            sender: eventDoc.data().sender,
            receiver: eventDoc.data().receiver,
            amount: eventDoc.data().amount,
            status: status,
            initiatedTime: eventDoc.data().initiatedTime,
            updatedAt: new Date(), // Optional: timestamp of when the event was updated
            validator: eventDoc.data().validator,
            txType: eventDoc.data().txType,
            tokenXAddress: eventDoc.data().tokenXAddress,
            createdAt: eventDoc.data().createdAt
        });

        await eventRef.delete();
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
        res.send(`<h2>Transaction ${result.status}</h2><p>Your transaction is being executed.</p>`);
    } catch (error) {
        res.status(500).send(`<h2>Error</h2><p>${error.message}</p>`);
    }
});

// Endpoint to get an event by reqId
app.get('/event/:reqId', async (req, res) => {
    const { reqId } = req.params; // Get reqId from the request parameters

    try {
        const eventDoc = await db.collection('updatedEvents').doc(reqId).get(); // Fetch the event from Firestore

        if (!eventDoc.exists) {
            return res.status(404).json({ error: "Event not found" }); // Return 404 if event does not exist
        }

        const eventData = eventDoc.data(); // Get the event data

        if (eventData.txType === "Approve") {
            const returnEvent = {
                owner: eventData.sender,
                spender: eventData.receiver,
                receiver: "0x0000000000000000000000000000000000000000",
                amount: eventData.amount,
                status: eventData.status,
                initiatedTime: eventData.initiatedTime
            }

            console.log(returnEvent);
            
            res.json(returnEvent);
        }

        else {
            const returnEvent = {
                owner: eventData.sender,
                spender: "0x0000000000000000000000000000000000000000",
                receiver: eventData.receiver,
                amount: eventData.amount,
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

// Endpoint to get document IDs by validator address
app.get('/eventParams/:validatorAddress', async (req, res) => {
    const { validatorAddress } = req.params; // Get validator address from request parameters

    console.log(validatorAddress);
    if (!validatorAddress) {
        return res.status(400).json({ error: "Validator address is required." });
    }

    try {
        const snapshot = await db.collection('updatedEvents').where('validator', '==', validatorAddress).get();
        const docIds = snapshot.docs.map(doc => doc.id); // Extract document IDs

        // Fetch reqId, txType, and tokenXAddress for each docId
        const eventsData = await Promise.all(docIds.map(async (docId) => {
            const eventDoc = await db.collection('updatedEvents').doc(docId).get();
            if (eventDoc.exists) {
                const eventData = eventDoc.data();
                return {
                    reqId: docId,
                    txType: eventData.txType,
                    tokenXAddress: eventData.tokenXAddress
                };
            }
            return null; // Return null if the event does not exist
        }));

        // Filter out any null results (in case some events were not found)
        const filteredEventsData = eventsData.filter(event => event !== null);
        console.log(filteredEventsData);
        res.json(filteredEventsData); // Return the array of event data
    } catch (error) {
        console.error("Error fetching updated events: ", error);
        res.status(500).json({ error: "Failed to fetch updated events." });
    }
});

// Endpoint to get events by sender address
app.get('/senderEvents/:address', async (req, res) => {
    const { address } = req.params; // Get the address from the request parameters

    try {
        // Fetch events from the 'events' collection
        const eventsSnapshot = await db.collection('events').where('sender', '==', address).get();
        const events = eventsSnapshot.docs.map(doc => {
            const { createdAt, txType, amount } = doc.data();
            return {
                type: txType,
                id: amount,
                amount,
                name: "FlareSec",
                time: new Date(createdAt._seconds * 1000),
                status: "Pending ⏳"
            };
        });

        // Fetch events from the 'updatedEvents' collection
        const updatedEventsSnapshot = await db.collection('updatedEvents').where('sender', '==', address).get();
        const updatedEvents = updatedEventsSnapshot.docs.map(doc => {
            const { txType, amount, updatedAt, status } = doc.data();
            return {
                type: txType,
                id: doc.id,
                amount,
                name: "FlareSec",
                time: new Date(updatedAt._seconds * 1000),
                status: status === 1 ? "validated ✅" : "rejected ❌"
            };
        });
        

        // Fetch events from the 'completedEvents' collection
        const completedEventsSnapshot = await db.collection('completedEvents').where('sender', '==', address).get();
        const completedEvents = completedEventsSnapshot.docs.map(doc => {
            const { txType, amount, updatedAt, status } = doc.data();
            return {
                type: txType,
                id: doc.id,
                amount,
                name: "FlareSec",
                time: new Date(updatedAt._seconds * 1000),
                status: status === 1 ? "validated ✅" : "rejected ❌"
            };
        });
        

        // Combine all events into a single array
        const allEvents = {
            events,
            updatedEvents,
            completedEvents
        };

        // Return the combined events
        res.json(allEvents);
    } catch (error) {
        console.error("Error fetching events: ", error);
        res.status(500).json({ error: "Failed to fetch events." });
    }
});

// Endpoint to sign up a user
app.post('/signup', async (req, res) => {
    const { email, address } = req.body;

    // Validate input
    if (!email || !address) {
        return res.status(400).json({ error: "Email and address are required." });
    }

    try {
        const userRef = db.collection('users'); // Reference to the users collection
        const newUser = {
            email: email,
            address: address,
            createdAt: new Date() // Optional: timestamp of when the user was created
        };

        // Add the new user document to Firestore using the address as the document ID
        await userRef.doc(address).set(newUser); // Use set() to create or overwrite the document
        console.log(`User created with ID: ${address}`);
        res.status(201).json({ id: address, ...newUser }); // Respond with the created user data
    } catch (error) {
        console.error("Error creating user: ", error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

// New endpoint to check if a user has signed up
app.get('/checkUser/:address', async (req, res) => {
    const { address } = req.params;

    try {
        const userSnapshot = await db.collection('users').where('address', '==', address).get();
        
        if (!userSnapshot.empty) {
            console.log("true");
            return res.json({ signedUp: true });
        } else {
            console.log("false");
            return res.json({ signedUp: false });
        }
    } catch (error) {
        console.error("Error checking user signup: ", error);
        return res.status(500).json({ error: "Failed to check user signup" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});