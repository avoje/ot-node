
module.exports = {
    up: (queryInterface, Sequelize) => queryInterface.createTable('miner_records', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        offer_id: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        difficulty: {
            allowNull: false,
            type: Sequelize.INTEGER,
        },
        task: {
            allowNull: false,
            type: Sequelize.STRING,
        },
        result: {
            type: Sequelize.JSON,
        },
        status: {
            type: Sequelize.STRING,
        },
        message: {
            type: Sequelize.STRING,
        },
    }),
    down: queryInterface => queryInterface.dropTable('miner_records'),
};

