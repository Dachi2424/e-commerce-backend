const jsonwebtoken = require("jsonwebtoken")

function alreadyLoggedIn(req, res, next){
  const token = req.cookies.token
  if(!token){
    return next()
  }

  try{
    jsonwebtoken.verify(token, process.env.JWT_ACCESS_SECRET)
    return res.status(400).json({error: "Already logged in"})
  } catch(err){
    res.clearCookie("token")
    return next()
  }
}


module.exports = alreadyLoggedIn