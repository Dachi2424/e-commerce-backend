const crypto = require("crypto")


module.exports = (sequelize, DataTypes) => {
  const RefreshToken = sequelize.define("RefreshToken", {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    }
  })

  RefreshToken.beforeCreate((refreshToken) => {
    refreshToken.token = crypto.createHash("sha256").update(refreshToken.token).digest("hex")
  })


  RefreshToken.associate = (models) => {
    RefreshToken.belongsTo(models.Users, {foreignKey: "userId", onDelete: "CASCADE"})
  }

  return RefreshToken;
}