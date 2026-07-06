module.exports = (sequelize, DataTypes) => {
  const Comments = sequelize.define("Comments", {
    commentBody:{
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {msg: "Comment cannot be empty"}
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: "Rating is required" },
        min: { args: [1], msg: "Rating must be at least 1"},
        max: { args: [5], msg: "Rating must be max 5"}
      }
    }
  })


  Comments.associate = (models) => {
    Comments.belongsTo(models.Products, {foreignKey: "productId"});
    Comments.belongsTo(models.Users, {foreignKey: "userId"})
  }

  return Comments
}