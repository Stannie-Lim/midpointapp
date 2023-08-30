const router = require("express").Router();
const axios = require("axios");
require("dotenv").config();

module.exports = router;

// root route is '/api'

router.get("/", async (req, res, next) => {
  res.send("/api route");
});

router.get("/bars/:lat/:lng/:radius", async (req, res, next) => {
  const { lat, lng, radius } = req.params;
  const token = process.env.YELP_API_KEY;

  const url = `https://api.yelp.com/v3/businesses/search?latitude=${lat}&longitude=${lng}&radius=2218&categories=bars&sort_by=best_match&limit=50`;

  try {
    const response = await axios.get(url, {
      headers: { Authorization: token },
    });

    res.send(response.data);
  } catch (error) {
    next(error);
  }
});

router.use("/schools", require("./routes/schools"));
