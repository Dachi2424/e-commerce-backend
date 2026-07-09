const bcrypt = require("bcrypt")

module.exports = (sequelize, DataTypes) => {
  const Users = sequelize.define("Users", {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {msg: "Email is already in use"},
      validate:{
        isEmail: {msg: "Invalid email syntax"},
        notNull: {msg: "Email is required"}
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: {msg: "Password is required"}
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {msg: "Username already in use"},
      validate: {
        notNull: {msg: "Username is required"}
      } 
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user'
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {args: [9, 9], msg: "Phone number must be 9 digits"},
        isNumeric: { msg: "Phone number must contain only digits" }
      }
    },
    idNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {args: [11, 11], msg: "ID number must be 11 numbers long"},
        isNumeric: { msg: "ID number must contain only digits" }
      }
    }
  })


  Users.beforeCreate( async (user) => {
    user.password = await bcrypt.hash(user.password, 10)
  })

  Users.beforeUpdate( async user => {
    if(user.changed("password")){
      user.password = await bcrypt.hash(user.password, 10)
    }
  })



  Users.associate = (models) => {
    
    Users.hasMany(models.CartItems, {onDelete: "CASCADE", foreignKey: "userId"});
    Users.hasMany(models.Orders, {onDelete: "CASCADE", foreignKey: "userId"});
    Users.hasMany(models.RefreshToken, {onDelete: "CASCADE", foreignKey: "userId"});
  }


  return Users;
}