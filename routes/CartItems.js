const express = require("express")
const router = express.Router()
const verifyToken = require("../middlewares/verifyToken")
const {CartItems, Products} = require("../models")


// add to cart
router.post("/:productId", verifyToken, async (req, res) => {
  try{
    const {productId} = req.params
    const {quantity} = req.body
    const userId = req.user.id

    const product = await Products.findByPk(productId)
    if(!product){
      return res.status(404).json({error: "No product found"})
    }

    if(product.stock < 1){
      return res.status(400).json({error: "Product is out of stock"})
    }

    const [cartItem, created] = await CartItems.findOrCreate({
      where: {userId, productId},
      defaults: {quantity}
    })

    if(!created){
      await cartItem.update({quantity: cartItem.quantity + quantity})
    }

    res.status(201).json({message: "Added to cart"})
  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({error: err.message})
    }
    res.status(500).json({error: err.message})
  }
})


// get cart
router.get("/", verifyToken, async(req, res) => {
  try{
    const userId = req.user.id
    const cart = await CartItems.findAll({
      where: {userId},
      include:[
        {model: Products}
      ]
    })
    res.status(200).json(cart)
  } catch(err){
    res.status(500).json({error: err.message})
  }
})


// update cartItem
router.patch("/:productId", verifyToken, async (req, res) => {
  try{
    const userId = req.user.id
    const {quantity} = req.body
    const {productId} = req.params

    const product = await Products.findByPk(productId)
    if(!product){
      return res.status(404).json({error: "No product found"})
    }
    if(product.stock < quantity){
      return res.status(400).json({error: "Product quantity cannot extend the quentity in stock"})
    }

    const cartItem = await CartItems.findOne({where: {userId, productId}})
    if(!cartItem){
      return res.status(404).json({error: "No such product in cart found"})
    }
    await cartItem.update({quantity})
    res.status(200).json({message: "Quantity successfully changed"})

  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({error: err.message})
    }
    res.status(500).json({error: err.message})
  }
})


// delete the entire cart
router.delete("/", verifyToken, async (req, res) => {
  try{
    const userId = req.user.id

    const cart = await CartItems.findAll({where: {userId}})
    if(cart.length === 0){
      return res.status(400).json({error: "Cart is already empty"})
    }

    await CartItems.destroy({where: {userId}})
    res.status(200).json({message: "Cart cleared successfully"})
  } catch(err){
    res.status(500).json({error: err.message})
  }
})


// delete cart item
router.delete("/:productId", verifyToken, async (req, res) => {
  try{
    const userId = req.user.id
    const {productId} = req.params
    const product = await Products.findByPk(productId)
    if(!product){
      return res.status(404).json({error: "Product not found"})
    }

    const cartItem = await CartItems.findOne({where: {userId, productId}})
    if(!cartItem){
      return res.status(404).json({error: "Product not found in your cart"})
    }

    await cartItem.destroy()
    res.status(200).json({message: "Product removed from cart successfully!"})

  } catch(err){
    res.status(500).json({error: err.message})
  }
})







module.exports = router