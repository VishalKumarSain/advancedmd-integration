const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const { get_advanced_md_token } = require("../helpers/access_token");
const { checkOrCreatePatientInAbsoluteRX, createOrderAbsoluteRXHelper } = require("./absoluterxorder.controller");
const EHR_TEMPLATE = require("../models/ehrtemplates.model");
const Failed_order = require("../models/order_failure.model");

exports.full_absolute_create_order_flow = async (req, res) => {
  try {
    // Retrieve token for AdvancedMD API
    // const token = await get_advanced_md_token();
    // RETRIEVE TOKEN FOR ADVANCEDMD API (HARDCODED FOR NOW FOR TESTING)
        const token = "990039632a3e5ca3ef41c3a402f5c5832b36bdc5ef64e2fc8c9b5104e9732aa2d9554e";

        // FETCH TEMPLATES FROM DATABASE WHERE TEMPLATE ID IS IN THE SPECIFIED ARRAY
        const templates = await EHR_TEMPLATE.find({ template_id: { $in: [100044027] } });
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
    
        // SEND SUCCESS RESPONSE IF ALL DATA PROCESSED SUCCESSFULLY
        return res.status(200).json({ status: true, message: "Data processed successfully" });
      } catch (error) {
        // HANDLE ERRORS AND LOG SPECIFIC ERROR MESSAGES FROM RESPONSE IF AVAILABLE
        console.error("Error:", error.response?.data?.PPMDResults?.Error || error.message);
    
        // SEND ERROR RESPONSE WITH GENERIC ERROR MESSAGE
        return res.status(500).json({ status: false, error: "Data processing failed" });
      }
    };

// HELPER FUNCTION TO PROCESS EACH TEMPLATE
const processTemplate = async (template, token) => {
  // PREPARE DATA FOR EHR UPDATE REQUEST AS JSON STRING
  const ehrUpdateData = JSON.stringify({
    ppmdmsg: {
      "@action": "getehrupdatednotes",
      "@class": "api",
      "@msgtime": new Date().toISOString(), // CURRENT DATE AND TIME
      "@templateid": template.template_id, // USE TEMPLATE ID FROM DATABASE
      "@datechanged": "2024-10-01", // DATE OF LAST UPDATE REQUESTED
      "@nocookie": "0",
      "patientnote": {
        "@templatename": "TemplateName",
        "@notedatetime": "NoteDatetime",
        "@username": "UserName",
        "@signedbyuser": "signedbyuser", // IDENTIFY WHO SIGNED THE NOTE
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

  // CONFIGURATION FOR AXIOS REQUEST TO EHR API
  const ehrConfig = {
    method: "post",
    maxBodyLength: Infinity, // ALLOW LARGE REQUEST BODY SIZE
    url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
    headers: {
      Cookie: `token=${token}`, // TOKEN FOR AUTHORIZATION
      "Content-Type": "application/json",
    },
    data: ehrUpdateData,
  };

  // SEND REQUEST TO EHR API AND GET RESPONSE
  const ehrResponse = await axios.request(ehrConfig);
  console.log("ehrResponse?.data?.PPMDResults?.Error===",ehrResponse?.data?.PPMDResults?.Error);
  

  // CHECK IF RESPONSE HAS PATIENT NOTES LIST
  if (ehrResponse?.data?.PPMDResults?.Results?.patientnotelist) {
    // CHECK IF PATIENT NOTE LIST IS AN ARRAY, IF NOT CONVERT IT TO ARRAY
    const notes = Array.isArray(ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote) 
      ? ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote 
      : [ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote];
    console.log("notes.length====", notes.length);

    // IF NOTES EXIST AND HAVE LENGTH, PROCESS EACH NOTE
    if (notes && notes?.length) {
      for (const note of notes) {
        // CHECK IF NOTE IS SIGNED BY USER
        if (note["@signedbyuser"] && note["@signedbyuser"] !== "") {
          console.log("note====", note);
          console.log("note.pagelist.page.fieldlist.field.length====", note.pagelist.page.fieldlist.field.length);

          // HANDLE PATIENT DATA BASED ON THE NOTE CONTENT
          await handlePatientData(note, token, template);
        }
      }
    } else {
      // IF NO UPDATED NOTES FOUND, SKIP THIS TEMPLATE AND MOVE TO THE NEXT
      return;
    }
  }
};

// HELPER FUNCTION TO HANDLE PATIENT DATA PROCESSING
const handlePatientData = async (note, token, template) => {
  try {
  // CHECK IF PATIENT ID EXISTS IN NOTE; IF NOT, LOG FAILURE AND RETURN
  if (!note["@patientid"]) {
    console.log("Patient id not found from advancedmd note");
    const save_failed_order = await Failed_order.create({
      template_name: template.template_name,
      failure_reason: "Patient id not found from advancedmd note",
      template_id: template.template_id,
      note_id: note["@id"]
    });
    return;
  }

  // PREPARE REQUEST DATA FOR GETTING DEMOGRAPHIC INFORMATION FROM ADVANCEDMD
  const demographicData = JSON.stringify({
    ppmdmsg: {
      "@action": "getdemographic",
      "@class": "api",
      "@msgtime": new Date().toISOString(),
      "@patientid": note["@patientid"],
      "@nocookie": "0",
    },
  });

  // CONFIGURE AXIOS REQUEST FOR DEMOGRAPHIC DATA
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

  // SEND REQUEST TO ADVANCEDMD AND RECEIVE DEMOGRAPHIC RESPONSE
  let demographicResponse;
  try {
    // ATTEMPT TO GET DEMOGRAPHIC DATA
    demographicResponse = await axios.request(demographicConfig);
  } catch (error) {
    console.error("Failed to fetch demographic data", error.message);
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: "Failed to fetch demographic data: " + error.message,
      template_id: template.template_id,
      note_id: note["@id"],
      advancedmd_patient_id: note["@patientid"],
    });
    return;
  }

  // IF PATIENT NOT FOUND IN ADVANCEDMD, LOG FAILURE AND RETURN
  if (!demographicResponse?.data?.PPMDResults?.Results?.patientlist?.patient) {
    const save_failed_order = await Failed_order.create({
      template_name: template.template_name,
      failure_reason: `Patient is not found on advancedmd using("getdemographic"). And the patient id was ${note["@patientid"]} `,
      template_id: template.template_id,
      note_id: note["@id"]
    });
    return;
  }

  // EXTRACT PATIENT DATA FROM RESPONSE
  const patient = demographicResponse?.data?.PPMDResults?.Results?.patientlist?.patient;
  const numericPhoneNumber = patient.contactinfo["@homephone"].replace(/\D/g, "");
  const nameParts = patient["@name"].split(",");
  const lastName = nameParts[0] || "";
  const firstAndMiddleNames = (nameParts[1] || "").trim().split(" ");
  const firstName = firstAndMiddleNames[0] || "";
  const middleName = firstAndMiddleNames.slice(1).join(" ") || "";
  
  // ORGANIZE PATIENT DATA IN A STRUCTURED FORMAT
  const patientData = {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    name: patient["@name"],
    email: patient.contactinfo["@email"],
    phone_number: numericPhoneNumber,
    dob: patient["@dob"],
    gender: patient["@sex"] === "M" ? "Male" : patient["@sex"] === "F" ? "Female" : "",
    address: {
      street: patient.address["@address1"],
      street2: patient.address["@address2"],
      city: patient.address["@city"],
      state: patient.address["@state"],
      zip: patient.address["@zip"],
      country: patient.address["@countrycode"] || "USA",
    },
  };

  console.log("patientData===", patientData);

  // CHECK FOR MISSING DATA IN PATIENT INFORMATION
  let failure_reason = "";
  if (!patientData.first_name) {
    failure_reason += "Patient first_name is not given in advancedmd response. We are using advancedmd 'getdemographic'. ";
  }
  if (!patientData.last_name) {
    failure_reason += "Patient last_name is not given in advancedmd response. We are using advancedmd 'getdemographic'. ";
  }
  if (!patientData.email) {
    failure_reason += "Patient email is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData.phone_number) {
    failure_reason += "Patient phone number is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData.dob) {
    failure_reason += "Patient dob is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData.gender) {
    failure_reason += "Patient gender is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData.address) {
    failure_reason += "Patient address is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData?.address?.street) {
    failure_reason += "Patient address street is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData?.address?.city) {
    failure_reason += "Patient address city is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData?.address?.state) {
    failure_reason += "Patient address state is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData?.address?.zip) {
    failure_reason += "Patient address zip is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }
  if (!patientData?.address?.country) {
    failure_reason += "Patient address country is not given in advancedmd response. We are using advancedmd 'getdemographic' api. ";
  }

  // IF ANY REQUIRED DATA IS MISSING, SAVE FAILURE AND RETURN
  if (failure_reason !== "") {
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: failure_reason,
      template_id: template.template_id,
      note_id: note["@id"],
      advancedmd_patient_id: note["@patientid"],
      patient_email: patientData?.email,
      patient_first_name: patientData?.first_name,
      patient_last_name: patientData?.last_name,
    });
    return;
  }
   
  if(template.template_name.includes("Hallandale")){
     let orderSet={
      message:{
      },
      order: {

      }
     }
    const ship_to_clinic = filteredData.find(item => item['@name'] === 'ship_to')?.['@value'] === 'Patient' ? "0" : "1";
    const npi = filteredData.find(item => item['@name'] === 'npi')?.['@value'] || '';
    if(!npi){
      await Failed_order.create({
        template_name: template.template_name,
        failure_reason: "NPI is not given in advancedmd response. We are using advancedmd GetEhrUpdatedNotes",
        template_id: template.template_id,
        note_id: note["@id"],
        advancedmd_patient_id: note["@patientid"],
        patient_email: patientData?.email,
        patient_first_name: patientData?.first_name,
        patient_last_name: patientData?.last_name,
      });
    }

    orderSet.message =  {
      id: uuidv4()   //REQUIRED
      // "sentTime": "2024-10-24T12:30:00Z" //OPTIONAL
    }
    orderSet.order.practice = {
      id: 993314  //REQUIRED 
    }
    orderSet.order.patient  = {
      lastName: patientData.last_name,  //REQUIRED
      firstName:patientData.first_name,  //REQUIRED
      middleName: patientData.middle_name, //OPTIONAL
      gender: patientData.gender === "Male" ? "M" : patientData.gender === "Female" ? "F" : "",
      dateOfBirth: patientData.dob , //REQUIRED
      address1: patientData.address.street,  //OPTIONAL
      address2: patientData.address.street2,  //OPTIONAL
      city:patientData.address.city, //OPTIONAL
      state: patientData.address.state, //OPTIONAL
      zip: patientData.address.zip, //OPTIONAL
      country:  patientData.address.country, //OPTIONAL
      phoneHome: patientData.phone_number, //OPTIONAL
      email: patientData.email //OPTIONAL
    }
    orderSet.order.shipping = {
      recipientType: ship_to_clinic, //OPTIONAL
      recipientLastName: patientData.last_name, //OPTIONAL
      recipientFirstName: patientData.first_name, //OPTIONAL
      recipientPhone: patientData.phone_number, //OPTIONAL
      recipientEmail: patientData.email, //OPTIONAL
      addressLine1: patientData.address.street, //OPTIONAL
      city: patientData.address.city, //OPTIONAL
      state: patientData.address.state, //OPTIONAL
      zipCode: patientData.address.zip, //OPTIONAL
      country: patientData.address.country //OPTIONAL
      //   "service": 2 //OPTIONAL
    }

    orderSet.order.prescriber = {
      npi: npi, //REQUIRED
      //   "licenseState": "CA",  //OPTIONAL
      //   "licenseNumber": "LIC1234567890",  //OPTIONAL
      //   "dea": "AB1234567",  //OPTIONAL
      "lastName": "vishal", //REQUIRED
      "firstName": "kumar"  //REQUIRED
      //   "middleName": "A",  //OPTIONAL
      //   "address1": "123 Main St",  //OPTIONAL
      //   "address2": "Suite 4B", //OPTIONAL
      //   "city": "Los Angeles", //OPTIONAL
      //   "state": "CA", //OPTIONAL
      //   "zip": "90001", //OPTIONAL
      //   "phone": "(123) 456-7890", //OPTIONAL
      //   "fax": "(123) 456-7891", //OPTIONAL
      //   "email": "mailto:john.smith@example.com" //OPTIONAL
    }
  
    orderSet.order.rxs = extractProductsForLifeFile(note.pagelist.page.fieldlist.field)
    // [
    //   {
    //     drugName: filteredData.find(item => item['@name'] === 'Unitialed1')?.['@value'] || "TIRZEPATIDE 20MG/ml (3ML) INJECTION", // REQUIRED
    //     drugStrength: filteredData.find(item => item['@name'] === 'drug_strength_1')?.['@value'] || "1ml (2.5mg/ml)", // Optional
    //     quantity: filteredData.find(item => item['@name'] === 'drug_quantity_1')?.['@value'] || "1"
    //   },
    //   {
    //     drugName: filteredData.find(item => item['@name'] === 'drug_name_2')?.['@value'] || "SEMAGLUTIDE 10MG/4ML INJECTION", // REQUIRED
    //     drugStrength: filteredData.find(item => item['@name'] === 'drug_strength_2')?.['@value'] || "1ml (2.5mg/ml)", // Optional
    //     quantity: filteredData.find(item => item['@name'] === 'drug_quantity_2')?.['@value'] || "1"
    //   }
    // ]
  }
  // CHECK OR CREATE PATIENT IN ABSOLUTERX AND LOG IF FAILURE OCCURS
  const absoluteRxData = await checkOrCreatePatientInAbsoluteRX(patientData, template);
  if (!absoluteRxData.status) {
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: absoluteRxData.message,
      template_id: template.template_id,
      note_id: note["@id"],
      advancedmd_patient_id: note["@patientid"],
      patient_email: patientData?.email,
      patient_first_name: patientData?.first_name,
      patient_last_name: patientData?.last_name,
    });
    return;
  }

  // EXTRACT PRODUCT DETAILS FROM NOTE
  const products = extractProducts(note.pagelist.page.fieldlist.field);
  console.log("products===", products);

  // IF NO PRODUCTS ARE AVAILABLE, SAVE FAILURE AND RETURN
  if (!products.length) {
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: "Products are empty OR not available on advancedmd",
      template_id: template.template_id,
      note_id: note["@id"],
      advancedmd_patient_id: note["@patientid"],
      patient_email: patientData?.email,
      patient_first_name: patientData?.first_name,
      patient_last_name: patientData?.last_name,
    });
    return;
  }

  // FILTER DATA TO OBTAIN PHYSICIAN ID AND SHIPPING DETAILS
  const filteredData = note.pagelist.page.fieldlist.field.filter(
    item => item['@name'] && !item['@name'].startsWith('Unititled')
  );
  const physician_id = filteredData.find(item => item['@name'] === 'provider_id')?.['@value'] || '';
  const ship_to_clinic = filteredData.find(item => item['@name'] === 'ship_to')?.['@value'] === 'Patient' ? "0" : "1";

  // IF PHYSICIAN ID IS MISSING, SAVE FAILURE AND RETURN
  if (!physician_id || physician_id == "") {
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: "Physician id is not given by advancedmd response. We are using advancedmd 'GetEhrUpdatedNotes' api",
      template_id: template.template_id,
      note_id: note["@id"],
      advancedmd_patient_id: note["@patientid"],
      patient_email: patientData?.email,
      patient_first_name: patientData?.first_name,
      patient_last_name: patientData?.last_name,
    });
    return;
  }

  // PREPARE ORDER PAYLOAD FOR ABSOLUTERX
  const orderPayload = {
    patient_id: absoluteRxData.data.id,
    physician_id,
    ship_to_clinic: ship_to_clinic,
    service_type: "two_day",
    signature_required: "1",
    memo: "Test memo",
    external_id: uuidv4(),
    products: products,
  };

  // ADDITIONAL DATA FOR LOGGING OR TRACKING PURPOSES
  const additional_data = {
    template_id: template.template_id,
    note_id: note["@id"],
    advancedmd_patient_id: note["@patientid"]
  };
  console.log("additional_data====", additional_data);
  console.log("orderPayload====", orderPayload);

  try {
    // SEND ORDER PAYLOAD TO ABSOLUTERX
    const orderResponse = await createOrderAbsoluteRXHelper(orderPayload, template, additional_data);
    console.log("Order response:", orderResponse);
    if(!orderResponse.status){
      await Failed_order.create({
        template_name: template.template_name,
        failure_reason: orderResponse.message,
        template_id: template.template_id,
        advancedmd_patient_id: note["@patientid"],
        patient_email: patientData?.email,
        patient_first_name: patientData?.first_name,
        patient_last_name: patientData?.last_name,
        physician_id,
      });
    }
  } catch (error) {
    console.error("Failed to create order in AbsoluteRX", error.message);
    await Failed_order.create({
      template_name: template.template_name,
      failure_reason: "Error creating order: " + error.message,
      template_id: template.template_id,
      advancedmd_patient_id: note["@patientid"],
      patient_email: patientData?.email,
      patient_first_name: patientData?.first_name,
      patient_last_name: patientData?.last_name,
    });
  }

} catch (error) {
  console.error("Unexpected error in handlePatientData", error.message);
  await Failed_order.create({
    template_name: template.template_name,
    failure_reason: "Unexpected error: " + error.message,
    template_id: template.template_id,
    note_id: note["@id"]
  });
}
};




const extractProducts = (fields) => {
  const products = [];
  const productGroups = {};

  // FILTER THROUGH FIELDS AND ORGANIZE PRODUCT DATA BY INDEX
  fields
    .filter(field => field["@name"] && !field["@name"].startsWith("Unititled"))
    .forEach(field => {
      const name = field["@name"];
      const value = field["@value"];
      const index = name.match(/_(\d+)$/)?.[1]; // EXTRACT INDEX FROM FIELD NAME

      // IF AN INDEX EXISTS, ORGANIZE PRODUCT DATA INTO GROUPS
      if (index) {
        if (!productGroups[index]) productGroups[index] = {};
        if (name.includes("sku_no")) productGroups[index].sku = value;
        if (name.includes("quantity_no")) productGroups[index].quantity = value;
        if (name.includes("refill_no")) productGroups[index].refills = value || "0";
        if (name.includes("instructions_no")) productGroups[index].sig = value || "Use as directed";
      }
    });

  // LOOP THROUGH EACH PRODUCT GROUP, ADDING MISSING DEFAULTS WHERE NECESSARY
  for (const index in productGroups) {
    products.push({
      ...productGroups[index],
      days_supply: "30",
      sig: productGroups[index].sig || "Use as directed" // SET DEFAULT SIG IF MISSING
    });
  }

  return products;
};

const extractProductsForLifeFile = (fields) => {
  const products = [];
  const productGroups = {};

  // FILTER THROUGH FIELDS AND ORGANIZE PRODUCT DATA BY INDEX
  fields
    .filter(field => field["@name"] && !field["@name"].startsWith("Untitled"))
    .forEach(field => {
      const name = field["@name"];
      const value = field["@value"];
      const index = name.match(/_(\d+)$/)?.[1]; // EXTRACT INDEX FROM FIELD NAME

      // IF AN INDEX EXISTS, ORGANIZE PRODUCT DATA INTO GROUPS
      if (index) {
        if (!productGroups[index]) productGroups[index] = {};
        if (name.includes("npi")) productGroups[index].npi = value;
        if (name.includes("sku_no")) productGroups[index].sku = value;
        if (name.includes("quantity_no")) productGroups[index].quantity = value;
        if (name.includes("refill_no")) productGroups[index].refills = value || "0";
        if (name.includes("instructions_no")) productGroups[index].sig = value || "Use as directed";
      }
    });

  // LOOP THROUGH EACH PRODUCT GROUP, ADDING MISSING DEFAULTS WHERE NECESSARY
  for (const index in productGroups) {
    products.push({
      ...productGroups[index],
      days_supply: "30",
      sig: productGroups[index].sig || "Use as directed" // SET DEFAULT SIG IF MISSING
    });
  }

  return products;
};



module.exports ={
  processTemplate
}
