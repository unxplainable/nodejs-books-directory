const express = require("express");

const authController = require("../controllers/auth");
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.post("/signup", authController.postSignup);

router.post("/login", authController.postLogin);

router.delete("/user/:userId", isAuth, authController.deleteUser);

module.exports = router;