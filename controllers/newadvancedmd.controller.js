const axios = require("axios");
const { get_advanced_md_token } = require("../helpers/access_token");
const { checkOrCreatePatientInAbsoluteRX } = require("./absoluterxorder.controller");
const EHR_TEMPLATE = require("../models/ehrtemplates.model");
const Failed_order = require("../models/order_failure.model");

exports.full_absolute_create_order_flow = async (req, res) => {
  try {
    // Retrieve token for AdvancedMD API
    // const token = await get_advanced_md_token();
    const token = "990039ea51d36d7a15450db403c53fffe7bc16dae7160aeb768b9fb61f47604173fcd3";
    const templates =  await EHR_TEMPLATE.find({template_id : {$in : [100044027]}})
    console.log("templates====",templates);
    if(templates.length){
      // Process each template
      for (const template of templates) {
        if(template?.template_id == 100044027 ){// THIS IS ABSOLUTERX TEMPLATE ID
          console.log("template====",template);
          await processTemplate(template, token, );
        }else{
          const save_failed_order = await Failed_order.create(
            {
              template_name: template.template_name,
              failure_reason: "Template id is not valid",
              template_id: template.template_id,
            }
          )
          return
        }
      }
    }

    return res.status(200).json({ status: true, message: "Data processed successfully" });
  } catch (error) {
    console.error("Error:", error.response?.data?.PPMDResults?.Error || error.message);
    return res.status(500).json({ status: false, error: "Data processing failed" });
  }
};

// Helper function to process each template
const processTemplate = async (template, token) => {
  const ehrUpdateData = JSON.stringify({
    ppmdmsg: {
      "@action": "getehrupdatednotes",
      "@class": "api",
      "@msgtime": new Date().toISOString(),
      "@templateid": template.template_id,
      "@datechanged": "2024-10-01",
      "@nocookie": "0",
      "patientnote": {
        "@templatename": "TemplateName",
        "@notedatetime": "NoteDatetime",
        "@username": "UserName",
        "@signedbyuser": "signedbyuser",
        "@patientid": "patientid",
        "@createdat": "CreatedAt",
        "@comments": "Comments",
        "@patientcomment": "PatientComment",
        "@confidential": "Confidential",
        "@printedat": "PrintedAt",
        "@changedat": "ChangedAt",
        "@profileid": "ProfileID",
        "@departmentid": "DepartmentID",
        "@templatetypeid": "TemplateTypeID",
        "@categoryid": "CategoryID",
        "@minutes": "Minutes",
        "@holdflag": "HoldFlag",
        "@priorityflag": "PriorityFlag",
        "@assistantflag": "AssistantFlag",
        "@clinicalsummaryflag": "ClinicalSummaryFlag",
        "@icd": "ICD",
        "@updatedatetime": "UpdateDatetime"
      },
      "page": {
        "@pagename": "PageName"
      },
      "field": {
        "@ordinal": "Ordinal",
        "@name": "FieldName",
        "@value": "Value"
      }
    },
  });

  const ehrConfig = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
    headers: {
      Cookie: `token=${token}`,
      "Content-Type": "application/json",
    },
    data: ehrUpdateData,
  };

  const ehrResponse = await axios.request(ehrConfig);
  
  if(ehrResponse?.data?.PPMDResults?.Results?.patientnotelist){
    // console.log("ehrResponse.data.PPMDResults.Results.patientnotelist?.patientnote===",ehrResponse.data.PPMDResults.Results.patientnotelist?.patientnote);
    const notes = Array.isArray(ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote) ? ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote : [ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote];
    console.log("notes.length====",notes.length);
        
    if(notes && notes?.length){
      for (const note of notes) {
        if (note["@signedbyuser"] && note["@signedbyuser"] !=="") {
          console.log("note====",note);
          console.log("note.pagelist.page.fieldlist.field.length====",note.pagelist.page.fieldlist.field.length);
          await handlePatientData(note, token, template);
        }
      }
    }else{
      //IF NO UPDATED NOTES ARE FOUND THEN WE SKIP THIS TEMPLATE AND JUMP TO THE NEXT TEMPLATE
      return
    }
  }
};

// Helper function to handle patient data processing
const handlePatientData = async (note, token, template) => {
  const demographicData = JSON.stringify({
    ppmdmsg: {
      "@action": "getdemographic",
      "@class": "api",
      "@msgtime": new Date().toISOString(),
      "@patientid": note["@patientid"],
      "@nocookie": "0",
    },
  });

  const demographicConfig = {
    method: "post",
    maxBodyLength: Infinity,
    url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
    headers: {
      Cookie: `token=${token}`,
      "Content-Type": "application/json",
    },
    data: demographicData,
  };

  const demographicResponse = await axios.request(demographicConfig);
  
  //IF PATIENT NOT FOUND ON ADVANCEDMD THEN WE SAVE THE ERROR AND RETURN THE PROCESS
  if(!demographicResponse?.data?.PPMDResults?.Results?.patientlist?.patient){
    console.log(`Patient not found on advancedmd of patientid - note["@patientid"]`);
    
    const save_failed_order = await Failed_order.create(
      {
        template_name: template.template_name,
        failure_reason: `Patient is not found on advancedmd using("getdemographic"). And the patient id was ${note["@patientid"]} `,
        template_id: template.template_id,
      }
    )
    return
  }
  const patient = demographicResponse?.data?.PPMDResults?.Results?.patientlist?.patient;
  console.log(" patient.contactinfo===", patient.contactinfo);
  
  const patientData = {
    name: patient["@name"],
    email: patient.contactinfo["@email"],
    phone_number: patient.contactinfo["@homephone"],
    dob: patient["@dob"],
    gender: patient["@sex"],
    address: {
      street: patient.address["@address1"],
      street2: patient.address["@address2"],
      city: patient.address["@city"],
      state: patient.address["@state"],
      zip: patient.address["@zip"],
      country: patient.address["@countrycode"] || "USA",
    },
  };

  console.log("patientData===",patientData);
  
  let failure_reason = "";
  if(!patientData.name){
    failure_reason += "Patient name is not given in advancedmd response. We are using advancedmd 'getdemographic'. "
  }

  if(!patientData.email){
    failure_reason += "Patient email is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData.phone_number){
    failure_reason += "Patient phone number is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData.dob){
    failure_reason += "Patient dob is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData.gender){
    failure_reason += "Patient gender is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData.address){
    failure_reason += "Patient address is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData?.address?.street){
    failure_reason += "Patient address street is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData?.address?.city){
    failure_reason += "Patient address city is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData?.address?.state){
    failure_reason += "Patient address state is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData?.address?.zip){
    failure_reason += "Patient address zip is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }

  if(!patientData?.address?.country){
    failure_reason += "Patient address country is not given in advancedmd response. We are using advancedmd 'getdemographic' api. "
  }
  
  if(failure_reason !== ""){
    const save_failed_order = await Failed_order.create(
      {
        template_name: template.template_name,
        failure_reason: failure_reason,
        template_id: template.template_id,
      }
    )
    return
  }

  const absoluteRxData = await checkOrCreatePatientInAbsoluteRX(patientData, template);
  console.log("absoluteRxData====",absoluteRxData);
  
  if(!absoluteRxData.status){
        // Optionally log or store the failed order in a database for further review
        await Failed_order.create({
          template_name: template.template_name,
          failure_reason: absoluteRxData.message,
          template_id: template.template_id,
        });
    return
  }
  const products = extractProducts(note.pagelist.page.fieldlist.field);
  console.log("products===",products);
  
  if(!products.length){
    // Optionally log or store the failed order in a database for further review
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: "Products are empty OR not available on advancedmd",
      template_id: template.template_id,
      advancedmd_patient_id: note["@patientid"]
    });
    return
}

  const filteredData = note.pagelist.page.fieldlist.field.filter(
    item => item['@name'] && !item['@name'].startsWith('Unitialed')
  );
  const physician_id =  filteredData.find(item => item['@name'] === 'provider_id')?.['@value'] || ''
  const ship_to_clinic=  filteredData.find(item => item['@name'] === 'ship_to')?.['@value'] === 'Patient' ? "0" : "1"


  if(!physician_id || physician_id==""){
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: "Physician id is not given by advancedmd response. We are using advancedmd 'GetEhrUpdatedNotes' api",
      template_id: template.template_id,
      advancedmd_patient_id: note["@patientid"]
    });
    return
  }
  const orderPayload = {
    patient_id: absoluteRxData.data.id,
    physician_id,
    ship_to_clinic: ship_to_clinic,
    service_type: "two_day",
    signature_required: "1",
    memo: "Test memo",
    external_id: "testing450",
    products: products
  };

  console.log("orderPayload====",orderPayload);
  
  return 

  const create_order_url = `https://portal.absoluterx.com/api/clinics/orders?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
  // const orderData = {
  //   patient_id: note["@patientid"],
  //   physician_id: "1931",
  //   ship_to_clinic: 0,
  //   service_type: "two_day",
  //   signature_required: 1,
  //   memo: "Test memo",
  //   // external_id: "testing4",
  //   products: [
  //     {
  //       sku: 14328,
  //       quantity: 5,
  //       refills: 1,
  //       days_supply: 10,
  //       sig: "Use as directed",
  //     },
  //   ],
  // };
  const response = await axios.post(create_order_url, orderPayload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log("Order Payload:", orderPayload);
};



// Helper function to extract product data from fields
const extractProducts = (fields) => {
  const products = [];
  const productGroups = {};

  fields.filter(field => field["@name"] && !field["@name"].startsWith("Unitialed")).forEach(field => {
    const name = field["@name"];
    const value = field["@value"];
    const index = name.match(/_(\d+)$/)?.[1];

    if (index) {
      if (!productGroups[index]) productGroups[index] = {};
      if (name.includes("sku_no")) productGroups[index].sku = value;
      if (name.includes("quantity_no")) productGroups[index].quantity = value;
      if (name.includes("refill_no")) productGroups[index].refills = value || "0";
      if (name.includes("instructions_no")) productGroups[index].sig = value || "Use as directed";
    }
  });

  for (const index in productGroups) {
    products.push({ ...productGroups[index], days_supply: "30" });
  }

  return products;
};
