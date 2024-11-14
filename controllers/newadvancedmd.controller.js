const axios = require("axios");
const { get_advanced_md_token } = require("../helpers/access_token");

exports.full_absolute_create_order_flow = async (req, res) => {
  try {
    // Retrieve token for AdvancedMD API
    // const token = await get_advanced_md_token();
    const token = "990039ea51d36d7a15450db403c53fffe7bc16dae7160aeb768b9fb61f47604173fcd3";

    // Prepare data for initial request
    const get_ehr_data = JSON.stringify({
      ppmdmsg: {
        "@action": "getehrtemplates",
        "@class": "api",
        "@msgtime": new Date().toISOString(),
        "@nocookie": "0",
        template: {
            "@templatename": "TemplateName",
            "@templatetype": "TemplateType",
            "@templatetypeid": "TemplateTypeID",
            "@defaultcategory": "DefaultCategory",
            "@defaultcategoryid": "DefaultCategoryID",
            "@isactive": "IsActive"
        },
        page: {
          "@pagename": "PageName",
        },
        field: {
          "@fieldname": "FieldName",
          "@defaultvalue": "DefaultValue",
        },
      },
    });

    // Config for AdvancedMD request
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      headers: {
        Cookie: `token=${token}`,
        "Content-Type": "application/json",
      },
      data : get_ehr_data,
    };

    // Make initial API request to get template data
    const response = await axios.request(config);
    console.log("response.data.PPMDResults.Results.templatelist.template===",response.data.PPMDResults.Results.templatelist.template);

    const templates = response.data.PPMDResults.Results.templatelist.template.map(template => ({
      id: template["@id"],
      templatename: template["@templatename"],
      templatetype: template["@templatetype"],
      defaultcategory: template["@defaultcategory"],
      isactive: template["@isactive"],
    }));


    console.log("templates====",templates);
    
    

    // Process each template
    for (const template of templates) {
      await processTemplate(template, token);
    }

    res.status(200).json({ status: true, message: "Data processed successfully" });
  } catch (error) {
    console.error("Error:", error.response?.data?.PPMDResults?.Error || error.message);
    res.status(500).json({ status: false, error: "Data processing failed" });
  }
};

// Helper function to process each template
const processTemplate = async (template, token) => {
  const ehrUpdateData = JSON.stringify({
    ppmdmsg: {
      "@action": "getehrupdatednotes",
      "@class": "api",
      "@msgtime": new Date().toISOString(),
      "@templateid": template.id,
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
    //   console.log("ehrResponse.data.PPMDResults.Results.patientnotelist?.patientnote===",ehrResponse.data.PPMDResults.Results.patientnotelist?.patientnote);
      const notes = Array.isArray(ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote)
        ? ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote
        : [ehrResponse?.data?.PPMDResults?.Results?.patientnotelist?.patientnote];
    
        // console.log("notes====",notes);
        
        if(notes && notes?.length){
            for (const note of notes) {
                
                if (note["@signedbyuser"] && note["@signedbyuser"] !=="") {
                  console.log("note====",note);
                await handlePatientData(note, token);
              }
            }
        }
  }
};

// Helper function to handle patient data processing
const handlePatientData = async (note, token) => {
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
  const patient = demographicResponse.data.PPMDResults.Results.patientlist.patient;

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
      country: patient.address["@countrycode"],
    },
  };

  console.log("patientData====",patientData);
  
  if (!patientData.email) throw new Error("Missing email for patient");

  const absoluteRxData = await checkOrCreatePatientInAbsoluteRX(patientData);
  const products = extractProducts(note.pagelist.page.fieldlist.field);


  const filteredData = note.pagelist.page.fieldlist.field.filter(
    item => item['@name'] && !item['@name'].startsWith('Unitialed')
  );
  const physician_id =  filteredData.find(item => item['@name'] === 'provider_id')?.['@value'] || ''
  const ship_to_clinic=  filteredData.find(item => item['@name'] === 'ship_to')?.['@value'] === 'Patient' ? "0" : "1"

  const orderPayload = {
    patient_id: note["@patientid"],
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
  const orderData = {
    patient_id: note["@patientid"],
    physician_id: "1931",
    ship_to_clinic: 0,
    service_type: "two_day",
    signature_required: 1,
    memo: "Test memo",
    // external_id: "testing4",
    products: [
      {
        sku: 14328,
        quantity: 5,
        refills: 1,
        days_supply: 10,
        sig: "Use as directed",
      },
    ],
  };
  const response = await axios.post(create_order_url, orderData, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log("Order Payload:", orderPayload);
};

// Helper function to check or create patient in Absolute RX
const checkOrCreatePatientInAbsoluteRX = async (patientData) => {
  const url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}&email=${patientData.email}`;
  const existingPatient = await axios.get(url, { headers: { "Content-Type": "application/json" } });

  console.log("existingPatient===",existingPatient?.data.data);

  //TODO: 
  
  if (!existingPatient?.data?.data?.length) {
    console.log("Inside if cond patient does not exists");
    
    const createPatientUrl = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;

    //we will create patient
    // await axios.post(createPatientUrl, patientData, {
    //   headers: { "Content-Type": "application/json" },
    // });
  }
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
