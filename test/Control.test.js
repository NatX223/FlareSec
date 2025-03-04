const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyContract", function () {
    let myContract;
    let owner;
    let validator;

    beforeEach(async function () {
        [owner, validator] = await ethers.getSigners();
        const MyContract = await ethers.getContractFactory("MyContract");
        myContract = await MyContract.deploy(3600, owner.address); // Set maxApprovalTime to 1 hour
        await myContract.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await myContract.owner()).to.equal(owner.address);
        });

        it("Should set the max approval time correctly", async function () {
            expect(await myContract.maxApprovalTime()).to.equal(3600);
        });
    });

    describe("Endpoints", function () {
        it("Should add an endpoint", async function () {
            await myContract.addEndpoint("https://example.com");
            expect(await myContract.endpoints(0)).to.equal("https://example.com");
        });

        it("Should change an endpoint", async function () {
            await myContract.addEndpoint("https://example.com");
            await myContract.changeEndpoint(0, "https://new-example.com");
            expect(await myContract.endpoints(0)).to.equal("https://new-example.com");
        });

        it("Should emit an event when an endpoint is added", async function () {
            await expect(myContract.addEndpoint("https://example.com"))
                .to.emit(myContract, "EndpointAdded")
                .withArgs(0, "https://example.com");
        });
    });

    describe("Validators", function () {
        it("Should add a validator", async function () {
            await myContract.addValidator(validator.address);
            expect(await myContract.validators(validator.address)).to.be.true;
        });

        it("Should emit an event when a validator is added", async function () {
            await expect(myContract.addValidator(validator.address))
                .to.emit(myContract, "ValidatorAdded")
                .withArgs(validator.address);
        });
    });

    describe("Max Approval Time", function () {
        it("Should change the max approval time", async function () {
            await myContract.changeMaxApprovalTime(7200); // Change to 2 hours
            expect(await myContract.maxApprovalTime()).to.equal(7200);
        });

        it("Should emit an event when max approval time is changed", async function () {
            await expect(myContract.changeMaxApprovalTime(7200))
                .to.emit(myContract, "MaxApprovalTimeChanged")
                .withArgs(7200);
        });
    });
}); 