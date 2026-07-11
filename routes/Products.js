const express = require("express")
const router = express.Router()
const {Products} = require("../models")
const { Op } = require("sequelize")


//get products
router.get("/", async (req, res) => {
  try{
    const {minPrice, maxPrice, category, search, inStock, page, limit, sort} = req.query
    const min = minPrice !== undefined ? Number(minPrice) : undefined
    const max = maxPrice !== undefined ? Number(maxPrice) : undefined

    if((min !== undefined && Number.isNaN(min)) || (max !== undefined && Number.isNaN(max))){
      return res.status(400).json({error: "minPrice and maxPrice must be numbers"})
    }

    const where = {}

    if (category && category !== "false") {
      const categories = Array.isArray(category) ? category : [category]
      where.category = categories.length > 1 ? {[Op.in]: categories} : categories[0]
    }
    if (search) where.name = {[Op.like]: `%${search}%`}
    if (inStock === "true" || inStock === true || inStock === "on") where.stock = {[Op.gt]: 0}
    if (min !== undefined || max !== undefined){
      where.price = {
        ...(min !== undefined && {[Op.gte]: min}),
        ...(max !== undefined && {[Op.lte]: max})
      }
    }

    const currentPage = Math.max(1, +page || 1)
    const pageSize = Math.min(100, Math.max(1, +limit || 24))
    const offset = (currentPage - 1) * pageSize
    const order = [["price", sort === "desc" ? "DESC" : "ASC"]]

    const products = await Products.findAll({where, limit: pageSize, offset, order})
    res.status(200).json(products)
  } catch(err){
    res.status(500).json({error: err.message})
  }
})


// get detailed product
router.get("/:id", async(req, res) => {
  try{
    const {id} = req.params
    if(!Number.isInteger(+id)) {
      return res.status(400).json({error: "Invalid product ID"})
    }
    const product = await Products.findByPk(id)
    if(!product){
      return res.status(404).json({error: "Product not found"})
    }
    res.status(200).json(product)
  } catch(err){
    res.status(500).json({error: err.message})
  }
})






module.exports = router