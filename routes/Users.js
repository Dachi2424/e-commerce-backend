const express = require("express")
const router = express.Router()
const rateLimit = require("express-rate-limit")
const bcrypt = require("bcrypt")
const crypto = require("crypto")
const jsonwebtoken = require("jsonwebtoken")
const verifyToken = require("../middlewares/verifyToken")
const alreadyLoggedIn = require("../middlewares/alreadyLoggedIn")
const {Users, RefreshToken} = require("../models")


const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many accounts created from this IP, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false
})


// create-account
router.post("/signup", signupLimiter, alreadyLoggedIn, async (req, res, next) => {
  try{
    const {username, email, password} = req.body
    if(!username || !email || !password){
      return res.status(400).json({error: "All fields are required"})
    }
    if(password.length < 8 || password.length > 30){
      return res.status(400).json({error: "password must be betweeen 8 and 30 characters"})
    }

    const newUser = await Users.create({username, password, email})
    res.status(201).json({
      message: "Account created succesfully", 
      email: newUser.email, 
      username: newUser.username, 
      id: newUser.id
    })

  } catch(err){
    next(err)
  }
})


// login
router.post("/login", loginLimiter, alreadyLoggedIn, async (req, res, next) => {
  try{
    const {email, password} = req.body
    if(!email || !password){
      return res.status(400).json({error: "All fields are required"})
    }

    const user = await Users.findOne({where: {email}})
    if(!user){
      return res.status(401).json({error: "Invalid email or password"})
    }
    const isMatching = await bcrypt.compare(password, user.password)
    if(!isMatching){
      return res.status(401).json({error: "Invalid email or password"})
    }


    const refreshToken = jsonwebtoken.sign(
      {id: user.id, role: user.role},
      process.env.JWT_REFRESH_SECRET,
      {expiresIn: "30d"}
    )
    const accessToken = jsonwebtoken.sign(
      {id: user.id, role: user.role},
      process.env.JWT_ACCESS_SECRET,
      {expiresIn: "15m"}
    )

    const newRefreshToken = await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000 * 30)
    }) 

    res.cookie("token", accessToken, {
      secure: false,
      httpOnly: true,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    })

    res.cookie("refreshToken", refreshToken, {
      secure: false,
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 * 30
    })

    res.status(200).json({message: "logged in"})

  } catch(err){
    next(err)
  }
})


// refresh token
router.post("/refresh", async (req, res, next) => {
  try{
    const refreshToken = req.cookies.refreshToken
    if(!refreshToken){
      return res.status(401).json({error: "No refresh token found"})
    }

    try{
      jsonwebtoken.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    } catch(err){
      return res.status(401).json({error: "Invalid or expired refresh token"})
    }

    const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const matchingToken = await RefreshToken.findOne({where: {token: hashedToken}})
    if(!matchingToken){
      return res.status(401).json({error: "User with given token not found"})
    }

    if(matchingToken.revoked || new Date(matchingToken.expiresAt) < new Date()){
      return res.status(401).json({error: "Refresh token expired or revoked"})
    }

    const user = await Users.findByPk(matchingToken.userId)
    if(!user){
      return res.status(404).json({error: "User not found"})
    }

    const newAccessToken = jsonwebtoken.sign(
      {id: user.id, role: user.role},
      process.env.JWT_ACCESS_SECRET,
      {expiresIn: "15m"}
    )

    res.cookie("token", newAccessToken, {
      secure: false,
      httpOnly: true,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000
    })

    res.status(200).json({message: "token refreshed"})
  } catch(err){
    next(err)
  }
})


// get user info
router.get("/", verifyToken, async (req, res, next) => {
  try{  
    const userId = req.user.id

    const user = await Users.findByPk(userId, {
      attributes: ["id", "username", "email", "role", "phone", "idNumber"]
    })
    if(!user){
      return res.status(404).json({error: "User not found"})
    }

    res.status(200).json(user)

  } catch(err){
    next(err)
  }
})


// change password
router.patch("/change-password", verifyToken, async (req, res, next) => {
  try{
    const userId = req.user.id
    const {currentPassword, newPassword} = req.body

    if(!currentPassword || !newPassword){
      return res.status(400).json({error: "All fields are required"})
    }
    if(newPassword.length < 8 || newPassword.length > 30){
      return res.status(400).json({error: "new password must be between 8 and 30 characters"})
    }

    const user = await Users.findByPk(userId)
    if(!user){
      return res.status(404).json({error: "User not found"})
    }

    const isMatching = await bcrypt.compare(currentPassword, user.password)
    if(!isMatching){
      return res.status(400).json({error: "Current password is incorrect"})
    }

    user.password = newPassword
    await user.save()

    await RefreshToken.destroy({where: {userId: userId}})
    res.clearCookie("token")
    res.clearCookie("refreshToken")

    res.status(200).json({message: "Password changed successfully"})

  } catch(err){
    next(err)
  }
})


// change user data
router.patch("/change-data", verifyToken, async (req, res, next) => {
  try{
    const {email, username, phone, idNumber} = req.body
    const userId = req.user.id
    const user = await Users.findByPk(userId)
    if(!user){
      return res.status(404).json({error: "User not found"})
    }

    if(username !== undefined && username !== "") user.username = username
    if(email !== undefined && email !== "") user.email = email
    if(phone !== undefined && phone !== "") user.phone = phone
    if(idNumber !== undefined && idNumber !== "") user.idNumber = idNumber
    
    await user.save()
    res.status(200).json({
      email: user.email,
      username: user.username,
      phone: user.phone,
      idNumber: user.idNumber
    })

  } catch(err){
    next(err)
  }
})


// log out
router.delete("/logout", verifyToken, async (req, res, next) => {
  try{
    const userId = req.user.id
    const refreshToken = req.cookies.refreshToken
    if(!refreshToken){
      return res.status(401).json({error: "No refresh token found"})
    }

    const hashedToken = crypto.createHash("sha256").update(refreshToken).digest("hex")
    const matchingDbToken = await RefreshToken.findOne({where: {token: hashedToken, userId}})
    if(!matchingDbToken){
      return res.status(404).json({error: "Token not found in database"})
    }

    await matchingDbToken.destroy()
    res.clearCookie("refreshToken")
    res.clearCookie("token")
    res.status(200).json({message: "Logged out successfully"})
  } catch(err){
    next(err)
  }
})


// log out from all devices
router.delete("/logout-all", verifyToken, async (req, res, next) => {
  try{
    const userId = req.user.id

    await RefreshToken.destroy({where: {userId}})

    res.clearCookie("refreshToken")
    res.clearCookie("token")
    res.status(200).json({message: "logged out from all devices successfully"})

  } catch(err){
    next(err)
  }
})


// delete account
router.delete("/delete-account", verifyToken, async (req, res, next) => {
  try{
    const userId = req.user.id

    const user = await Users.findByPk(userId)
    if(!user){
      return res.status(404).json({error: "No user found"})
    }

    await user.destroy()
    res.clearCookie("refreshToken")
    res.clearCookie("token")
    res.status(200).json({message: "Account deleted successfully"})

  } catch(err){
    next(err)
  }
})







module.exports = router