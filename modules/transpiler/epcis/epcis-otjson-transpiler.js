const xml2js = require('xml-js');
const uuidv4 = require('uuid/v4');

class EpcisOtJsonTranspiler {
    constructor(config) {
        this.config = config;
    }

    /**
     * Convert EPCIS XML document to OT-JSON
     * @param xml - XML string
     * @return {*} - OT-JSON object
     */
    convertToOTJson(xml) {
        if (xml == null) {
            return null;
        }

        const json = xml2js.xml2js(xml, {
            compact: true,
            spaces: 4,
        });
        this.arrayze(json, ['attribute', 'VocabularyElement', 'Vocabulary', 'epc', 'AggregationEvent', 'ObjectEvent', 'TransactionEvent', 'TransformationEvent', 'quantityElement', 'childQuantityList', 'source', 'destination', 'childEPCs', 'bizTransaction']);

        const otjson = {
            '@graph': [],
        };

        const otEvents = this._convertEventsFromJson(json);
        const otVocabularyObjects = this._convertVocabulariesFromJson(json);

        otjson['@graph'].push(...otVocabularyObjects);
        otjson['@graph'].push(...otEvents);

        const otConnectors = [];
        for (const otEvent of otEvents) {
            const newConnectors = this._createConnectors(otEvent);
            otConnectors.push(...newConnectors);
        }
        otjson['@graph'].push(...otConnectors);

        if (otEvents.length > 0) {
            delete json['epcis:EPCISDocument'].EPCISBody.EventList;
        }

        if (otVocabularyObjects.length > 0) {
            delete json['epcis:EPCISDocument'].EPCISHeader.extension.EPCISMasterData.VocabularyList.Vocabulary;
        }

        otjson.datasetHeader = json;
        return otjson;
    }

    /**
     * Convert OT-JSON to EPCIS XML document
     * @param otjson - OT-JSON object
     * @return {string} - XML string
     */
    convertFromOTJson(otjson) {
        const { datasetHeader: json } = otjson;

        const graph = otjson['@graph'];
        const otVocabularyObjects = graph.filter(x => x.properties != null && x.properties.objectType === 'vocabularyElement');
        if (otVocabularyObjects.length > 0) {
            json['epcis:EPCISDocument'].EPCISHeader.extension.EPCISMasterData.VocabularyList = this._convertVocabulariesToJson(otVocabularyObjects);
        }

        const otEventObjects = graph.filter(x => x.properties != null && ['ObjectEvent', 'AggregationEvent', 'TransactionEvent', 'TransformationEvent'].includes(x.properties.objectType));

        const otEventsByType = {};
        for (const otEventObject of otEventObjects) {
            if (otEventsByType[otEventObject.properties.objectType] == null) {
                otEventsByType[otEventObject.properties.objectType] = [];
            }
            otEventsByType[otEventObject.properties.objectType]
                .push(this._convertOTEventToJson(otEventObject));
        }

        if (otEventObjects.length > 0) {
            json['epcis:EPCISDocument'].EPCISBody = {
                EventList: otEventsByType,
            };
        }

        if (json['epcis:EPCISDocument'].EPCISBody.EventList.TransformationEvent) {
            json['epcis:EPCISDocument'].EPCISBody.EventList.extension = {
                TransformationEvent: json['epcis:EPCISDocument'].EPCISBody.EventList.TransformationEvent,
            };
            delete json['epcis:EPCISDocument'].EPCISBody.EventList.TransformationEvent;
        }
        return xml2js.js2xml(json, {
            compact: true,
            spaces: 4,
        });
    }

    /**
     * Converts vocabulary master data from JSON format to OT-JSON
     */
    _convertVocabulariesFromJson(object) {
        let root = object['epcis:EPCISDocument'];
        if (root == null) {
            throw new Error('Invalid EPCIS document!');
        }

        root = root.EPCISHeader;
        if (root == null) {
            return [];
        }

        root = root.extension;
        if (root == null) {
            return [];
        }

        root = root.EPCISMasterData;
        if (root == null) {
            return [];
        }

        root = root.VocabularyList;
        if (root == null) {
            return [];
        }

        root = root.Vocabulary;
        if (root == null) {
            return [];
        }

        const result = [];
        for (const vocabulary of root) {
            const { type } = vocabulary._attributes;
            const vocabularyElements = vocabulary.VocabularyElementList.VocabularyElement;
            for (const vocabularyElement of vocabularyElements) {
                const properties = {
                    objectType: 'vocabularyElement',
                    vocabularyType: type,
                    ___attributes: vocabularyElement.attribute,
                    ___metadata: {},
                };
                for (const attribute of vocabularyElement.attribute) {
                    properties[attribute._attributes.id] = attribute._text;
                }

                const otVocabulary = {};
                if (vocabularyElement._attributes.identifier) {
                    otVocabulary.identifiers =
                        this._parseGS1Identifier(vocabularyElement._attributes.id);
                }

                otVocabulary['@id'] = vocabularyElement._attributes.id;
                otVocabulary.properties = properties;
                result.push(otVocabulary);
            }
        }
        return result;
    }

    /**
     * Converts vocabulary master data from OT-JSON format to JSON
     */
    _convertVocabulariesToJson(otVocabularyElementList) {
        const elementsByType = {};
        for (const otVocabularyElement of otVocabularyElementList) {
            const vocabularyElement = {};
            vocabularyElement._attributes = {
                id: otVocabularyElement['@id'],
            };
            vocabularyElement.attribute = otVocabularyElement.properties.___attributes;

            Object.assign(vocabularyElement, otVocabularyElement.properties.___metadata);
            const type = otVocabularyElement.properties.vocabularyType;
            if (elementsByType[type] == null) {
                elementsByType[type] = [];
            }
            elementsByType[type].push(vocabularyElement);
        }

        const vocabulary = {
            Vocabulary: [],
        };

        for (const type of Object.keys(elementsByType)) {
            const vocabularyItem = {
                _attributes: {
                    type,
                },
            };
            vocabularyItem.VocabularyElementList = {
                VocabularyElement: elementsByType[type],
            };
            vocabulary.Vocabulary.push(vocabularyItem);
        }
        return vocabulary;
    }

    /**
     * Converts events to OT-JSON objects
     * @param object - original JSON parsed XML data
     * @return {Array} - Array of Event OT-JSON objects
     * @private
     */
    _convertEventsFromJson(object) {
        const results = [];

        let root = object['epcis:EPCISDocument'];
        if (root == null) {
            throw new Error('Invalid EPCIS document!');
        }

        root = root.EPCISBody;
        if (root == null) {
            return [];
        }

        root = root.EventList;
        if (root == null) {
            return [];
        }

        if (root.ObjectEvent) {
            for (const event of root.ObjectEvent) {
                results.push(this._convertEventFromJson(event, 'ObjectEvent'));
            }
        }
        if (root.ObjectEvent) {
            for (const event of root.AggregationEvent) {
                results.push(this._convertEventFromJson(event, 'AggregationEvent'));
            }
        }

        if (root.TransactionEvent) {
            for (const event of root.TransactionEvent) {
                results.push(this._convertEventFromJson(event, 'TransactionEvent'));
            }
        }

        if (root.extension && root.extension.TransformationEvent) {
            for (const event of root.extension.TransformationEvent) {
                results.push(this._convertEventFromJson(event, 'TransformationEvent'));
            }
        }
        return results;
    }

    /**
     * Converts single Event to OT-JSON event object
     * @param event - Event from original JSON data
     * @param eventType - Event type (ObjectEvent, etc)
     * @return {{"@type": string, "@id": string, identifiers: *[]}}
     * @private
     */
    _convertEventFromJson(event, eventType) {
        const id = `urn:uuid:${uuidv4()}`;

        const otObject = {
            '@type': 'otObject',
            '@id': id,
            identifiers: [{
                '@type': 'uuid',
                '@value': id,
            },
            ],
        };

        otObject.relations = [];
        otObject.properties = {
            objectType: eventType,
        };

        const createRelation = (id, data) => ({
            '@type': 'otRelation',
            direction: 'direct', // think about direction
            linkedObject: {
                '@id': id,
            },
            properties: data,
        });
        if (event.epcList) {
            for (const epc of event.epcList.epc) {
                otObject.relations.push(createRelation(epc, {
                    relationType: 'EPC',
                }));
            }
        }


        if (event.extension) {
            if (event.extension.quantityList) {
                for (const epc of event.extension.quantityList.quantityElement) {
                    otObject.relations.push(createRelation(epc.epcClass, {
                        relationType: 'EPC_QUANTITY',
                        quantity: epc.quantity,
                        uom: epc.uom,
                    }));
                }
            }

            if (event.extension.childQuantityList) {
                for (const childEPC of event.extension.childQuantityList) {
                    otObject.relations.push(createRelation(childEPC.epcClass, {
                        relationType: 'CHILD_EPC_QUANTITY',
                        quantity: childEPC.quantity,
                        uom: childEPC.uom,
                    }));
                }
            }

            if (event.extension.sourceList) {
                for (const source of event.extension.sourceList.source) {
                    otObject.relations.push(createRelation(source, {
                        relationType: 'SOURCE',
                    }));
                }
            }

            if (event.extension.destinationList) {
                for (const destination of event.extension.destinationList.destination) {
                    otObject.relations.push(createRelation(destination, {
                        relationType: 'DESTINATION',
                    }));
                }
            }
        }

        if (event.bizLocation) {
            otObject.relations.push(createRelation(
                event.bizLocation.id,
                {
                    relationType: 'BIZ_LOCATION',
                },
            ));
        }

        if (event.readPoint) {
            otObject.relations.push(createRelation(event.readPoint.id, {
                relationType: 'READ_POINT',
            }));
        }

        if (event.parentID) {
            otObject.relations.push(createRelation(event.parentID, {
                relationType: 'PARENT_EPC',
            }));
        }

        if (event.childEPCs) {
            for (const childEPC of event.childEPCs) {
                otObject.relations.push(createRelation(childEPC, {
                    relationType: 'CHILD_EPC',
                }));
            }
        }

        const foundIdentifiers = this._findIdentifiers(event);
        if (foundIdentifiers.length > 0) {
            otObject.identifiers.push(...foundIdentifiers);
        }

        otObject.properties.___metadata = this._extractMetadata(event);
        Object.assign(otObject.properties, this._compressText(event));
        return otObject;
    }

    /**
     * Converts OT-JSON event object to original JSON object
     * @param event - OT-JSON object
     * @return {*}
     * @private
     */
    _convertOTEventToJson(event) {
        if (event == null) {
            return null;
        }

        const { properties } = event;
        delete properties.objectType;
        const metadata = properties.___metadata;
        delete properties.___metadata;

        const decompressed = this._decompressText(properties);
        this._addMetadata(decompressed, metadata);
        return decompressed;
    }

    /**
     * Create OT-JSON connectors
     * @param otEvent - OT-JSON event object
     * @return {Array}
     * @private
     */
    _createConnectors(otEvent) {
        const connectors = [];
        const eventId = otEvent['@id'];
        if (otEvent.properties.bizTransactionList) {
            for (const bizTransaction of otEvent.properties.bizTransactionList.bizTransaction) {
                connectors.push({
                    '@id': `urn:uuid:${uuidv4()}`,
                    '@type': 'otConnector',
                    connectionId: bizTransaction,
                    relations: [
                        {
                            '@type': 'otRelation',
                            direction: 'reverse',
                            linkedObject: {
                                '@id': eventId,
                            },
                            properties: {
                                relationType: 'CONNECTOR_FOR',
                            },
                        },
                    ],
                });
            }
        }
        return connectors;
    }

    /**
     * Utility function that compresses the original JSON object (from XML)
     * @param object - JSON object
     * @return {*}
     * @private
     */
    _compressText(object) {
        if (this._isLeaf(object)) {
            return object._text;
        }
        if (Array.isArray(object)) {
            const clone = [];
            for (const item of object) {
                clone.push(this._compressText(item));
            }
            return clone;
        } else if (typeof object === 'object') {
            const clone = {};
            for (const key of Object.keys(object)) {
                if (!this._isReserved(key)) {
                    clone[key] = this._compressText(object[key]);
                }
            }
            return clone;
        }
    }

    /**
     * Utility function that decompresses compressed document to original JSON (from XML)
     * @param object - decompressed JSON object
     * @return {*}
     * @private
     */
    _decompressText(object) {
        if (Array.isArray(object)) {
            const clone = [];
            for (const item of object) {
                clone.push(this._decompressText(item));
            }
            return clone;
        } else if (typeof object === 'object') {
            const clone = {};
            for (const key of Object.keys(object)) {
                clone[key] = this._decompressText(object[key]);
            }
            return clone;
        }
        return {
            _text: object,
        };
    }

    /**
     * Adds metadata recursively
     */
    _addMetadata(object, metadata) {
        if (this._isLeaf(object)) {
            if (metadata != null) {
                Object.assign(object, metadata);
            }
        } else if (Array.isArray(object)) {
            for (let i = 0; i < object.length; i += 1) {
                this._addMetadata(object[i], metadata[i]);
            }
        } else if (typeof object === 'object') {
            for (const key of Object.keys(object)) {
                if (metadata[key] != null) {
                    if (metadata[key]._attributes != null) {
                        object[key]._attributes = metadata[key]._attributes;
                    }
                }
                this._addMetadata(object[key], metadata[key]);
            }
        }
    }

    /**
     * Extracts metadata from JSON (_comment, _attributes)
     */
    _extractMetadata(object) {
        if (this._isLeaf(object)) {
            const result = {};
            if (object._attributes) {
                result._attributes = object._attributes;
            }
            if (Object.keys(result).length === 0) {
                return null;
            }
            return result;
        }
        if (Array.isArray(object)) {
            const clone = [];
            for (const item of object) {
                clone.push(this._extractMetadata(item));
            }
            return clone;
        } else if (typeof object === 'object') {
            const clone = {};
            for (const key of Object.keys(object)) {
                clone[key] = this._extractMetadata(object[key]);
            }
            if (object._attributes) {
                clone._attributes = object._attributes;
            }
            return clone;
        }
    }

    /**
     * Extracts OT-JSON identifiers from object
     * @param object - JSON Object
     * @param parentKey - Parent key (needed because of recursion)
     * @return {Array}
     * @private
     */
    _findIdentifiers(object, parentKey) {
        const identifiers = [];

        if (Array.isArray(object)) {
            for (const item of object) {
                identifiers.push(...this._findIdentifiers(item, parentKey));
            }
        } else if (typeof object === 'object') {
            if (this._isLeaf(object)) {
                if (object._attributes != null && object._attributes.identifier) {
                    identifiers.push({
                        '@type': this._trimIdentifier(parentKey),
                        '@value': object._text,
                    });
                }
            } else {
                for (const key of Object.keys(object)) {
                    identifiers.push(...this._findIdentifiers(object[key], key));
                }
            }
        }
        return identifiers;
    }

    /**
     * Is leaf node in the original JSON document
     * @param object - Original JSON document
     * @return {boolean}
     * @private
     */
    _isLeaf(object) {
        return object._text != null;
    }

    /**
     * Is reserved key in original JSON object
     * @param key - key
     * @return {boolean}
     * @private
     */
    _isReserved(key) {
        return key === '_comment' || key === '_attributes';
    }

    /**
     * Is alphanumeric?
     * @param character
     * @return {boolean}
     * @private
     */
    _alphaNum(character) {
        if (/[^a-zA-Z0-9]/.test(character)) {
            return false;
        }
        return true;
    }

    /**
     * Trims GS1 identifier
     * @param untrimmed
     * @return {string}
     * @private
     */
    _trimIdentifier(untrimmed) {
        const n = untrimmed.length;

        let i = n - 1;

        while (i > 0) {
            if (!this._alphaNum(untrimmed.charAt(i))) {
                i += 1;
                break;
            }

            i -= 1;
        }

        return untrimmed.substring(i);
    }

    /**
     * Parse GS1 identifier into smaller chunks (company, lot, etc)
     * @private
     */
    _parseGS1Identifier(identifier) {
        const regex = /^urn:epc:\w+:(\w+):([\d]+).([\d]+).?(\w+)?$/g;
        const splitted = regex.exec(identifier);

        if (!splitted) {
            throw Error('Invalid Identifier');
        }

        const identifierType = splitted[1];
        const companyPrefix = splitted[2];

        let identifiers = {};
        let checkDigit = 0;
        let itemReference = '';

        switch (identifierType) {
        // eslint-disable-next-line
        case 'sgtin':
            // eslint-disable-next-line
            itemReference = splitted[3];
            const serial = splitted[4];
            checkDigit = this._checkDigitGS1(`${companyPrefix.substr(1)}${itemReference}`);

            identifiers = {
                sgtin: identifier,
                companyPrefix: companyPrefix.substr(1),
                itemReference,
                gtin: `${companyPrefix.substr(1)}${itemReference}${checkDigit}`,
            };

            if (serial) {
                identifiers.serial = serial;
            }
            break;
        // eslint-disable-next-line
        case 'lgtin':
            // eslint-disable-next-line
            itemReference = splitted[3];
            const lotNumber = splitted[4];
            checkDigit = this._checkDigitGS1(`${companyPrefix.substr(1)}${itemReference}`);

            identifiers = {
                lgtin: identifier,
                companyPrefix: companyPrefix.substr(1),
                itemReference,
                gtin: `${companyPrefix.substr(1)}${itemReference}${checkDigit}`,
            };

            if (lotNumber) {
                identifiers.lotNumber = lotNumber;
            }
            break;
        case 'pgln':
        // eslint-disable-next-line
        case 'sgln':
            const locationReference = splitted[3];
            const extension = splitted[4];
            checkDigit = this._checkDigitGS1(`${companyPrefix.substr(1)}${locationReference}`);

            identifiers = {
                sgln: identifier,
                companyPrefix: companyPrefix.substr(1),
                locationReference,
                gln: `${companyPrefix.substr(1)}${locationReference}${checkDigit}`,
            };

            if (extension) {
                identifiers.extension = extension;
            }
            break;
        default:
            throw Error('Invalid identifier type');
        }
        return identifiers;
    }

    /**
     * Gets GS1 digit
     * @param n
     * @return {number}
     * @private
     */
    _checkDigitGS1(n) {
        const l = n.length;
        let v = 0;
        let p = false;

        for (let i = l - 1; i >= 0; i -= 1) {
            // eslint-disable-next-line
            if ((p = !p)) {
                v += (parseInt(n[i], 10) * 3);
            } else {
                v += parseInt(n[i], 10);
            }
        }
        return ((Math.ceil(v / 10) * 10) - v);
    }

    /**
     * If there's only one element, wrap it into array
     */
    arrayze(json, attributes) {
        if (json == null) {
            return null;
        }

        if (Array.isArray(json)) {
            for (const item of json) {
                this.arrayze(item, attributes);
            }
        } else if (typeof json === 'object') {
            for (const key of Object.keys(json)) {
                if (attributes.includes(key)) {
                    if (!Array.isArray(json[key])) {
                        json[key] = [json[key]];
                    }
                }
                this.arrayze(json[key], attributes);
            }
        }
    }
}

module.exports = EpcisOtJsonTranspiler;

// const fs = require('fs');
//
// const xml = fs.readFileSync('./datasetA.xml').toString('UTF-8');
// const converter = new EpcisOtJsonTranspiler(null);
// const otJson = converter.convertToOTJson(xml);
// console.log(JSON.stringify(otJson));
// const xmlFromOtJson = converter.convertFromOTJson(otJson);
// console.log(xmlFromOtJson);