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
app.use(express.json())


const userRoutes = require("./routes/Users")
app.use("/auth", userRoutes)
const adminRoutes = require("./routes/Admins")
app.use("/admin", adminRoutes)
const productRoutes = require("./routes/Products")
app.use("/products", productRoutes)
const commentRoutes = require("./routes/Comments")
app.use("/comments", commentRoutes)
const cartRoutes = require("./routes/CartItems")
app.use("/cart", cartRoutes)
const orderRoutes = require("./routes/Orders")
app.use("/orders", orderRoutes)





const db = require("./models")
db.sequelize.sync({force: true}).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })  
})
