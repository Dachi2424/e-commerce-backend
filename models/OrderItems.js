module.exports = (sequelize, DataTypes) => {
  const OrderItems = sequelize.define("OrderItems", {
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: { args: [1], msg: "Quantity must be at least 1"},
        isInt: {msg: "Quantity must be a whole number"}
      }
    },
    priceAtPurchase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {msg: "Price must be a number"},
        min: {args: [0], msg: "Price must be positive"}
      }
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  })

  OrderItems.associate = (models) => {
    OrderItems.belongsTo(models.Orders, {foreignKey: "orderId", onDelete: "CASCADE"});
    OrderItems.belongsTo(models.Products, {foreignKey: "productId", onDelete: "SET NULL"});
  }

  return OrderItems
}