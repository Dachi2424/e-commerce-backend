

function alreadyLoggedIn(req, res, next){
  const token = req.cookies.token
  if(token){
    return res.status(400).json({error: "Already logged in"})
  }
  next()
}


module.exports = alreadyLoggedIn