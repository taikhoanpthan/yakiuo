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
    // Snapshot of the live quantity at the start of the current month.
    initialQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // The baseline is renewed at the beginning of each calendar month.
    baselineMonth: {
      type: String,
      default: "",
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    monthlyBalances: [{
      month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
      initialQuantity: { type: Number, required: true, min: 0 },
      currentQuantity: { type: Number, required: true, min: 0 },
      updatedAt: { type: Date, default: Date.now },
    }],
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
    stockHistory: [{
      action: {
        type: String,
        enum: ["decrement", "stocktake"],
        required: true,
      },
      amount: { type: Number, required: true },
      previousQuantity: { type: Number, required: true, min: 0 },
      resultingQuantity: { type: Number, required: true, min: 0 },
      performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      performedAt: { type: Date, default: Date.now },
      notes: { type: String, default: "", trim: true, maxlength: 500 },
    }],
  },
  {
    timestamps: true,
  },
);

inventoryItemSchema.pre("save", function () {
  // Existing documents are assigned a monthly baseline on their next request.
  if (this.initialQuantity === undefined || this.initialQuantity === null) {
    this.initialQuantity = this.quantity;
  }
  if (this.quantity <= 0) {
    this.status = "out_of_stock";
  } else if (this.quantity <= (this.minQuantity || 5)) {
    this.status = "low_stock";
  } else {
    this.status = "in_stock";
  }
});

module.exports = mongoose.model("InventoryItem", inventoryItemSchema);
