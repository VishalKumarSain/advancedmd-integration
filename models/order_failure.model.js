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
      default: null,
    },
    note_id: {
      type: String,
      required: false,
      default: null,
    },
    absolute_patient_id: {
      type: String,
      required: false,
      default: null,
    },
    physician_id: {
      type: String,
      required: false,
      default: null,
    },
    patient_first_name: {
      type: String,
      required: false,
      default: null,
    },
    patient_last_name: {
      type: String,
      required: false,
      default: null,
    },
    patient_email: {
      type: String,
      required: false,
      default: null,
    },
    failure_reason: {
      type: String,
      default: "",
    },
    template_id: {
      type: Number,
      required: true,
      default: null,
    },
  },
  { timestamps: true }
);

const Failed_order = model("failed_order", failed_order_schema);
module.exports = Failed_order;
