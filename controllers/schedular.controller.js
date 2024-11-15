const { get_advanced_md_token } = require("../helpers/access_token");
const EHR_TEMPLATE = require("../models/ehrtemplates.model");
const Failed_order = require("../models/order_failure.model");

exports.advancedmd_scheduler = async () => {
  try {
    // Retrieve token for AdvancedMD API
    const token = await get_advanced_md_token();
    // RETRIEVE TOKEN FOR ADVANCEDMD API (HARDCODED FOR NOW FOR TESTING)
    // const token = "990039632a3e5ca3ef41c3a402f5c5832b36bdc5ef64e2fc8c9b5104e9732aa2d9554e";

    // FETCH TEMPLATES FROM DATABASE WHERE TEMPLATE ID IS IN THE SPECIFIED ARRAY
    const templates = await EHR_TEMPLATE.find({
      template_id: { $in: [100044027] },
    });
    console.log("templates====", templates);

    // CHECK IF ANY TEMPLATES WERE FOUND
    if (templates.length) {
      // PROCESS EACH TEMPLATE IN THE LIST
      for (const template of templates) {
        // CHECK IF TEMPLATE ID MATCHES ABSOLUTERX TEMPLATE ID (100044027)
        if (template?.template_id == 100044027) {
          console.log("template====", template);

          // CALL FUNCTION TO PROCESS TEMPLATE DATA
          await processTemplate(template, token);
        } else {
          // LOGIC FOR INVALID TEMPLATE ID: SAVE FAILED ORDER DETAILS TO DATABASE
          const save_failed_order = await Failed_order.create({
            template_name: template.template_name,
            failure_reason: "Template id is not valid",
            template_id: template.template_id,
          });

          // STOP PROCESSING IF TEMPLATE ID IS INVALID
          return;
        }
      }
    }
  } catch (error) {
    // HANDLE ERRORS AND LOG SPECIFIC ERROR MESSAGES FROM RESPONSE IF AVAILABLE
    console.error(
      "Error:",
      error.response?.data?.PPMDResults?.Error || error.message
    );
  }
};
