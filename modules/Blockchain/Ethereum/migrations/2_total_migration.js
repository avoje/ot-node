var BN = require('bn.js');

var TracToken = artifacts.require('TracToken'); // eslint-disable-line no-undef

var Hub = artifacts.require('Hub'); // eslint-disable-line no-undef
var Profile = artifacts.require('Profile'); // eslint-disable-line no-undef
var Holding = artifacts.require('Holding'); // eslint-disable-line no-undef
var CreditorHandler = artifacts.require('CreditorHandler'); // eslint-disable-line no-undef
var Litigation = artifacts.require('Litigation'); // eslint-disable-line no-undef
var Replacement = artifacts.require('Replacement'); // eslint-disable-line no-undef
var Approval = artifacts.require('Approval'); // eslint-disable-line no-undef

var ProfileStorage = artifacts.require('ProfileStorage'); // eslint-disable-line no-undef
var HoldingStorage = artifacts.require('HoldingStorage'); // eslint-disable-line no-undef
var DictionaryStorage = artifacts.require('DictionaryStorage'); // eslint-disable-line no-undef
var LitigationStorage = artifacts.require('LitigationStorage'); // eslint-disable-line no-undef

var MockHolding = artifacts.require('MockHolding'); // eslint-disable-line no-undef
var MockApproval = artifacts.require('MockApproval'); // eslint-disable-line no-undef
var TestingUtilities = artifacts.require('TestingUtilities'); // eslint-disable-line no-undef

var Identity = artifacts.require('Identity'); // eslint-disable-line no-undef

const amountToMint = (new BN(5)).mul((new BN(10)).pow(new BN(30)));

async function deployProtocolContracts(accounts, deployer) {
    let hub;
    await deployer.deploy(Hub).then(result => hub = result);

    await hub.setContractAddress('Owner', accounts[0]);

    const profileStorage = await deployer.deploy(ProfileStorage, hub.address);
    await hub.setContractAddress('ProfileStorage', profileStorage.address);

    const holdingStorage = await deployer.deploy(HoldingStorage, hub.address);
    await hub.setContractAddress('HoldingStorage', holdingStorage.address);

    const dictionaryStorage = await deployer.deploy(DictionaryStorage, hub.address);
    await hub.setContractAddress('DictionaryStorage', dictionaryStorage.address);

    const litigationStorage = await deployer.deploy(LitigationStorage, hub.address);
    await hub.setContractAddress('LitigationStorage', litigationStorage.address);

    const approval = await deployer.deploy(Approval);
    await hub.setContractAddress('Approval', approval.address);

    const token = await deployer.deploy(TracToken, accounts[0], accounts[1], accounts[2]);
    await hub.setContractAddress('Token', token.address);

    const profile = await deployer.deploy(Profile, hub.address);
    await hub.setContractAddress('Profile', profile.address);

    const holding = await deployer.deploy(Holding, hub.address);
    await hub.setContractAddress('Holding', holding.address);

    const creditorHandler = await deployer.deploy(CreditorHandler, hub.address);
    await hub.setContractAddress('CreditorHandler', creditorHandler.address);

    const litigation = await deployer.deploy(Litigation, hub.address);
    await hub.setContractAddress('Litigation', litigation.address);

    const replacement = await deployer.deploy(Replacement, hub.address);
    await hub.setContractAddress('Replacement', replacement.address);

    console.log('\n\n \t Deployed contract adressess:');
    console.log(`\t Hub contract address: \t\t\t${hub.address}`);
    console.log('');
    console.log(`\t ProfileStorage contract address: \t${profileStorage.address}`);
    console.log(`\t HoldingStorage contract address: \t${holdingStorage.address}`);
    console.log(`\t LitigationStorage contract address: \t${litigationStorage.address}`);
    console.log('');
    console.log(`\t Approval contract address: \t\t${approval.address}`);
    console.log(`\t Token contract address: \t\t${token.address}`);
    console.log(`\t Profile contract address: \t\t${profile.address}`);
    console.log(`\t Holding contract address: \t\t${holding.address}`);
    console.log(`\t CreditorHandler contract address: \t${creditorHandler.address}`);
    console.log(`\t Litigation contract address: \t\t${litigation.address}`);
    console.log(`\t Replacement contract address: \t\t${replacement.address}`);
    console.log('');

    return {
        hub,
        profileStorage,
        holdingStorage,
        litigationStorage,
        approval,
        token,
        profile,
        holding,
        creditorHandler,
        litigation,
        replacement,
    };
}

async function mintTokens(accounts, token, amountToMint) {
    const amounts = [];
    const recepients = [];

    for (let i = 0; i < 10; i += 1) {
        amounts.push(amountToMint);
        recepients.push(accounts[i]);
    }

    await token.mintMany(recepients, amounts, { from: accounts[0] });
    await token.finishMinting({ from: accounts[0] });
}

module.exports = async (deployer, network, accounts) => {
    let token;

    var amounts = [];
    var recepients = [];

    var temp;
    var temp2;

    switch (network) {
    case 'test':
        await deployer.deploy(TestingUtilities);

        ({ token } = await deployProtocolContracts(accounts, deployer));

        await mintTokens(accounts, token, amountToMint);
        break;
    case 'ganache':
        ({ token } = await deployProtocolContracts(accounts, deployer));

        await mintTokens(accounts, token, amountToMint);

        break;
    case 'setIdentity':
        temp = await deployer.deploy(TestingUtilities);
        temp = await TestingUtilities.deployed();
        temp = await temp.keccakAddress.call('0xc37c75271deed11c095a96ea0eedcc87e9d35152');
        temp2 = await Identity.at('0x611d771aafaa3d6fb66c4a81d97768300a6882d5');
        try {
            await temp2.addKey(
                temp,
                [new BN(237)],
                new BN(1),
                { from: accounts[6] },
            );
        } catch (e) {
            temp = await temp2.getKey.call(temp);
            console.log(temp.purposes[0].toString());
        }

        break;
    case 'removeIdentity':
        temp = await deployer.deploy(TestingUtilities);
        temp = await TestingUtilities.deployed();
        temp = await temp.keccakAddress.call('0xc37c75271deed11c095a96ea0eedcc87e9d35152');
        temp2 = await Identity.at('0x611d771aafaa3d6fb66c4a81d97768300a6882d5');
        try {
            await temp2.removeKey(
                temp,
                { from: accounts[6] },
            );
        } catch (e) {
            temp = await temp2.getKey.call(temp);
            console.log(temp.purposes[0].toString());
        }

        break;
    default:
        console.warn('Please use one of the following network identifiers: ganache, mock, test, or rinkeby');
        break;
    }
};
