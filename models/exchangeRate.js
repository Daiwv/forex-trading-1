const { Op } = require("sequelize");
const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  var ExchangeRate = sequelize.define(
    "ExchangeRate",
    {
      uuid: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      // // Base currency. One of USD, GBP, EUR, JPY
      // baseCurrencyUUID: {
      //   type: DataTypes.UUID, // hasMany
      //   allowNull: false,
      // },
      // // target currency. This is the currency that the rate applies to
      // targetCurrencyUUID: {
      //   type: DataTypes.UUID, // hasMany
      //   allowNull: false,
      // },
      rate: {
        type: DataTypes.DECIMAL(20,10),
        allowNull: false,
        defaultValue: 1.0,
      },
    },
    {
      // Options https://sequelize.org/v3/docs/models-definition/#configuration
      timestamps: false,
    }
  );
  return ExchangeRate;
};
