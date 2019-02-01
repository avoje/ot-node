const {
    Given, Then,
} = require('cucumber');
const { expect } = require('chai');
const { Database } = require('arangojs');

Given(/^I stop (\d+) holder[s]*$/, { timeout: 3000000 }, function (holdersToStop) {
    expect(holdersToStop).to.be.greaterThan(0);
    expect(holdersToStop).to.be.lessThan(4);
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const nodesStops = [];
    this.state.nodes.filter(node => node.state.takenBids.length > 0).slice(0, holdersToStop)
        .forEach((node) => {
            nodesStops.push(new Promise((accept, reject) => {
                node.once('finished', () => accept());
                node.once('error', reject);
            }));
            node.stop();
        });
    return Promise.all(nodesStops);
});

Given(/^I remember stopped holder[s]*$/, async function () {
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    this.state.lastStoppedNodeIds = this.state.nodes
        .filter(node => node.state.takenBids.length > 0 && node.started === false)
        .map(node => node.id);
});

Given(/^I wait for litigation initiation$/, { timeout: 3000000 }, function (done) {
    console.log('I wait for litigation initiation');
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const { dc } = this.state;

    dc.once('dc-litigation-initiated', () => {
        done();
    });
});

Given(/^I start stopped holder[s]*$/, { timeout: 3000000 }, function () {
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const nodeStarts = [];
    this.state.nodes.filter(node => node.state.takenBids.length > 0 && node.started === false)
        .forEach((node) => {
            nodeStarts.push(new Promise((accept, reject) => {
                node.once('initialized', () => accept());
                node.once('error', reject);
            }));
            node.start();
        });
    return Promise.all(nodeStarts);
});

Then(/^(\d+) holder[s]* should answer litigation$/, { timeout: 3000000 }, async function (holderCount) {
    console.log('1 holder should answer litigation');
    expect(holderCount).to.be.greaterThan(0);
    expect(holderCount).to.be.lessThan(4);
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const answers = [];
    this.state.nodes.filter(node => this.state.lastStoppedNodeIds.includes(node.id))
        .forEach((node) => {
            answers.push(new Promise((accept, reject) => {
                node.once('dh-litigation-answered', () => accept());
                node.once('error', reject);
            }));
        });
    return Promise.all(answers);
});

Then(/^Litigator node should have completed litigation$/, { timeout: 3000000 }, function (done) {
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const { dc } = this.state;

    dc.once('dc-litigation-completed', () => {
        done();
    });
});

Then(/^Stopped holder[s]* should have been penalized$/, { timeout: 3000000 }, function (done) {
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const { dc } = this.state;

    dc.once('dc-litigation-completed-dh-penalized', () => {
        done();
    });
});

Then(/^Litigator should have started replacement for penalized holder[s]*$/, { timeout: 3000000 }, function (done) {
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const { dc } = this.state;

    dc.once('dc-litigation-replacement-started', () => {
        done();
    });
});

Then(/^I wait for (\d+) replacement replication[s] to finish$/, { timeout: 3000000 }, async function (numberOfReplications) {
    console.log('I wait for 4 replacement replications to finish');
    expect(this.state.bootstraps.length, 'No bootstrap nodes').to.be.greaterThan(0);
    expect(this.state.nodes.length, 'No started nodes').to.be.greaterThan(0);
    expect(numberOfReplications).to.be.greaterThan(0);
    expect(numberOfReplications).to.be.lessThan(this.state.nodes.length);

    const { dc } = this.state;

    const replacements = [];
    const potentialReplacements = this.state.nodes
        .filter(node => node.state.takenBids.length === 0 && node.id !== dc.id);
    expect(potentialReplacements.length).to.be.equal(numberOfReplications);

    potentialReplacements.forEach((node) => {
        replacements.push(new Promise((accept, reject) => {
            node.once('dh-litigation-replacement-received', () => accept());
            node.once('error', reject);
        }));
    });
    await Promise.all(replacements);
    this.state.nodes.filter(node => node.id !== dc.id)
        .forEach(node => expect(node.state.replacements.length).to.be.equal(1));
});

Then(/^I wait for replacement to be completed$/, { timeout: 3000000 }, function (done) {
    console.log('I wait for replacement to be completed');
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const { dc } = this.state;

    dc.once('dc-litigation-replacement-completed', () => {
        done();
    });
});

Given(/^I wait for challenges to start$/, { timeout: 3000000 }, async function () {
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const challenges = [];
    this.state.nodes.filter(node => node.state.takenBids.length > 0)
        .forEach((node) => {
            challenges.push(new Promise((accept, reject) => {
                node.once('dh-challenge-sent', () => accept());
                node.once('error', reject);
            }));
        });
    return Promise.all(challenges);
});

Given(/^I corrupt (\d+) holder's database ot_vertices collection$/, { timeout: 3000000 }, function (holdersToDrop) {
    console.log('I corrupt 1 holder\'s database ot_vertices collection');
    expect(holdersToDrop).to.be.greaterThan(0);
    expect(holdersToDrop).to.be.lessThan(4);
    expect(this.state.bootstraps.length).to.be.greaterThan(0);
    expect(this.state.nodes.length).to.be.greaterThan(0);

    const droppedNodes = [];
    this.state.nodes.filter(node => node.state.takenBids.length > 0).slice(0, holdersToDrop)
        .forEach(async (node) => {
            droppedNodes.push(node);

            const {
                database: databaseName,
                username,
                password,
            } = node.options.nodeConfiguration.database;

            const systemDb = new Database();
            systemDb.useBasicAuth(username, password);
            systemDb.useDatabase(databaseName);

            await systemDb.query(`FOR v IN ot_vertices
            UPDATE { _key: v._key, 
                '${this.state.lastImport.data_set_id}': {
                    data:
                        REVERSE(v['${this.state.lastImport.data_set_id}'].data)
                       } 
            } IN ot_vertices`);
        });

    this.state.lastStoppedNodeIds = droppedNodes;
});
