const router = require("express").Router();
const ctrl = require("../controllers/rating.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/", protect, ctrl.create);
router.get("/public", ctrl.getPublic);
router.get("/", protect, ctrl.getAll);
router.get("/:id", protect, ctrl.getById);
router.delete("/:id", protect, ctrl.remove);

module.exports = router;