const Command = require('../command');
const utilities = require('../../Utilities');
const models = require('../../../models/index');

const { Op } = models.Sequelize;

class DCLitigationCompleted extends Command {
    constructor(ctx) {
        super(ctx);
        this.logger = ctx.logger;
    }

    /**
     * Executes command and produces one or more events
     * @param command
     */
    async execute(command) {
        const {
            offerId,
            dhIdentity,
        } = command.data;

        const events = await models.events.findAll({
            where: {
                event: 'LitigationCompleted',
                finished: 0,
            },
        });
        if (events) {
            const event = events.find((e) => {
                const {
                    offerId: eventOfferId,
                    holderIdentity,
                } = JSON.parse(e.data);
                return utilities.compareHexStrings(offerId, eventOfferId)
                    && utilities.compareHexStrings(dhIdentity, holderIdentity);
            });
            if (event) {
                event.finished = true;
                await event.save({ fields: ['finished'] });

                const {
                    DH_was_penalized: penalized,
                } = JSON.parse(event.data);

                this.logger.notify(`Litigation completed for DH ${dhIdentity} and offer ${offerId}. ${penalized ? 'DH was penalized' : 'DH was not penalized'}`);

                const replicatedData = await models.replicated_data.findOne({
                    where: { offer_id: offerId, dh_identity: dhIdentity },
                });

                if (penalized === true) {
                    replicatedData.status = 'PENALIZED';
                } else {
                    replicatedData.status = 'HOLDING';
                }
                await replicatedData.save({ fields: ['status'] });

                const offer = await models.offers.findOne({
                    where: {
                        offer_id: offerId,
                    },
                });

                offer.global_status = 'REPLACEMENT_STARTED';
                offer.save({ fields: ['global_status'] });
                if (penalized) {
                    this.logger.important(`Replacement for DH ${dhIdentity} and offer ${offerId} has been successfully started. Waiting for DHs...`);
                    return {
                        commands: [
                            {
                                data: {
                                    offerId,
                                    dhIdentity,
                                },
                                name: 'dcLitigationReplacementStartedCommand',
                                delay: 0,
                                period: 5000,
                                deadline_at: Date.now() + (5 * 60 * 1000),
                                transactional: false,
                            },
                        ],
                    };
                }

                this.logger.important(`DH ${dhIdentity} has successfully answered litigation.`);
                return Command.empty();
            }
        }
        return Command.repeat();
    }

    /**
     * Builds default DCLitigationCompletedCommand
     * @param map
     * @returns {{add, data: *, delay: *, deadline: *}}
     */
    default(map) {
        const command = {
            data: {
            },
            name: 'dcLitigationCompletedCommand',
            delay: 0,
            period: 5000,
            deadline_at: Date.now() + (5 * 60 * 1000),
            transactional: false,
        };
        Object.assign(command, map);
        return command;
    }
}

module.exports = DCLitigationCompleted;