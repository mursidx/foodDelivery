const express = require("express");
const router = express.Router();
require("dotenv").config();
const { validateAdmin, userIsLoggedIn } = require("../middlewares/admin");
const { productModel, validateProduct } = require("../models/product");
let { categoryModel, validateCategory } = require("../models/category");
const upload = require("../config/multer_config");
const { cartModel } = require("../models/cart");

router.get("/", userIsLoggedIn, async function (req, res) {
  let somethingInCart = false;
  const resultArray = await productModel.aggregate([
    {
      $group: {
        _id: "$category",
        products: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        products: { $slice: ["$products", 10] },
      },
    },
  ]);

  let cart = await cartModel.findOne({ user: req.session.passport.user });
  if (cart && cart.products.length > 0) {
    somethingInCart = true;
  }

  let rnproducts = await productModel.aggregate([{ $sample: { size: 3 } }]);

  // Convert the array into an object
  const resultObject = resultArray.reduce((acc, item) => {
    acc[item.category] = item.products;
    return acc;
  }, {});

  res.render("index", { products: resultObject, rnproducts, somethingInCart, cartCount: cart.products.length });
});

router.get("/delete/:id", validateAdmin, async function (req, res) {
  if (req.user.admin) {
    let prods = await productModel.findOneAndDelete({ _id: req.params.id });
    return res.redirect("/admin/products");
  }
  res.send("You are not admin and not allowed to delete this product");
});

router.get("/update/:id", validateAdmin, async function (req, res) {
  if (req.user.admin) {
    let prods = await productModel.findOneAndUpdate({ _id: req.params.id });
    return res.redirect("/admin/products");
  }
  res.send("You are not admin and not allowed to delete this product");
});

router.post("/delete", validateAdmin, async function (req, res) {
  if (req.user.admin) {
    let prods = await productModel.findOneAndDelete({
      _id: req.body.product_id,
    });
    return res.redirect("back");
  }
  res.send("You are not admin and not allowed to delete this product");
});

router.post("/", upload.single("image"), async function (req, res) {
  let { name, price, category, stock, description, image } = req.body;

  let { error } = validateProduct({
    name,
    price,
    category,
    stock,
    description,
    image,
  });

  if (error) return res.send(error.message);

  let isCategory = await categoryModel.findOne({ name: category });
  if (!isCategory) {
    let categoryCreated = await categoryModel.create({ name: category });
  }

  let product = await productModel.create({
    name,
    price,
    category,
    stock,
    description,
    image: req.file.buffer,
  });

  res.redirect("/admin/products");
});

module.exports = router;
