require("dotenv").config()
const bcrypt = require("bcrypt")
const {Users} = require("../models")
const {sequelize} = require("../models")


async function createAdmin(){
  await sequelize.sync()

  await Users.create({
    username: process.env.ADMIN_USERNAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: "admin"
  });

  console.log("Admin created successfully!")
  process.exit(0)
}


createAdmin()