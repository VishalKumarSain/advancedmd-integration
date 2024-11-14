const { Schema, Types, model } = require("mongoose");

const failed_order_schema = new Schema(
  {
    template_name: {
      type: String,
      required: true,
    },
    advancedmd_patient_id: {
      type: String,
      required: false,
    },
    note_id: {
      type: String,
      required: false,
    },
    failure_reason: {
      type: String,
      default: "",
    },
    template_id: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const Failed_order = model("failed_order", failed_order_schema);
module.exports = Failed_order;
