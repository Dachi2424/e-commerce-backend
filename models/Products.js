module.exports = (sequelize, DataTypes) => {
  const Products = sequelize.define("Products", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Product name is required"},
        notEmpty: {msg: "Product name cannot be empty"}
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        isDecimal: {msg: "Price must be a number"},
        min: { args: [0], msg: "Price must be positive"}
      }
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: {args: [0], msg: "Stock cannot be negative"},
        isInt: {msg: "Stock must be a whole number"}
      }
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Category not specified"},
        isIn: {
          args: [["laptop", "phone", "tablet", "pc", "monitor", "keyboard", "console"]],
          msg: "Invalid category"
        }
      }
    },
    imageUrl: {
      type: DataTypes.JSON,
      defaultValue: [],
      allowNull: true
    },
    specifications: {
      type: DataTypes.JSON,
      defaultValue: {},
      allowNull: true
    }
  })


  Products.associate = (models) => {
    Products.hasMany(models.CartItems, {onDelete: "CASCADE", foreignKey: "productId"});
    Products.hasMany(models.OrderItems, {onDelete: "SET NULL", foreignKey: "productId"});
  }


  return Products;
}