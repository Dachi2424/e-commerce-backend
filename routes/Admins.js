const express = require("express")
const router = express.Router()
const verifyToken = require("../middlewares/verifyToken")
const requireAdmin = require("../middlewares/requireAdmin")
const {Users, Products, Comments, Orders} = require("../models")

// create a product
router.post("/products", verifyToken, requireAdmin, async (req, res) => {
  try{
    const {name, description, price, stock, category, imageUrl} = req.body

    if(!stock || stock < 1){
      return res.status(400).json({error: "Stock must be at least 1"})
    }

    const newData = await Products.create({
      name,
      description,
      price,
      stock, 
      category,
      imageUrl
    });
    res.status(201).json({message: "Product created successfully!"})
  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({error: err.message})
    }
    res.status(500).json({error: err.message})
  }
})


// edit a product
router.patch("/products/:id", verifyToken, requireAdmin, async (req, res) => {
  try{
    const {id} = req.params
    const product = await Products.findByPk(id)
    if(!product){
      return res.status(404).json({error: "No product was found"})
    }

    await product.update(req.body)

    res.status(200).json(product)
  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({error: err.message})
    }
    res.status(500).json({error: err.message})
  }
})


// delete a product
router.delete("/products/:id", verifyToken, requireAdmin, async (req, res) => {
  try{
    const {id} = req.params
    const product = await Products.findByPk(id)
    if(!product){
      return res.status(404).json({error: "Product not found"})
    }

    await product.destroy()

    res.status(200).json({message: "Product deleted successfully"})
  } catch(err){
    res.status(500).json({error: err.message})
  }
})


// delete a comment
router.delete("/comments/:id", verifyToken, requireAdmin, async (req, res) => {
  try{
    const {id} = req.params

    const comment = await Comments.findByPk(id)
    if(!comment){
      return res.status(404).json({error: "Comment not found"})
    }

    await comment.destroy()
    res.status(200).json({message: "Comment was deleted"})

  } catch(err){
    res.status(500).json({error: err.message})
  }
})


// update order status
router.patch("/orders/:orderId", verifyToken, requireAdmin, async (req, res) => {
  try{
    const data = req.body
    const {orderId} = req.params

    const order = await Orders.findOne({
      where: {id: orderId}
    })
    if(!order){
      return res.status(404).json({error: "No order found"})
    }

    await order.update({status: data.status})
    res.status(200).json({message: "Order status updated successfully"})

  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({error: err.message})
    }
    res.status(500).json({error: err.message})
  }
})






module.exports = router