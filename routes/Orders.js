const express = require("express")
const router =  express.Router()
const verifyToken = require("../middlewares/verifyToken")
const {Orders, OrderItems, CartItems, Products, sequelize} = require("../models")
const Stripe = require("stripe")
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)



// STEP 1: Create a PaymentIntent (call this before checkout)
// Frontend calls this to get a clientSecret for Stripe.js
router.post("/create-payment-intent", verifyToken, async (req, res) => {
  try{
    const userId = req.user.id

    const cartItems = await CartItems.findAll({
      where: { userId },
      include: [{ model: Products }]
    })

    if(cartItems.length === 0){
      return res.status(404).json({ error: "Cart is empty" })
    }

    const totalPrice = cartItems.reduce((acc, item) => {
      return acc + Number(item.Product.price * item.quantity)
    }, 0)

    for (const item of cartItems) {
      if (item.Product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for "${item.Product.name}"` })
      }
    }

    // Stripe expects amount in the smallest currency unit (cents)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100),
      currency: "usd",
      metadata: { userId: String(userId) }
    })

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      totalPrice
    })

  } catch(err){
    res.status(500).json({error: err.message})
  }
})






// STEP 2: Confirm order after Stripe payment succeeds on the frontend
// Frontend calls this with the paymentIntentId once payment is confirmed
router.post("/", verifyToken, async (req, res) => {
  try{
    const userId = req.user.id
    const { paymentIntentId } = req.body
    if(!paymentIntentId){
      return res.status(400).json({ error: "paymentIntentId is required" })
    }
    // Verify the payment actually succeeded with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if(paymentIntent.status !== "succeeded"){
      return res.status(400).json({ error: "Payment has not been completed" })
    }

    if(paymentIntent.metadata.userId !== String(userId)) {
      return res.status(403).json({ error: "Payment intent does not belong to this user" })
    }

    // Guard against replaying the same paymentIntentId
    const existing = await Orders.findOne({
      where: { stripePaymentIntentId: paymentIntentId}
    })
    if(existing){
      return res.status(409).json({ error: "Order already created for this payment" })
    }
    const cartItems = await CartItems.findAll({
      where: {userId},
      include: [{ model: Products }]
    })
    if(cartItems.length === 0){
      return res.status(404).json({ error: "Cart is empty" })
    }
    const totalPrice = cartItems.reduce((acc, item) => {
      return acc + (item.Product.price * item.quantity)
    }, 0)

    await sequelize.transaction(async (t) => {
      const order = await Orders.create({
        userId,
        totalPrice,
        status: "paid",
        paymentMethod: paymentIntent.payment_method_types?.[0] ?? "card",
        stripePaymentIntentId: paymentIntentId
      }, {transaction: t})
    
      for (const item of cartItems) {
        if(item.Product.stock < item.quantity){
          throw new Error(`Insufficient stock for "${item.Product.name}"`)
        }
        await OrderItems.create({
          quantity: item.quantity,
          priceAtPurchase: item.Product.price,
          orderId: order.id,
          productId: item.Product.id
        }, {transaction: t})
        await item.Product.decrement("stock", { by: item.quantity, transaction: t })
      }

      await CartItems.destroy({ where: { userId }, transaction: t })

      res.status(201).json(order)
    
    })    
  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({ error: err.message })
    }
    res.status(500).json({ error: err.message })
  }
})






// GET /orders — order history (unchanged)
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const orderList = await Orders.findAll({
      where: { userId },
      include: [{ model: OrderItems, include: [{ model: Products }] }]
    })
    res.status(200).json(orderList)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})






// GET /orders/:orderId — specific order (unchanged)
router.get("/:orderId", verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params
    const userId = req.user.id
    const order = await Orders.findOne({
      where: { userId, id: orderId },
      include: [{ model: OrderItems, include: [{ model: Products }] }]
    })
    if (!order) return res.status(404).json({ error: "Order not found" })
    res.status(200).json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})






// PATCH /orders/:orderId — cancel order (unchanged)
router.patch("/:orderId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { orderId } = req.params
    const order = await Orders.findOne({
      where: { userId, id: orderId },
      include: [{ model: OrderItems }]
    })
    if (!order) return res.status(404).json({ error: "Order not found" })
    if (order.status !== "paid") {
      return res.status(400).json({ error: "This order cannot be cancelled anymore" })
    }


    await sequelize.transaction(async (t) => {
      await order.update({ status: "cancelled" }, { transaction: t })

      for (const item of order.OrderItems) {
        await Products.increment("stock", { by: item.quantity, where: { id: item.productId }, transaction: t })
      }
    })
    res.status(200).json({ message: "The order was cancelled" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})




module.exports = router