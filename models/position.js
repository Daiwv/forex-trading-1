const { Op } = require("sequelize");
const Sequelize = require("sequelize");

module.exports = function (sequelize, DataTypes) {
  var Position = sequelize.define("Position", {
    uuid: {
      type: DataTypes.UUID,
      defaultValue: Sequelize.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    // accountUUID: { // hasMany
    //   type: DataTypes.UUID,
    //   allowNull: false,
    // },
    // currencyUUID: { // hasMany
    //   type: DataTypes.UUID,
    //   allowNull: false,
    // },
    amount: {
      type: DataTypes.DECIMAL(20,10),
      allowNull: false,
      defaultValue: 0.0,
    },
  },
  {
    // Options https://sequelize.org/v3/docs/models-definition/#configuration
    timestamps: false,
  },
);
  return Position;
};
