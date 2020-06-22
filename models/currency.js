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
    Currency.hasMany(models.Account, { foreignKey: {name:"baseCurrencyCode",allowNull:false} });
    Currency.hasMany(models.Position, { foreignKey: {name:"currencyCode",allowNull:false} });

    Currency.hasMany(models.ExchangeRate, { foreignKey: {name:"targetCurrencyCode",allowNull:false} });
    Currency.hasMany(models.ExchangeRate, { foreignKey: {name:"baseCurrencyCode",allowNull:false} });

    Currency.hasMany(models.Transaction, { foreignKey: {name:"fromCurrencyCode",allowNull:false} });
    Currency.hasMany(models.Transaction, { foreignKey: {name:"toCurrencyCode",allowNull:false} });

    Currency.hasMany(models.HistoricalRate, { foreignKey: {name:"baseCurrencyCode",allowNull:false} });
    Currency.hasMany(models.HistoricalRate, { foreignKey: {name:"targetCurrencyCode",allowNull:false} });

  };

  return Currency;
};
