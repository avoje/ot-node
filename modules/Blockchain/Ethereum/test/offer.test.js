var BN = require('bn.js'); // eslint-disable-line no-undef
const { assert, expect } = require('chai');

var TestingUtilities = artifacts.require('TestingUtilities'); // eslint-disable-line no-undef
var TracToken = artifacts.require('TracToken'); // eslint-disable-line no-undef

var Hub = artifacts.require('Hub'); // eslint-disable-line no-undef

var Profile = artifacts.require('Profile'); // eslint-disable-line no-undef
var Holding = artifacts.require('Holding'); // eslint-disable-line no-undef

var ProfileStorage = artifacts.require('ProfileStorage'); // eslint-disable-line no-undef
var HoldingStorage = artifacts.require('HoldingStorage'); // eslint-disable-line no-undef
var Reading = artifacts.require('Reading'); // eslint-disable-line no-undef

var Identity = artifacts.require('Identity'); // eslint-disable-line no-undef

var Web3 = require('web3');

var web3;

var Ganache = require('ganache-core');

// Helper variables
var errored = true;
var DC_identity;
var DC_wallet;
var offerId;
var tokensToDeposit = (new BN(100)).mul(new BN(10).pow(new BN(21)));

// Offer variables
const dataSetId = '0x8cad6896887d99d70db8ce035d331ba2ade1a5e1161f38ff7fda76cf7c308cde';
const dataRootHash = '0x1cad6896887d99d70db8ce035d331ba2ade1a5e1161f38ff7fda76cf7c308cde';
const redLitigationHash = '0x2cad6896887d99d70db8ce035d331ba2ade1a5e1161f38ff7fda76cf7c308cde';
const greenLitigationHash = '0x3cad6896887d99d70db8ce035d331ba2ade1a5e1161f38ff7fda76cf7c308cde';
const blueLitigationHash = '0x4cad6896887d99d70db8ce035d331ba2ade1a5e1161f38ff7fda76cf7c308cde';
const dcNodeId = '0x5cad6896887d99d70db8ce035d331ba2ade1a5e1161f38ff7fda76cf7c308cde';
const holdingTimeInMinutes = new BN(1);
const tokenAmountPerHolder = new BN(1200);
const dataSetSizeInBytes = new BN(1024);
const litigationIntervalInMinutes = new BN(10);

// Profile variables
var privateKeys = [];
var identities = [];

// Contracts used in test
var hub;
var trac;
var profile;
var holding;
var holdingStorage;
var profileStorage;
var util;

// eslint-disable-next-line no-undef
contract('Offer testing', async (accounts) => {
    // eslint-disable-next-line no-undef
    before(async () => {
        // Get contracts used in hook
        hub = await Hub.deployed();
        trac = await TracToken.deployed();
        profile = await Profile.deployed();
        holding = await Holding.deployed();
        holdingStorage = await HoldingStorage.deployed();
        profileStorage = await ProfileStorage.deployed();
        util = await TestingUtilities.deployed();

        privateKeys = [
            '0x02b39cac1532bef9dba3e36ec32d3de1e9a88f1dda597d3ac6e2130aed9adc4e',
            '0xb1c53fd90d0172ff60f14f61f7a09555a9b18aa3c371991d77209cfe524e71e6',
            '0x8ab3477bf3a1e0af66ab468fafd6cf982df99a59fee405d99861e7faf4db1f7b',
            '0xc80796c049af64d07c76ab4cfb00655895368c60e50499e56cdc3c38d09aa88e',
            '0x239d785cea7e22f23d1fa0f22a7cb46c04d81498ce4f2de07a9d2a7ceee45004',
            '0x021336479aa1553e42bfcd3b928dee791db84a227906cb7cec5982d382ecf106',
            '0x217479bee25ed6d28302caec069c7297d0c3aefdda81cf91ed754c4d660862ae',
            '0xa050f7b3a0479a55e9ddd074d218fbfea302f061e9f21a117a2ec1f0b986a363',
            '0x0dbaee2066aacd16d43a9e23649f232913bca244369463320610ffe6ffb0d69d',
            '0x63b854ff0d973dbd4808a6def4c6a7f65bebcaec07520fbf1c0056331af65a7b',
        ];


        // Generate web3 and set provider
        web3 = new Web3('HTTP://127.0.0.1:7545');
        web3.setProvider(Ganache.provider());

        // Generate eth_account, identities, and profiles

        // Increase approval for depositing tokens
        var promises = [];
        for (var i = 0; i < accounts.length; i += 1) {
            promises[i] = trac.increaseApproval(
                profile.address,
                tokensToDeposit,
                { from: accounts[i] },
            );
        }
        await Promise.all(promises);


        var res;
        // Generate profiles
        for (i = 0; i < accounts.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            res = await profile.createProfile(
                accounts[i],
                '0x4cad6896887d99d70db8ce035d331ba2ade1a5e1161f38ff7fda76cf7c308cde',
                tokensToDeposit,
                false,
                '0x7e9f99b7971cb3de779690a82fec5e2ceec74dd0',
                { from: accounts[i] },
            );
            identities[i] = res.logs[0].args.newIdentity;
        }

        DC_wallet = accounts[accounts.length - 1];
        DC_identity = identities[identities.length - 1];
    });

    // eslint-disable-next-line no-undef
    it('Should create an offer', async () => {
        let res = await holding.createOffer(
            DC_identity,
            dataSetId,
            dataRootHash,
            redLitigationHash,
            greenLitigationHash,
            blueLitigationHash,
            dcNodeId,
            holdingTimeInMinutes,
            tokenAmountPerHolder,
            dataSetSizeInBytes,
            litigationIntervalInMinutes,
            { from: DC_wallet },
        ).catch((err) => {
            assert(false, 'Failed to create offer!');
        });

        // eslint-disable-next-line prefer-destructuring
        const offerId = res.logs[0].args.offerId;

        res = await holdingStorage.offer.call(offerId);

        assert.equal(res.dataSetId, dataSetId, 'Data set ID not matching!');
        assert(holdingTimeInMinutes.eq(res.holdingTimeInMinutes), 'Holding time not matching!');
        assert(tokenAmountPerHolder.eq(res.tokenAmountPerHolder), 'Token amount not matching!');
        assert.equal(res.redLitigationHash, redLitigationHash, 'Red litigation hash not matching!');
        assert.equal(res.greenLitigationHash, greenLitigationHash, 'Green litigation hash not matching!');
        assert.equal(res.blueLitigationHash, blueLitigationHash, 'Blue litigation hash not matching!');
        assert.equal(res.startTime, 0, 'Start time set before it should be set!');
        assert.notEqual(res.difficulty, 0, 'Difficulty not written!');
    });

    // eslint-disable-next-line no-undef
    it('Should test finalizing offer', async () => {
        let res = await holding.createOffer(
            DC_identity,
            dataSetId,
            dataRootHash,
            redLitigationHash,
            greenLitigationHash,
            blueLitigationHash,
            dcNodeId,
            holdingTimeInMinutes,
            tokenAmountPerHolder,
            dataSetSizeInBytes,
            litigationIntervalInMinutes,
            { from: DC_wallet },
        );
        const firstOfferGasUsage = res.receipt.gasUsed;
        console.log(`Gas used for creating offer: ${firstOfferGasUsage}`);

        // eslint-disable-next-line prefer-destructuring
        offerId = res.logs[0].args.offerId;

        const task = await holdingStorage.getOfferTask.call(offerId);
        const solution = await util.keccakAddressAddressAddress.call(
            identities[0],
            identities[1],
            identities[2],
        );

        for (var i = 65; i >= 2; i -= 1) {
            if (task.charAt(task.length - 1) === solution.charAt(i)) break;
        }
        if (i === 2) {
            assert(false, 'Could not find solution for offer challenge!');
        }
        const shift = 65 - i;

        // Getting hashes
        var hashes = [];
        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            hashes[i] = await util.keccakBytesAddress.call(offerId, identities[i]);
        }

        // Getting confirmations
        var confimations = [];
        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            confimations[i] = await web3.eth.accounts.sign(hashes[i], privateKeys[i]);
        }

        res = await holding.finalizeOffer(
            DC_identity,
            offerId,
            shift,
            confimations[0].signature,
            confimations[1].signature,
            confimations[2].signature,
            [new BN(0), new BN(1), new BN(2)],
            [identities[0], identities[1], identities[2]],
            { from: DC_wallet },
        );
        const finalizeOfferGasUsage = res.receipt.gasUsed;
        console.log(`Gas used for finishing offer: ${finalizeOfferGasUsage}`);

        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            res = await profileStorage.profile.call(identities[i]);
            assert(tokenAmountPerHolder.eq(res.stakeReserved), `Reserved stake amount incorrect for account ${i}!`);
        }
        res = await profileStorage.profile.call(DC_identity);
        assert(tokenAmountPerHolder.mul(new BN(3)).eq(res.stakeReserved), 'Reserved stake amount incorrect for DC!');

        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            res = await holdingStorage.holder.call(offerId, identities[i]);

            assert(tokenAmountPerHolder.eq(res.stakedAmount), 'Token amount not matching!');
            assert.equal(res.litigationEncryptionType, i, 'Red litigation hash not matching!');
        }

        for (i = 0; i < confimations.length; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            res = await profileStorage.getStakeReserved.call(identities[i]);
            assert(tokenAmountPerHolder.eq(res), 'Tokens reserved not matching');
        }
        res = await profileStorage.getStakeReserved.call(DC_identity);
        assert(tokenAmountPerHolder.mul(new BN(3)).eq(res), 'Tokens reserved for DC not matching');

        // Create an additional offer
        res = await holding.createOffer(
            DC_identity,
            dataSetId,
            dataRootHash,
            redLitigationHash,
            greenLitigationHash,
            blueLitigationHash,
            dcNodeId,
            holdingTimeInMinutes,
            tokenAmountPerHolder,
            dataSetSizeInBytes,
            litigationIntervalInMinutes,
            { from: DC_wallet },
        );
        const secondOfferGasUsage = res.receipt.gasUsed;
        console.log(`Gas used for creating a second offer: ${secondOfferGasUsage}`);

        console.log(`Total gas used for creating the first offer: ${firstOfferGasUsage + finalizeOfferGasUsage}`);
        console.log(`Total gas used for creating a second offer: ${secondOfferGasUsage + finalizeOfferGasUsage}`);

        errored = false;
    });

    // eslint-disable-next-line no-undef
    it('Should test reseting a task', async () => {
        // Get initial profile status of the data holders and creators
        let promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStake(identities[i]);
        }
        const initialStakeDH = await Promise.all(promises);
        promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStakeReserved(identities[i]);
        }
        const initialStakeReservedDH = await Promise.all(promises);
        const initialStakeDC = await profileStorage.getStake(DC_identity);
        const initialStakeReservedDC = await profileStorage.getStakeReserved(DC_identity);

        // Create offer
        let res = await holding.createOffer(
            DC_identity,
            dataSetId,
            dataRootHash,
            redLitigationHash,
            greenLitigationHash,
            blueLitigationHash,
            dcNodeId,
            holdingTimeInMinutes,
            tokenAmountPerHolder,
            dataSetSizeInBytes,
            litigationIntervalInMinutes,
            { from: DC_wallet },
        );
        const { offerId } = res.logs[0].args;

        // Reset task for the offer
        res = await holding.resetTask(DC_identity, offerId, { from: DC_wallet });

        // Get the new task from the emitted event
        var newTaskEvent = res.logs.find(element => (element.event.localeCompare('OfferTaskReset') === 0));
        const { newTask } = newTaskEvent.args;

        // Calculate offer solution
        const solution = await util.keccakAddressAddressAddress.call(
            identities[0],
            identities[1],
            identities[2],
        );
        for (var i = 65; i >= 2; i -= 1) {
            if (newTask.charAt(newTask.length - 1) === solution.charAt(i)) break;
        }
        if (i === 2) {
            assert(false, 'Could not find solution for offer challenge!');
        }
        const shift = 65 - i;

        // Getting hashes
        var hashes = [];
        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            hashes[i] = await util.keccakBytesAddress.call(offerId, identities[i]);
        }

        // Getting confirmations
        var confimations = [];
        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            confimations[i] = await web3.eth.accounts.sign(hashes[i], privateKeys[i]);
        }

        // Finalize offer
        res = await holding.finalizeOffer(
            DC_identity,
            offerId,
            shift,
            confimations[0].signature,
            confimations[1].signature,
            confimations[2].signature,
            [new BN(0), new BN(1), new BN(2)],
            [identities[0], identities[1], identities[2]],
            { from: DC_wallet },
        );

        // Verify final status of data holders and data creator
        promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStake(identities[i]);
        }
        const finalStakeDH = await Promise.all(promises);
        promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStakeReserved(identities[i]);
        }
        const finalStakeReservedDH = await Promise.all(promises);

        const finalStakeDC = await profileStorage.getStake(DC_identity);
        const finalStakeReservedDC = await profileStorage.getStakeReserved(DC_identity);

        promises = [];
        for (i = 0; i < 3; i += 1) {
            promises[i] = holdingStorage.holder.call(offerId, identities[i]);
        }
        const finalHolderStatus = await Promise.all(promises);

        for (i = 0; i < 3; i += 1) {
            assert(initialStakeReservedDH[i].add(tokenAmountPerHolder).eq(finalStakeReservedDH[i]), `Reserved stake amount incorrect for account ${i}!` +
                `Expected ${initialStakeReservedDH[i].add(tokenAmountPerHolder).toString()} but got ${finalStakeReservedDH[i].toString()}!`);

            assert(tokenAmountPerHolder.eq(finalHolderStatus[i].stakedAmount), 'Token amount not matching!');
            assert.equal(finalHolderStatus[i].litigationEncryptionType, i, `Litigation root hash not matching for holder ${i}!`);
        }

        res = await profileStorage.profile.call(DC_identity);
        assert(initialStakeReservedDC.add(tokenAmountPerHolder.muln(3)).eq(finalStakeReservedDC), 'Reserved stake amount incorrect for DC!' +
                `Expected ${initialStakeReservedDC.add(tokenAmountPerHolder.muln(3)).toString()} but got ${finalStakeReservedDC.toString()}!`);
    });

    // eslint-disable-next-line no-undef
    it('Should test token transfers for holding', async () => {
        let res = await holding.createOffer(
            DC_identity,
            dataSetId,
            dataRootHash,
            redLitigationHash,
            greenLitigationHash,
            blueLitigationHash,
            dcNodeId,
            holdingTimeInMinutes,
            tokenAmountPerHolder,
            dataSetSizeInBytes,
            litigationIntervalInMinutes,
            { from: DC_wallet },
        );

        // eslint-disable-next-line prefer-destructuring
        offerId = res.logs[0].args.offerId;

        const task = await holdingStorage.getOfferTask.call(offerId);
        const solution = await util.keccakAddressAddressAddress.call(
            identities[0],
            identities[1],
            identities[2],
        );

        for (var i = 65; i >= 2; i -= 1) {
            if (task.charAt(task.length - 1) === solution.charAt(i)) break;
        }
        if (i === 2) {
            assert(false, 'Could not find solution for offer challenge!');
        }
        const shift = 65 - i;

        // Getting hashes
        var hashes = [];
        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            hashes[i] = await util.keccakBytesAddress.call(offerId, identities[i]);
        }

        // Getting confirmations
        var confimations = [];
        for (i = 0; i < 3; i += 1) {
            // eslint-disable-next-line no-await-in-loop
            confimations[i] = await web3.eth.accounts.sign(hashes[i], privateKeys[i]);
        }

        res = await holding.finalizeOffer(
            DC_identity,
            offerId,
            shift,
            confimations[0].signature,
            confimations[1].signature,
            confimations[2].signature,
            [new BN(0), new BN(1), new BN(2)],
            [identities[0], identities[1], identities[2]],
            { from: DC_wallet },
        );

        // Get initial profile status of the data holders and creators
        let promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStake(identities[i]);
        }
        const initialStakeDH = await Promise.all(promises);
        promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStakeReserved(identities[i]);
        }
        const initialStakeReservedDH = await Promise.all(promises);
        const initialStakeDC = await profileStorage.getStake(DC_identity);
        const initialStakeReservedDC = await profileStorage.getStakeReserved(DC_identity);

        let timestamp = await holdingStorage.getOfferStartTime(offerId);
        timestamp = timestamp.sub(holdingTimeInMinutes.muln(60).muln(3));
        await holdingStorage.setOfferStartTime(offerId, timestamp);

        promises = [];
        for (i = 0; i < 3; i += 1) {
            promises[i] = holding.payOut(identities[i], offerId, { from: accounts[i] });
        }
        await Promise.all(promises);

        // Verify final status of data holders and data creator
        promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStake(identities[i]);
        }
        const finalStakeDH = await Promise.all(promises);
        promises = [];
        for (let i = 0; i < 3; i += 1) {
            promises[i] = profileStorage.getStakeReserved(identities[i]);
        }
        const finalStakeReservedDH = await Promise.all(promises);

        const finalStakeDC = await profileStorage.getStake(DC_identity);
        const finalStakeReservedDC = await profileStorage.getStakeReserved(DC_identity);

        promises = [];
        for (i = 0; i < 3; i += 1) {
            promises[i] = holdingStorage.holder.call(offerId, identities[i]);
        }
        const finalHolderStatus = await Promise.all(promises);

        for (i = 0; i < 3; i += 1) {
            assert(initialStakeReservedDH[i].sub(tokenAmountPerHolder).eq(finalStakeReservedDH[i]), `Reserved stake amount incorrect for account ${i}!` +
                `Expected ${initialStakeReservedDH[i].sub(tokenAmountPerHolder).toString()} but got ${finalStakeReservedDH[i].toString()}!`);

            assert(initialStakeDH[i].add(tokenAmountPerHolder).eq(finalStakeDH[i]), `Stake amount incorrect for account ${i}!` +
                `Expected ${initialStakeDH[i].add(tokenAmountPerHolder).toString()} but got ${finalStakeDH[i].toString()}!`);

            assert(tokenAmountPerHolder.eq(finalHolderStatus[i].stakedAmount), 'Token amount not matching!');
            assert.equal(finalHolderStatus[i].litigationEncryptionType, i, `Litigation root hash not matching for holder ${i}!`);
        }

        res = await profileStorage.profile.call(DC_identity);
        assert(initialStakeReservedDC.sub(tokenAmountPerHolder.muln(3)).eq(finalStakeReservedDC), 'Reserved stake amount incorrect for DC!' +
                `Expected ${initialStakeReservedDC.sub(tokenAmountPerHolder.muln(3)).toString()} but got ${finalStakeReservedDC.toString()}!`);
        assert(initialStakeDC.sub(tokenAmountPerHolder.muln(3)).eq(finalStakeDC), 'Stake amount incorrect for DC!' +
                `Expected ${initialStakeDC.sub(tokenAmountPerHolder.muln(3)).toString()} but got ${finalStakeDC.toString()}!`);
    });

    // eslint-disable-next-line no-undef
    it('Should test payOutMultiple function', async () => {
        // Set up multiple offers to for a single holder
        const numOffers = new BN(20);
        const DH_index = 4;
        const DH_identity = identities[DH_index];
        const DH_account = accounts[DH_index];
        const dcProfile = await profileStorage.profile.call(DC_identity);
        const dhProfile = await profileStorage.profile.call(DH_identity);

        await profileStorage.setStakeReserved(DC_identity, dcProfile.stakeReserved
            .add(tokenAmountPerHolder.mul(numOffers)));
        await profileStorage.setStakeReserved(DH_identity, dhProfile.stakeReserved
            .add(tokenAmountPerHolder.mul(numOffers)));

        const initialStakeDH = await profileStorage.getStake.call(DH_identity);
        const initialStakeDC = await profileStorage.getStake.call(DC_identity);
        const initialStakeReservedDH = await profileStorage.getStakeReserved.call(DH_identity);
        const initialStakeReservedDC = await profileStorage.getStakeReserved.call(DC_identity);

        const promises = [];
        const offerIds = [];
        for (let i = 0; i < numOffers; i += 1) {
            offerIds[i] = `0x00000000000000000000000000000000000000000000000000000000000000${i < 10 ? '0' : ''}${i}`;
            promises.push(holdingStorage.setHolderStakedAmount(
                offerIds[i],
                DH_identity,
                tokenAmountPerHolder,
            ));
            promises.push(holdingStorage.setOfferCreator(
                offerIds[i],
                DC_identity,
            ));
        }
        await Promise.all(promises);

        const res = await holding.payOutMultiple(
            DH_identity,
            offerIds,
            { from: DH_account, gas: 4000000 },
        );

        const finalStakeDH = await profileStorage.getStake.call(DH_identity);
        const finalStakeDC = await profileStorage.getStake.call(DC_identity);
        const finalStakeReservedDH = await profileStorage.getStakeReserved.call(DH_identity);
        const finalStakeReservedDC = await profileStorage.getStakeReserved.call(DC_identity);

        assert(
            initialStakeDH.add(tokenAmountPerHolder.mul(numOffers)).eq(finalStakeDH),
            `Stake reserved amount incorrect for DH, got ${finalStakeDH.toString()} but expected ${initialStakeDH.add(tokenAmountPerHolder.mul(numOffers)).toString()}`,
        );
        assert(
            initialStakeDC.sub(tokenAmountPerHolder.mul(numOffers)).eq(finalStakeDC),
            `Stake reserved amount incorrect for DH, got ${finalStakeDC.toString()} but expected ${initialStakeDC.sub(tokenAmountPerHolder.mul(numOffers)).toString()}`,
        );

        assert(
            initialStakeReservedDH
                .sub(tokenAmountPerHolder.mul(numOffers)).eq(finalStakeReservedDH),
            `Stake reserved amount incorrect for DH, got ${finalStakeReservedDH.toString()} but expected ${initialStakeReservedDH.sub(tokenAmountPerHolder.mul(numOffers)).toString()}`,
        );
        assert(
            initialStakeReservedDC
                .sub(tokenAmountPerHolder.mul(numOffers)).eq(finalStakeReservedDC),
            `Stake reserved amount incorrect for DH, got ${finalStakeReservedDC.toString()} but expected ${initialStakeReservedDC.sub(tokenAmountPerHolder.mul(numOffers)).toString()}`,
        );
    });

    // eslint-disable-next-line no-undef
    it('Should test difficulty override', async () => {
        let res = await holding.difficultyOverride.call();
        assert(
            res.isZero(),
            `Initial difficulty ovverride incorrect, got ${res.toString()} instead of 0!`,
        );

        const difficultyToSet = new BN(100);
        // Execute tested function
        await holding.setDifficulty(difficultyToSet, { from: accounts[0] });

        res = await holding.difficultyOverride.call();
        assert(
            difficultyToSet.eq(res),
            `Initial difficulty ovverride incorrect, got ${res.toString()} instead of ${difficultyToSet.toString()}!`,
        );

        // Create offer to check difficulty to be written
        res = await holding.createOffer(
            DC_identity,
            dataSetId,
            dataRootHash,
            redLitigationHash,
            greenLitigationHash,
            blueLitigationHash,
            dcNodeId,
            holdingTimeInMinutes,
            tokenAmountPerHolder,
            dataSetSizeInBytes,
            litigationIntervalInMinutes,
            { from: DC_wallet },
        );
        // eslint-disable-next-line prefer-destructuring
        offerId = res.logs[0].args.offerId;
        res = await holdingStorage.offer.call(offerId);

        assert(
            difficultyToSet.eq(res.difficulty),
            `Written difficulty ovverride incorrect, got ${res.difficulty.toString()} instead of ${difficultyToSet.toString()}!`,
        );
    });
});
