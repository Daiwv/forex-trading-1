const { Op } = require("sequelize");
const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  var Transaction = sequelize.define(
    "Transaction",
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      // accountUUID: {
      //   // hasMany. References Accounts(uuid)
      //   type: DataTypes.UUID,
      //   allowNull: false,
      // },
      timeStamp: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      // fromCurrencyUUID: {
      //   // hasMany. References Currencys(uuid)
      //   type: DataTypes.UUID,
      //   allowNull: false,
      // },
      // toCurrencyUUID: {
      //   // hasMany. References Currencys(uuid)
      //   type: DataTypes.UUID,
      //   allowNull: false,
      // },
      fromAmount: {
        type: DataTypes.DECIMAL(20,10),
        allowNull: false,
      },
      toAmount: {
        type: DataTypes.DECIMAL(20,10),
        allowNull: false,
      },
    },
    {
      // Options https://sequelize.org/v3/docs/models-definition/#configuration
      timestamps: false,
    }
  );
  return Transaction;
};
