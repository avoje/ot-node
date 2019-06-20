const path = require('path');

const Encryption = require('../Encryption');
const ImportUtilities = require('../ImportUtilities');
const Models = require('../../models/index');
const Utilities = require('../Utilities');

class ReplicationService {
    constructor(ctx) {
        this.logger = ctx.logger;
        this.config = ctx.config;
        this.graphStorage = ctx.graphStorage;
        this.challengeService = ctx.challengeService;
        this.replicationCache = {};
        this.otJsonImporter = ctx.otJsonImporter;
    }

    /**
     * Creates replications for one Offer
     * @param internalOfferId   - Internal Offer ID
     * @returns {Promise<void>}
     */
    async createReplications(internalOfferId) {
        const offer = await Models.offers.findOne({ where: { id: internalOfferId } });
        if (!offer) {
            throw new Error(`Failed to find offer with internal ID ${internalOfferId}`);
        }

        const otJson = await this.otJsonImporter.getImport(offer.data_set_id);
        const flavor = {
            red: otJson,
            blue: Utilities.copyObject(otJson),
            green: Utilities.copyObject(otJson),
        };

        const that = this;
        this.replicationCache[internalOfferId] = {};
        return Promise.all(['red', 'blue', 'green']
            .map(async (color) => {
                const document = flavor[color];


                const litigationKeyPair = Encryption.generateKeyPair(512);
                const distributionKeyPair = Encryption.generateKeyPair(512);
                const distEncVertices = [];

                const encryptedDataset =
                    ImportUtilities.encryptDataset(document, litigationKeyPair.privateKey);

                // const litigationBlocks = this.challengeService.getBlocks(document['@graph']);
                // const litigationBlocksMerkleTree = new MerkleTree(litigationBlocks);
                const litRootHash = ImportUtilities.calculateDatasetRootHash(encryptedDataset['@graph'], encryptedDataset['@id'], encryptedDataset.datasetHeader.dataCreator);

                // const distMerkleStructure = new MerkleTree(distEncVertices);
                const distRootHash = '';

                // const distEpk = Encryption.packEPK(distributionKeyPair.publicKey);
                // const distEpk = Encryption.packEPK(distributionKeyPair.publicKey);
                // const distributionEpkChecksum =
                //  Encryption.calculateDataChecksum(distEpk, 0, 0, 0);

                const replication = {
                    color,
                    otJson: encryptedDataset,
                    litigationPublicKey: litigationKeyPair.publicKey,
                    litigationPrivateKey: litigationKeyPair.privateKey,
                    distributionPublicKey: distributionKeyPair.publicKey,
                    distributionPrivateKey: distributionKeyPair.privateKey,
                    distributionEpkChecksum: '',
                    litigationRootHash: litRootHash,
                    distributionRootHash: distRootHash,
                    distributionEpk: '',
                };

                that.replicationCache[internalOfferId][color] = replication;
                return replication;
            }));
    }

    /**
     * Replications cleanup (delete dir, purge cache)
     * @param internalOfferId
     * @return {Promise<void>}
     */
    async cleanup(internalOfferId) {
        delete this.replicationCache[internalOfferId];

        this.logger.info(`Deleting replications directory and cache for offer with internal ID ${internalOfferId}`);
        const offerDirPath = this._getOfferDirPath(internalOfferId);
        await Utilities.deleteDirectory(offerDirPath);
    }

    /**
     * Save single replication
     * @param color
     * @param data
     * @param internalOfferId
     */
    async saveReplication(internalOfferId, color, data) {
        this.replicationCache[internalOfferId][color] = data;

        const offerDirPath = this._getOfferDirPath(internalOfferId);
        await Utilities.writeContentsToFile(offerDirPath, `${color}.json`, JSON.stringify(data, null, 2));
    }

    /**
     * Load replication from cache or file
     * @param internalOfferId
     * @param color
     * @return {Promise<*>}
     */
    async loadReplication(internalOfferId, color) {
        let data;
        if (this.replicationCache[internalOfferId]) {
            data = this.replicationCache[internalOfferId][color];
        }

        if (data) {
            this.logger.trace(`Loaded replication from cache for offer internal ID ${internalOfferId} and color ${color}`);
            return data;
        }

        const offerDirPath = this._getOfferDirPath(internalOfferId);
        const colorFilePath = path.join(offerDirPath, `${color}.json`);

        this.logger.trace(`Loaded replication from file for offer internal ID ${internalOfferId} and color ${color}`);
        return JSON.parse(await Utilities.fileContents(colorFilePath));
    }

    /**
     * Gets offer directory
     * @param internalOfferId
     * @returns {string}
     */
    _getOfferDirPath(internalOfferId) {
        return path.join(
            this.config.appDataPath,
            this.config.dataSetStorage, internalOfferId,
        );
    }
}

module.exports = ReplicationService;
