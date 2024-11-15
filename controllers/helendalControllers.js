const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

const { get_advanced_md_token } = require("../helpers/access_token");
const { checkOrCreatePatientInAbsoluteRX, createOrderAbsoluteRXHelper } = require("./absoluterxorder.controller");
const EHR_TEMPLATE = require("../models/ehrtemplates.model");
const Failed_order = require("../models/order_failure.model");

exports.full_helendal_create_order_flow = async (req, res) => {
  try {
    // Retrieve token for AdvancedMD API
    // const token = await get_advanced_md_token();
    const token = "990039651b54c810fe4d8591978d9f5ab73885580709811ad5185fe9a1d4ffe0cefdb3";
    const templates =  await EHR_TEMPLATE.find({template_id : {$in : [100044028]}})
    console.log("templates====",templates);
    if(templates.length){
      // Process each template
      for (const template of templates) {
        if(template?.template_id == 100044028 ){// THIS IS ABSOLUTERX TEMPLATE ID
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
    console.log("call processTemplate")
  const ehrUpdateData = JSON.stringify({
    ppmdmsg: {
      "@action": "getehrupdatednotes",
      "@class": "api",
      //"@msgtime": new Date().toISOString(),
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
  console.log("ehrResponse?.data?.PPMDResults?.Results?.patientnotelist",ehrResponse?.data?.PPMDResults)
  if(ehrResponse?.data?.PPMDResults?.Results?.patientnotelist){
     console.log("ehrResponse.data.PPMDResults.Results.patientnotelist?.patientnote===",ehrResponse.data.PPMDResults.Results.patientnotelist?.patientnote);
     const notes = Array.isArray(ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote) ? ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote : [ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote];
    console.log("notes.length====",notes.length);
       
    if(notes && notes?.length){
      for (const note of notes) {
        if (note["@signedbyuser"] && note["@signedbyuser"] !=="") {
         // console.log("note====",note);
         // console.log("note.pagelist.page.fieldlist.field.length====",note.pagelist.page.fieldlist.field.length);
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
    console.log("call handlePatientData",note["@patientid"])
  const demographicData = JSON.stringify({
    ppmdmsg: {
      "@action": "getdemographic",
      "@class": "api",
      "@msgtime": '4/1/2021 2:16:55 PM',//new Date().toISOString(),
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
 // console.log("🚀 ~ handlePatientData ~ demographicResponse:", demographicResponse.data?.PPMDResults?.Results.patientlist?.patient)

  //IF PATIENT NOT FOUND ON ADVANCEDMD THEN WE SAVE THE ERROR AND RETURN THE PROCESS
  if(!demographicResponse?.data?.PPMDResults?.Results?.patientlist?.patient){
    // console.log(`Patient not found on advancedmd of patientid - note["@patientid"]`);
    
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
  // console.log(" patient.contactinfo===", patient.contactinfo);
  
   const numericPhoneNumber = patient.contactinfo["@homephone"].replace(/\D/g, "");
  const patientData = {
    first_name :patient["@name"].split(",")[1], 
    middle_name: "",
    last_name : patient["@name"].split(",")[0],
    name: patient["@name"],
    email: patient.contactinfo["@email"],
    phone_number: numericPhoneNumber,
    dob: patient["@dob"],
    gender: patient["@sex"] == "M" ? "Male" : "Female",
    address: {
      street: patient.address["@address1"],
      street2: patient.address["@address2"],
      city: patient.address["@city"],
      state: patient.address["@state"],
      zip: patient.address["@zip"],
      country: patient.address["@countrycode"] || "USA",
    },
  };

  //console.log("patientData===",patientData);

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
  
  //uncomment karna hai -deepak
//   if(failure_reason !== ""){
//     const save_failed_order = await Failed_order.create(
//       {
//         template_name: template.template_name,
//         failure_reason: failure_reason,
//         template_id: template.template_id,
//       }
//     )
//     return
//   }

//   const absoluteRxData = await checkOrCreatePatientInAbsoluteRX(patientData, template);
//   // console.log("absoluteRxData====",absoluteRxData);
  
//   if(!absoluteRxData.status){
//         // Optionally log or store the failed order in a database for further review
//         await Failed_order.create({
//           template_name: template.template_name,
//           failure_reason: absoluteRxData.message,
//           template_id: template.template_id,
//         });
//     return
//   }
      //console.log("note.pagelist",note.pagelist)
     
      await processPageData(note)
  //console.log("products===",products);

//   if(!products.length){
//     // Optionally log or store the failed order in a database for further review
//     await Failed_order.create({
//       template_name: template.template_name,
//       failure_reason: "Products are empty OR not available on advancedmd",
//       template_id: template.template_id,
//       advancedmd_patient_id: note["@patientid"]
//     });
//     return
// }

};

  const processPageData = (data) => {
    const pagelist = data.pagelist;
     console.log("pagelist",pagelist)
    if (pagelist && pagelist.page) {
      const fieldlist = pagelist.page.fieldlist;
      if (fieldlist && Array.isArray(fieldlist)) {
        processFields(fieldlist);
      } else if (fieldlist && typeof fieldlist === 'object') {
        processFields([fieldlist]); 
      }
    }
  };
  
  const processFields = (fieldlist) => {
    const filteredData = [];
    fieldlist.forEach(item => {
      if (item.field && Array.isArray(item.field)) {
        item.field.forEach(fieldItem => {
          if (fieldItem['@name'] && !fieldItem['@name'].startsWith('Untitled')) {
            filteredData.push(fieldItem); 
          }
        });
      }
    });
     console.log("filteredData==============================",filteredData)
    const result = {
      message: {
        id: "12345637884" 
      },
      order: {
        prescriber: {
          npi: filteredData.find(item => item['@name'] === 'npi')?.['@value'] || '',
          lastName: filteredData.find(item => item['@name'] === 'lastName')?.['@value'] || '',
          firstName: filteredData.find(item => item['@name'] === 'firstName')?.['@value'] || ''
        },
        practice: {
          id: filteredData.find(item => item['@name'] === 'practice_id')?.['@value'] || '993314' // REQUIRED
        },
        patient: {
          lastName: filteredData.find(item => item['@name'] === 'patient_lastName')?.['@value'] || '',
          firstName: filteredData.find(item => item['@name'] === 'patient_firstName')?.['@value'] || '',
          gender: filteredData.find(item => item['@name'] === 'patient_gender')?.['@value'] || 'm', // Optional, default to 'f'
          dateOfBirth: filteredData.find(item => item['@name'] === 'patient_dob')?.['@value'] || '1980-01-01' // REQUIRED
        },
        shipping: {
          recipientType: filteredData.find(item => item['@name'] === 'shipping_recipientType')?.['@value'] || 'patient',
          recipientLastName: filteredData.find(item => item['@name'] === 'shipping_recipientLastName')?.['@value'] || '',
          recipientFirstName: filteredData.find(item => item['@name'] === 'shipping_recipientFirstName')?.['@value'] || '',
          recipientPhone: filteredData.find(item => item['@name'] === 'shipping_recipientPhone')?.['@value'] || '',
          recipientEmail: filteredData.find(item => item['@name'] === 'shipping_recipientEmail')?.['@value'] || '',
          addressLine1: filteredData.find(item => item['@name'] === 'shipping_addressLine1')?.['@value'] || '',
          city: filteredData.find(item => item['@name'] === 'shipping_city')?.['@value'] || '',
          state: filteredData.find(item => item['@name'] === 'shipping_state')?.['@value'] || '',
          zipCode: filteredData.find(item => item['@name'] === 'shipping_zipCode')?.['@value'] || '',
          country: filteredData.find(item => item['@name'] === 'shipping_country')?.['@value'] || '',
          //service: filteredData.find(item => item['@name'] === 'shipping_service')?.['@value'] || 2
        },
        // billing: {
        //   payorType: filteredData.find(item => item['@name'] === 'billing_payorType')?.['@value'] || 'pat' // Optional, default to 'pat'
        // },
        rxs: [
          {
            drugName: filteredData.find(item => item['@name'] === 'Unitialed1')?.['@value'] || "TIRZEPATIDE 20MG/ml (3ML) INJECTION", // REQUIRED
            drugStrength: filteredData.find(item => item['@name'] === 'drug_strength_1')?.['@value'] || "1ml (2.5mg/ml)", // Optional
            quantity: filteredData.find(item => item['@name'] === 'drug_quantity_1')?.['@value'] || "1"
          },
          {
            drugName: filteredData.find(item => item['@name'] === 'drug_name_2')?.['@value'] || "SEMAGLUTIDE 10MG/4ML INJECTION", // REQUIRED
            drugStrength: filteredData.find(item => item['@name'] === 'drug_strength_2')?.['@value'] || "1ml (2.5mg/ml)", // Optional
            quantity: filteredData.find(item => item['@name'] === 'drug_quantity_2')?.['@value'] || "1"
          }
        ]
      }
    };
  
   console.log(result);
  };
//   helendal()