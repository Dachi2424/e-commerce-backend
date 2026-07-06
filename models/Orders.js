module.exports = (sequelize, DataTypes) => {
  const Orders = sequelize.define("Orders", {
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: "Total price must be positive"},
        isDecimal: {msg: "Total price must be a number"}
      }
    },
    status: {
      type: DataTypes.ENUM("paid", "processing", "shipped", "delivered", "cancelled"),
      defaultValue: "paid"
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    }
  })

  Orders.associate = (models) => {
    Orders.belongsTo(models.Users, {foreignKey: "userId", onDelete: "CASCADE"});
    Orders.hasMany(models.OrderItems, {foreignKey: "orderId", onDelete: "CASCADE"})
  }

  return Orders
}