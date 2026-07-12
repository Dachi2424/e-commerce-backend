const express = require("express")
const router = express.Router()
const verifyToken = require("../middlewares/verifyToken")
const requireAdmin = require("../middlewares/requireAdmin")
const {Products, Orders} = require("../models")


// create a product
router.post("/products", verifyToken, requireAdmin, async (req, res, next) => {
  try{
    const {name, description, price, stock, category, imageUrl, specifications} = req.body

    const newData = await Products.create({
      name,
      description,
      price,
      stock,
      category,
      imageUrl,
      specifications
    });
    res.status(201).json({message: "Product created successfully!", product: newData})
  } catch(err){
    next(err)
  }
})


// edit a product
router.patch("/products/:id", verifyToken, requireAdmin, async (req, res, next) => {
  try{
    const {id} = req.params
    const {name, description, price, stock, category, imageUrl, specifications} = req.body
    if(!Number.isInteger(+id)){
      return res.status(400).json({error: "Invalid product ID"})
    }
    const product = await Products.findByPk(id)
    if(!product){
      return res.status(404).json({error: "No product was found"})
    }

    await product.update({name, description, price, stock, category, imageUrl, specifications})
    res.status(200).json(product)
  } catch(err){
    next(err)
  }
})


// delete a product
router.delete("/products/:id", verifyToken, requireAdmin, async (req, res, next) => {
  try{
    const {id} = req.params
    if(!Number.isInteger(+id)){
      return res.status(400).json({error: "Invalid product ID"})
    }
    const product = await Products.findByPk(id)
    if(!product){
      return res.status(404).json({error: "Product not found"})
    }

    await product.destroy()
    res.status(200).json({message: "Product deleted successfully"})
  } catch(err){
    next(err)
  }
})


// update order status
router.patch("/orders/:orderId", verifyToken, requireAdmin, async (req, res, next) => {
  const allowedTransitions = {
    paid: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: []
  }

  try{
    const {status} = req.body
    const {orderId} = req.params
    const validStatusses = ["paid", "shipped", "delivered", "cancelled"]

    if(!validStatusses.includes(status)){
      return res.status(400).json({error: "Invalid status. status must be one of the following: paid, shipped, delivered, or cancelled"})
    }

    const order = await Orders.findByPk(orderId)
    if(!order){
      return res.status(404).json({error: "The order was not found"})
    }

    if(!allowedTransitions[order.status].includes(status)){
      return res.status(400).json({error: `Cannot change status from "${order.status}" to "${status}"`})
    }

    await order.update({status: status})
    return res.status(200).json({message: "Status applied successfully"})

  } catch(err){
    next(err)
  }
})


module.exports = router