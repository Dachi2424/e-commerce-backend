module.exports = (sequelize, DataTypes) => {
  const CartItems = sequelize.define("CartItems", {
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: { args: [1], msg: "Quantity must be at least 1"},
        isInt: {msg: "Quantity must be a whole number"}
      }
    }
  })

  CartItems.associate = (models) => {
    CartItems.belongsTo(models.Users, {foreignKey: "userId", onDelete: "CASCADE"});
    CartItems.belongsTo(models.Products, {foreignKey: "productId", onDelete: "CASCADE"})
  }

  return CartItems
}