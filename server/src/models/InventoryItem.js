const mongoose = require("mongoose");

const inventoryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      default: "cái",
      trim: true,
      maxlength: 30,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "Dụng cụ chung",
      trim: true,
      maxlength: 60,
    },
    location: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    minQuantity: {
      type: Number,
      default: 5,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock",
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
    lastCheckedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

inventoryItemSchema.pre("save", function () {
  if (this.quantity <= 0) {
    this.status = "out_of_stock";
  } else if (this.quantity <= (this.minQuantity || 5)) {
    this.status = "low_stock";
  } else {
    this.status = "in_stock";
  }
});

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
