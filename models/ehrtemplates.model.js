const { Schema, Types, model } = require("mongoose");

const ehrtemplates_schema = new Schema(
  {
    template_name: {
      type: String,
      required: true,
    },
    template_type: {
      type: String,
      required: true,
    },
    template_is_active: {
      type: Boolean,
      required: true,
    },
    template_id: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const EHR_TEMPLATE = model("ehr_template", ehrtemplates_schema);
module.exports = EHR_TEMPLATE;
