const Utilities = require('../Utilities');
const ArangoJS = require('./Arangojs');
const Neo4j = require('./Neo4j');

class GraphStorage {
    /**
     * Default constructor
     * @param logger
     * @param selectedDatabase Selected graph database
     */
    constructor(selectedDatabase, logger, notifyError) {
        this.logger = logger;
        this.selectedDatabase = selectedDatabase;
        this._allowedClasses = ['Location', 'Actor', 'Product', 'Transport',
            'Transformation', 'Observation', 'Ownership'];
        this.notifyError = notifyError;
    }

    /**
     * Connecting to graph database system selected in system database
     * @returns {Promise<any>}
     */
    connect() {
        return new Promise(async (resolve, reject) => {
            if (!this.selectedDatabase) {
                reject(Error('Unable to connect to graph database'));
            } else {
                switch (this.selectedDatabase.provider) {
                case 'arangodb':
                    try {
                        this.db = new ArangoJS(
                            this.selectedDatabase.username,
                            this.selectedDatabase.password,
                            this.selectedDatabase.database,
                            this.selectedDatabase.host,
                            this.selectedDatabase.port,
                            this.logger,
                        );
                        await this.__initDatabase__();
                        resolve(this.db);
                    } catch (error) {
                        reject(Error('Unable to connect to graph database'));
                    }
                    break;
                case 'neo4j':
                    try {
                        this.db = new Neo4j(
                            this.selectedDatabase.username,
                            this.selectedDatabase.password,
                            this.selectedDatabase.database,
                            this.selectedDatabase.host,
                            this.selectedDatabase.port,
                            this.logger,
                        );
                        await this.__initDatabase__();
                        resolve(this.db);
                    } catch (error) {
                        reject(Error('Unable to connect to graph database'));
                    }
                    break;
                default:
                    this.logger.error(this.selectedDatabase);
                    reject(Error('Unsupported graph database system'));
                }
            }
        });
    }

    /**
     * Finds imports IDs based on data location query
     *
     * DataLocationQuery structure: [[path, value, opcode]*]
     *
     * @param encColor - Encrypted color
     * @param dataLocationQuery - Search query
     * @return {Promise}
     */
    findImportIds(dataLocationQuery, encColor = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.findImportIds(dataLocationQuery, encColor).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     * Finds vertices by query defined in DataLocationRequestObject
     * @param encColor
     * @param inputQuery
     */
    async dataLocationQuery(inputQuery, encColor = null) {
        return this.db.dataLocationQuery(inputQuery, encColor);
    }

    /**
     * Finds traversal path starting from particular vertex
     * @param depth             Traversal depth
     * @param startVertex       Starting vertex
     * @return {Promise<void>}
     */
    findTraversalPath(startVertex, depth) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.findTraversalPath(startVertex, depth).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     * Gets max vertex_key where uid is the same and has the max version
     * @param senderId  Sender ID
     * @param uid       Vertex uid
     * @return {Promise<void>}
     */
    findVertexWithMaxVersion(senderId, uid) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.findVertexWithMaxVersion(senderId, uid).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     * Add vertex
     * @param vertex Vertex data
     * @returns {Promise<any>}
     */
    addVertex(vertex, importedVertices = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.addVertex(vertex, importedVertices).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     * Add edge
     * @param edge Edge data
     * @returns {Promise<any>}
     */
    addEdge(edge, importedEdges = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.addEdge(edge, importedEdges).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    async findAllDocuments(collection, keys) {
        return this.db.findAllDocuments(collection, keys);
    }

    /**
     * Identify selected graph database
     * @returns {string}
     */
    identify() {
        return this.db.identify();
    }

    async getConsensusEvents(sender_id) {
        return this.db.getConsensusEvents(sender_id);
    }

    /**
    * Get version of selected graph database
    * @returns {Promise<any>}
    */
    async version() {
        try {
            const result = await this.db.version(
                this.selectedDatabase.host, this.selectedDatabase.port,
                this.selectedDatabase.username, this.selectedDatabase.password,
            );
            return result;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets underlying database information
     * @returns database info
     */
    getDatabaseInfo() {
        return this.selectedDatabase;
    }

    /**
     * Updates document with the import ID
     * @param collectionName
     * @param document
     * @param importNumber
     */
    updateImports(collectionName, documentKeys, importNumber) {
        return this.db.updateImports(collectionName, documentKeys, importNumber);
    }

    /**
     * Updates edge imports by ID
     * @param senderId
     * @param uid
     * @param importNumber
     * @return {Promise<*>}
     */
    updateEdgeImportsByUID(senderId, uid, importNumber) {
        return this.db.updateEdgeImportsByUID(senderId, uid, importNumber);
    }

    /**
     * Updates vertex imports by ID
     * @param senderId
     * @param uid
     * @param importNumber
     * @return {Promise<*>}
     */
    updateVertexImportsByUID(senderId, uid, importNumber) {
        return this.db.updateVertexImportsByUID(senderId, uid, importNumber);
    }

    /**
     * Finds all object classes
     * @return {Promise<*>}
     */
    async findObjectClassVertices() {
        const classes = await this.db.findObjectClassVertices();
        if (classes.length === 0) {
            this.notifyError(new Error('Missing class vertices'));
            await this.__initDatabase__();
            return this.db.findObjectClassVertices();
        }
        return classes;
    }

    /**
     * Get list of vertices by import ID
     * @param importId - Import ID
     * @param encColor - Encrypted color
     * @return {Promise}
     */
    findVerticesByImportId(importId, encColor = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.findVerticesByImportId(importId, encColor).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     * Gets edges by import ID from the underlying database
     * @param datasetId - Dataset ID
     * @param encColor - Encrypted color
     * @returns {Promise}
     */
    findEdgesByImportId(datasetId, encColor) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.findEdgesByImportId(datasetId, encColor).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     * Find event based on ID and bizStep
     * Note: based on bizStep we define INPUT(shipping) or OUTPUT(receiving)
     * @param senderId    Sender ID
     * @param partnerId   Partner ID
     * @param documentId  Document ID
     * @param bizStep     Shipping/Receiving
     * @return {Promise}
     */
    findEvent(senderId, partnerId, documentId, bizStep) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else {
                this.db.findEvent(senderId, partnerId, documentId, bizStep).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     *
     * @param className
     * @returns {Promise<string | undefined>}
     */
    async getClassId(className) {
        const id = this._allowedClasses.find(element => element.toLocaleLowerCase() ===
            className.toLocaleLowerCase());
        return id;
    }

    /**
     * Extract vertices from virtual graph
     * @param virtual graph
     * @returns {JSON}
     */
    static getVerticesFromVirtualGraph(graph) {
        const virtualGraph = Utilities.copyObject(graph);
        const vertices = [];
        for (const key in virtualGraph.data) {
            delete virtualGraph.data[key].outbound;
            vertices.push(virtualGraph.data[key]);
        }
        return vertices;
    }

    /**
     * Extracts edges from virtual graph
     * @param virtual graph
     * @returns {JSON}
     */
    static getEdgesFromVirtualGraph(graph) {
        const virtualGraph = Utilities.copyObject(graph);
        const edges = [];
        for (const key in virtualGraph.data) {
            for (const edge in virtualGraph.data[key].outbound) {
                edges.push(virtualGraph.data[key].outbound[edge]);
            }
        }
        return edges;
    }

    /**
     * Imports virtual graph to database
     * @param virtual graph
     * @returns
     */
    async importVirtualGraph(virtualGraph) {
        const virtualEdges = GraphStorage.getEdgesFromVirtualGraph(virtualGraph);
        const virtualVertices = GraphStorage.getVerticesFromVirtualGraph(virtualGraph);

        const vertices = [];
        for (const i in virtualVertices) {
            vertices.push(this.db.addVertex(virtualVertices[i]));
        }
        await Promise.all(vertices);

        const edges = [];
        for (const i in virtualEdges) {
            edges.push(this.db.addEdge(virtualEdges[i]));
        }
        return Promise.all(edges);
    }

    /**
     * Gets the count of documents in collection.
     * @param collectionName
     * @returns {Promise}
     */
    getDocumentsCount(collectionName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(Error('Not connected to graph database'));
            } else if (this.db.identify === 'Neo4j') {
                reject(Error('Method not implemented for Neo4j database yet'));
            } else {
                this.db.getDocumentsCount(collectionName).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
            }
        });
    }

    /**
     * Mimics commit opertaion
     * Removes inTransaction fields
     * @return {Promise<void>}
     */
    async commit() {
        await this.db.commit();
    }

    /**
     * Mimics rollback opertaion
     * Removes elements in transaction
     * @return {Promise<void>}
     */
    async rollback() {
        await this.db.rollback();
    }

    /**
     * Replaces one data set ID with another
     * @param oldDataSet    Old data set ID
     * @param newDataSet    New data set ID
     * @returns {Promise<void>}
     */
    async replaceDataSets(oldDataSet, newDataSet) {
        return this.db.replaceDataSets(oldDataSet, newDataSet);
    }

    /**
     * Remove data set ID in documents from collections
     * @param dataSetID     Data set ID
     * @returns {Promise<void>}
     */
    async removeDataSetId(dataSetID) {
        return this.db.removeDataSetId(dataSetID);
    }

    /**
     * Initializes database with predefined collections and vertices.
     * @returns {Promise<void>}
     * @private
     */
    async __initDatabase__() {
        await this.db.initialize(this._allowedClasses);
    }
}

module.exports = GraphStorage;
