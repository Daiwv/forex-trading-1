const { Op } = require("sequelize");
const Sequelize = require("sequelize");

// https://www.xe.com/symbols.php
module.exports = function (sequelize, DataTypes) {
  var Currency = sequelize.define(
    "Currency",
    {
      // uuid: {
      //   type: DataTypes.UUID,
      //   defaultValue: Sequelize.UUIDV4,
      //   allowNull: false,
      //   primaryKey: true,
      // },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: false,
      },
      code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        primaryKey: true,
    },
      country: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      symbolUnicodeHex: {
        type: DataTypes.STRING(255),
      },
      isBaseCurrency: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      // Options https://sequelize.org/v3/docs/models-definition/#configuration
      timestamps: false,
    },
  );

  Currency.associate = function (models) {
    // Associate Account with base currency. This will be a foreign key pointing to the curency table
    Currency.hasMany(models.Account, { foreignKey: "baseCurrencyCode" });
    Currency.hasMany(models.Position, { foreignKey: "currencyCode" });

    Currency.hasMany(models.ExchangeRate, { foreignKey: "targetCurrencyCode" });
    Currency.hasMany(models.ExchangeRate, { foreignKey: "baseCurrencyCode" });

    Currency.hasMany(models.Transaction, { foreignKey: "fromCurrencyCode" });
    Currency.hasMany(models.Transaction, { foreignKey: "toCurrencyCode" });

    Currency.hasMany(models.HistoricalRate, { foreignKey: "baseCurrencyCode" });
    Currency.hasMany(models.HistoricalRate, { foreignKey: "targetCurrencyCode" });

  };

  return Currency;
};
