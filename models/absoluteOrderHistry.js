const { Schema, Types, model } = require("mongoose");

const absolute_schema = new Schema(
  {
    template_name: {
      type: String,
      required: true,
    },
    frist_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    order_id: {
      type: Number,
      required: true,
    },
    patient_id: {
      type: Number,
      required: false,
    },
    physician_id: {
      type: Number,
      required: true,
    },
    template_id: {
      type: Number,
      required: true,
    },
    notes_id: {
      type: Number,
    },
    advancemd_patient_id: {
      type: Number,
    },
    order_status: {
      type: String,
    },
  },
  { timestamps: true }
);

const AbsoluteOrderInfo = model("absolute_order_histry", absolute_schema);
module.exports = {AbsoluteOrderInfo};
