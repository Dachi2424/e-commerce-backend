const {verify} = require("jsonwebtoken")



const verifyToken = (req, res, next) => {
  const accessToken = req.cookies.token

  if(!accessToken){
    return res.status(401).json({error: "Token not found"})
  }

  try{
    const decoded = verify(accessToken, process.env.JWT_ACCESS_SECRET)
    req.user = decoded // decoded stores whatever I stored in the token when i signed it
    next()
  } catch(err){
    res.status(401).json({error: "Invalid or expired token"})
  }

}


module.exports = verifyToken
