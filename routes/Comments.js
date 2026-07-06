const express = require("express")
const router = express.Router()
const {Comments, Products, Users} = require("../models")
const verifyToken = require("../middlewares/verifyToken")


// create a comment
router.post("/:productId", verifyToken, async (req, res) => {
  try{
    const userId = req.user.id
    const {commentBody, rating} = req.body
    const {productId} = req.params
    const product = await Products.findByPk(productId)
    if(!product){
      return res.status(404).json({error: "No product found"})
    }
    const existingComment = await Comments.findOne({
      where: {productId, userId}
    })
    if(existingComment){
      return res.status(400).json({error: "You have already reviewed the product"})
    }

    // const productReviewCount = product.reviewCount
    await product.increment("reviewCount")
    await product.reload()
    const newAvgRating = ((product.rating * (product.reviewCount - 1)) + rating) / product.reviewCount
    await product.set({rating: newAvgRating})
    await product.save()


    const newComment = await Comments.create({commentBody, rating, productId, userId})
    const commentWithUser = await Comments.findByPk(newComment.id, {
      include: [
        {model: Users, attributes: ["id", "role", "username", "email"]}
      ]
    })

    res.status(201).json(commentWithUser)
  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({error: err.message})
    }
    res.status(500).json({error: err.message})
  }
})




// get all comments
router.get("/:productId", async (req, res) => {
  try{
    const {productId} = req.params
    const comments = await Comments.findAll({
      where: {productId},
      include: [{model: Users, attributes: ["email", "username", "role"]}]
    })
    res.status(200).json(comments)
  } catch(err){
    res.status(500).json({error: err.message})
  }
})


// delete comments
router.delete("/:commentId", verifyToken, async (req, res) => {
  try{
    const {commentId} = req.params
    const userId = req.user.id
    const role = req.user.role

    const comment = await Comments.findByPk(commentId)
    if(!comment){
      return res.status(404).json({error: "Comment not found"})
    }
    if(userId !== comment.userId && role !== "admin"){
      return res.status(403).json({error: "You cannot delete others' comments"})
    }
    
    
    await comment.destroy()
    res.status(200).json({message: "Comment deleted successfully!"})

  } catch(err){
    res.status(500).json({error: err.message})
  }
})



// edit a comment
router.patch("/:commentId", verifyToken, async (req, res) => {
  try{
    const {commentId} = req.params
    const userId = req.user.id
    const {comentBody} = req.body

    const comment = await Comments.findByPk(commentId)
    if(!comment){
      return res.status(404).json({error: "Comment not found"})
    }
    if(userId !== comment.userId){
      return res.status(403).json({error: "Cannot edit others' comments"})
    }
    

    await comment.update({comentBody})
    res.status(200).json(comment);

  } catch(err){
    if(err.name === "SequelizeValidationError"){
      return res.status(400).json({error: err.message})
    }
    res.status(500).json({error: err.message})
  }
})





module.exports = router