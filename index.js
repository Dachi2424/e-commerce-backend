require("dotenv").config({path: __dirname + "/.env"})
const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const app = express()
const PORT = 3001
app.use(cookieParser())
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}))

app.use("/orders/webhook", express.raw({ type: "application/json" }))
app.use((req, res, next) => {
  if (req.path === "/orders/webhook") return next()
  express.json()(req, res, next)
})


const userRoutes = require("./routes/Users")
app.use("/auth", userRoutes)
const adminRoutes = require("./routes/Admins")
app.use("/admin", adminRoutes)
const productRoutes = require("./routes/Products")
app.use("/products", productRoutes)
const cartRoutes = require("./routes/CartItems")
app.use("/cart", cartRoutes)
const orderRoutes = require("./routes/Orders")
app.use("/orders", orderRoutes)

app.use((err, req, res, next) => {
  if(err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError"){
    return res.status(400).json({error: err.message})
  }
  console.error(err)
  res.status(500).json({error: "Something went wrong"})
})



const db = require("./models")
db.sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })  
})