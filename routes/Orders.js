const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { Orders, OrderItems, CartItems, Products, sequelize } = require("../models");
const stripe = require("../config/stripe");


router.post("/create-payment-intent", verifyToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cartItems = await CartItems.findAll({
      where: { userId },
      include: [{ model: Products }],
    });

    if (cartItems.length === 0) {
      return res.status(400).json({ error: "Your cart is empty" });
    }

    let totalPrice = 0;
    const cartSnapshot = [];

    for (const item of cartItems) {
      if (!item.Products) {
        return res.status(400).json({ error: "One of the products in your cart no longer exists" });
      }
      if (item.quantity > item.Products.stock) {
        return res.status(400).json({error: `Only ${item.Products.stock} of "${item.Products.name}" in stock`});
      }
      totalPrice += Number(item.Products.price) * item.quantity;
      cartSnapshot.push({
        productId: item.Products.id,
        quantity: item.quantity,
      });
    }

    const amountInCents = Math.round(totalPrice * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: {
        userId: String(userId),
        cart: JSON.stringify(cartSnapshot),
      },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    next(err)
  }
});


// webhook 
// the webhook receives POST request from stripe once the payment is successful.
router.post("/webhook", async (req, res, next) => {
  let event;
  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  if (event.type !== "payment_intent.succeeded") {
    return res.status(200).json({ received: true });
  }

  const paymentIntent = event.data.object;

  try {
    const existingOrder = await Orders.findOne({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (existingOrder) {
      return res.status(200).json({ received: true });
    }

    const userId = paymentIntent.metadata.userId;
    const cartSnapshot = JSON.parse(paymentIntent.metadata.cart);

    const t = await sequelize.transaction();
    try {
      const order = await Orders.create({
        userId,
        totalPrice: paymentIntent.amount / 100,
        status: "paid",
        stripePaymentIntentId: paymentIntent.id,
      }, { transaction: t });

      for (const item of cartSnapshot) {
        const product = await Products.findByPk(item.productId, { transaction: t });
        if (!product) continue;

        await OrderItems.create({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          priceAtPurchase: product.price,
        }, { transaction: t });

        await product.decrement("stock", { by: item.quantity, transaction: t });
      }

      await CartItems.destroy({ where: { userId }, transaction: t });
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    next(err)
  }
});


// get every order's history
router.get("/", verifyToken, async (req, res, next) => {
  try{
    const userId = req.user.id

    const orders = await Orders.findAll({
      where: {userId},
      include: [{model: OrderItems}]
    })

    res.status(200).json(orders)

  } catch(err){
    next(err)
  }
})


// get specific order's history
router.get("/:id", verifyToken, async (req, res, next) => {
  try{
    const userId = req.user.id
    const {id} = req.params
    if(!Number.isInteger(+id)){
      return res.status(400).json({error: "Order ID must be a number"})
    }

    const detailedOrder = await Orders.findOne({
      where: {id, userId},
      include: [{model: OrderItems}]
    })

    if(!detailedOrder){
      return res.status(404).json({error: "The order was not found"})
    }

    res.status(200).json(detailedOrder)

  } catch(err){
    next(err)
  }
})


// cancel order
router.patch("/cancel/:id", verifyToken, async (req, res, next) => {
  try{
    const userId = req.user.id
    const {id} = req.params
    if(!Number.isInteger(+id)){
      return res.status(400).json({error: "Order ID must be a number"})
    }

    const order = await Orders.findOne({where: {id, userId}})
    if(!order){
      return res.status(404).json({error: "The order was not found"})
    }

    if(order.status === "paid"){
      order.status = "cancelled"
      await order.save()
      return res.status(200).json({message: "The order was cancelled", order})
    } else{
      return res.status(400).json({error: "Cannot cancel shipped or delivered product"})
    }

  } catch(err){
    next(err)
  }
})



module.exports = router;
