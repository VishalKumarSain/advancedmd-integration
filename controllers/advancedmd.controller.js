const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

var parseString = require("xml2js").parseString;

const { get_advanced_md_token } = require("../helpers/access_token");
const {
  transformPatientData,
  transMedicationtData,
} = require("../helpers/data_extract");
const EHR_TEMPLATE = require("../models/ehrtemplates.model");

exports.getPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Missing required patientId.",
      });
    }

    const token = await get_advanced_md_token();

    const axios = require("axios");
    let data = JSON.stringify({
      ppmdmsg: {
        "@action": "getdemographic",
        "@class": "api",
        "@msgtime": "4/1/2021 2:16:55 PM",
        "@patientid": patientId,
        "@nocookie": "0",
      },
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      headers: {
        Cookie: `token=${token}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios
      .request(config)
      .then((response) => {
        // Log the raw response data
        console.log("Raw response data:", response.data);

        // Check if patientlist is already in JSON format
        const patientList = response?.data?.PPMDResults?.Results?.patientlist?.patient;
        // if (typeof patientList === "object") {
        //   console.log("returnder in if");
          // const data = transformPatientData(patientList);

          // Directly return patient data if it's already an object
          return res.status(200).json({
            success: true,
            data: patientList, // Return as JSON
          });
        // }
      })
      .catch((error) => {
        console.error(
          "Error fetching patient data:",
          error.response?.data || error.message
        );
        return res.status(500).json({
          success: false,
          message: "Error fetching patient data.",
          error: error.message,
        });
      });
  } catch (error) {
    console.error(
      "Error fetching patient data:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Error fetching patient data.",
      error: error.message,
    });
  }
};

exports.getPatientMedication = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Missing required patientId.",
      });
    }

    const token = await get_advanced_md_token();

    const axios = require("axios");
    let data = JSON.stringify({
      ppmdmsg: {
        "@action": "getehrmedications",
        "@class": "api",
        // "@msgtime": "4/1/2021 2:16:55 PM",
        "@patientid": patientId,
        // "@iscurrent": "-1",
        "@nocookie": "0",
        drug: {
          "@drugname": "DrugName",
          "@drugstrength": "DrugStrength",
          "@doseform": "DoseForm",
          "@frequency": "Frequency",
          "@refills": "Refills",
          "@doctor": "Doctor",
          "@startdate": "StartDate",
          "@quantity": "Quantity",
          "@duration": "Duration",
          "@prescribingnpi": "PrescribingNPI",
          "@presctype": "PrescType",
          "@signedby": "SignedBy",
        },
      },
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      headers: {
        Cookie: `token=${token}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    axios
      .request(config)
      .then((response) => {
        // Check if druglist is already in JSON format
        const drugList = response?.data?.PPMDResults?.Results?.druglist;
        if (typeof drugList === "object") {
          const data = transMedicationtData(drugList);
          return res.status(200).json({
            success: true,
            data: data, // Return as JSON
          });
        }

        // If it is still a string, proceed to parse it
        parseString(drugList, (err, result) => {
          if (err) {
            console.error("Error parsing XML response:", err);
            return res.status(500).json({
              success: false,
              message: "Error parsing XML response.",
              error: err.message,
            });
          }

          // Access the JSON data from the parsed result
          const patientData = result.ppmdmsg; // Adjust the path based on actual XML structure
          console.log(JSON.stringify(patientData)); // Log or process the patient data

          return res.status(200).json({
            success: true,
            data: data,
          });
        });
        return res.status(200).json({
          success: true,
          data: response.data, // Return as JSON
        });
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.error(
      "Error fetching patient data:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Error fetching patient data.",
      error: error.message,
    });
  }
};


exports.getPatientAdvancedmd = async (req, res) => {
  try {
    // Define the initial request data to get updated patients
    const requestData = JSON.stringify({
      ppmdmsg: {
        "@action": "getupdatedpatients",
        "@class": "api",
        "@msgtime": "11/11/2024 2:16:55 PM",
        "@datechanged": "11/12/2024 2:16:55 AM",
        "@nocookie": "0",
        "patient": {
          "@name": "",
          "@ssn": "SSN",
          "@changedat": "ChangedAt",
          "@createdat": "CreatedAt",
          "@hipaarelationship": "HipaaRelationship",
        },
        "referralplan": {
          "@reason": "Reason",
          "@referraltype": "ReferralType",
          "@defaultinchargeentry": "DefaultinChargeEntry",
          "@byreferringproviderfid": "ByReferringProviderFID",
          "@toreferringproviderfid": "ToReferringProviderFID",
        },
      },
    });

    // Configuration for the initial request
    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      headers: {
        Cookie: "token=990039f2eae4ecfe2f405ea0f760f36dec57e42f12dca025b80a26b424d69e1e4a7a8a",
        "Content-Type": "application/json",
      },
      data: requestData,
    };

    // Fetch the patient list
    const patientListResponse = await axios.request(config);
    let patients = patientListResponse.data?.PPMDResults?.Results?.patientlist?.patient;

    const patient_list_resp = []
    console.log("patientListResponse.data?.PPMDResults.Results.patientlist.patient===",patientListResponse.data?.PPMDResults.Results.patientlist.patient);
    
    if( typeof patientListResponse.data?.PPMDResults.Results.patientlist.patient == "object"){
      patient_list_resp.push(patientListResponse.data?.PPMDResults.Results.patientlist.patient)
    }else if(Array.isArray(patientListResponse.data?.PPMDResults?.Results?.patientlist?.patient)){
      patient_list_resp.push(...patientListResponse.data?.PPMDResults.Results.patientlist.patient)
    }
    // return
    if (!patient_list_resp || patient_list_resp.length === 0) {
      return res.status(404).json({ success: false, message: "No patients found!" });
    }
    console.log("patient_list_resp.length====",patient_list_resp.length);

    // Fetch demographic details for each patient concurrently
    const demographicRequests = patient_list_resp.map((pt) => {
      const demographicData = JSON.stringify({
        ppmdmsg: {
          "@action": "getdemographic",
          "@class": "api",
          "@patientid": pt["@id"],
          "@nocookie": "0",
        },
      });

      const demographicConfig = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
        headers: {
          Cookie: "token=990039f2eae4ecfe2f405ea0f760f36dec57e42f12dca025b80a26b424d69e1e4a7a8a",
          "Content-Type": "application/json",
        },
        data: demographicData,
      };

      return axios.request(demographicConfig).then((response) => {
        const demographicData = response.data?.PPMDResults?.Results?.patientlist?.patient || {};

        // console.log("demographicData====",demographicData);
        
        
        return {
          id: pt["@id"],
          // demographic: demographicData || null, 
          name : demographicData["@name"],
          ssn : demographicData["@ssn"],
          title : demographicData["@title"],
          prefix : demographicData["@prefix"],
          contactinfo : demographicData.contactinfo,
          dob : demographicData["@dob"],
          respparty : demographicData["@respparty"],
          profile : demographicData["@profile"],
          sex : demographicData["@sex"],
          maritalstatus : demographicData["@maritalstatus"],
          address : demographicData.address,
          previousaddress : demographicData.previousaddress,
          primarycareprovider: demographicData.primarycareprovider || null,  // Primary care provider info (if available)
        };
      });
    });

    // Wait for all demographic requests to complete
    const patientDetails = await Promise.all(demographicRequests);

    // Respond with combined patient data
    return res.status(200).json({
      success: true,
      data: patientDetails,
      message: "Patient data with demographics fetched successfully!",
    });
  } catch (error) {
    console.error("Error fetching patient data:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching patient data.",
      error: error.response?.data || error.message,
    });
  }
};


// exports.getEhrNotes = async (req, res) => {
//   try {
//     const token = await get_advanced_md_token();
//     // console.log("🚀  getEhrNotes  token:", token)
//     let data = JSON.stringify({
//       ppmdmsg: {
//         "@action": "getehrnotes",
//         "@class": "api",
//         "@msgtime": "4/1/2021 2:16:55 PM",
//         "@patientid": "6083481", //6082877 6083235 // ivo 6083481
//         "@templateid": "100044027", //100044028 100044027
//         // "@createdfrom": "10/05/1900",
//         // "@createdto": "2/20/2999",
//         // "@notedatefrom": "2/20/1900",
//         // "@notedateto": "2/20/2999",
//         // "@nocookie": "0",
//         patientnote: {
//           "@templatename": "TemplateName",
//           "@notedatetime": "NoteDatetime",
//           "@username": "UserName",
//           "@signedbyuser": "SignedByUser",
//           "@reviewedbyuser": "ReviewedByUser",
//           "@confidential": "Confidential",
//           "@printedat": "PrintedAt",
//         },
//         field: {
//           "@ordinal": "Ordinal",
//           "@name": "FieldName",
//           "@value": "Value",
//         },
//       },
//     });

//     let config = {
//       method: "post",
//       maxBodyLength: Infinity,
//       url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
//       headers: {
//         Cookie: `token=${token}`,
//         "Content-Type": "application/json",
//         Accept: "application/json",
//       },
//       data: data,
//     };
//     const response = axios.request(config).then((response) => {
//       console.log("🚀  .then  response:", response.data.PPMDResults.Results.patientnotelist.patientnote);
//       // parseXmlToJson(response.data.PPMDResults.Results.patientnotelist.patientnote)
//       let rowData = response.data.PPMDResults.Results.patientnotelist.patientnote;
//       let pagelist = rowData.pagelist;
//       let page = pagelist.page;
//       let fieldlist = page.fieldlist;
//       let field = fieldlist.field;
//       let tamplateName = rowData["@templatename"];
//       // let json_response =  parseXmlToJson(response.data.PPMDResults)
//       // console.log("🚀  .then  json_response:", json_response)

//       //console.log("🚀  .then  tamplateName:", tamplateName)
//       //console.log("🚀  .then  field:", field)
//       const filteredData = field.filter((item) => item["@name"] && !item["@name"].startsWith("Unitialed"));

//       //console.log(filteredData);
//       // Extract product details using regex
//       const products = [];
//       const productGroups = {}; // Temporary object to group product fields by dynamic index

//       filteredData.forEach((item) => {        
//         const name = item["@name"];
//         const value = item["@value"];

//         // Match the pattern to extract the dynamic index (e.g., 10, 3, etc.)
//         const match = name.match(/_(\d+)$/);
//         if (match) {
//           const index = match[1]; // Extract dynamic index

//           // Initialize the product entry if it doesn't exist
//           if (!productGroups[index]) productGroups[index] = {};

//           // Populate product details based on field type
//           if (name.includes("sku_no")) productGroups[index].sku = value;
//           if (name.includes("quantity_no")) productGroups[index].quantity = value;
//           if (name.includes("refill_no")) productGroups[index].refills = value || "0";
//           if (name.includes("instructions_num") || name.includes("instructions_no")) {
//             productGroups[index].sig = value || "Use as directed";
//           }
//         }
//       });

//       // Convert productGroups to an array of products
//       for (const index in productGroups) {
//         products.push({
//           ...productGroups[index],
//           days_supply: "30",
//         });
//       }

//       // Create the final object with the products array
//       const result = {
//         patient_id: "99945",
//         physician_id: filteredData.find((item) => item["@name"] === "provider_id")?.["@value"] || "",
//         ship_to_clinic: filteredData.find((item) => item["@name"] === "ship_to")?.["@value"] === "Patient" ? "0" : "1",
//         service_type: "two_day",
//         signature_required: "1",
//         memo: "Test memo",
//         external_id: uuidv4(),
//         products: products,
//       };

//       // Output the result
//       console.log("result===",result);

//       return res.status(200).json({status:false, data:result, message:"success"})
//     });
//   } catch (error) {
//     console.log(
//       "🚀  exports.getEhrNotes=async  error:",
//       error.response.data.PPMDResults.Error
//     );
//   }
// };



exports.getEhrNotes = async (req,res) => {
  try {
    let data = JSON.stringify({
      ppmdmsg: {
        "@action": "getehrnotes",
        "@class": "api",
        "@msgtime": "4/1/2021 2:16:55 PM",
        "@patientid": "6083481",
        "@templateid": "100044028",
        patientnote: {
          "@templatename": "TemplateName",
          "@notedatetime": "NoteDatetime",
          "@username": "UserName",
          "@signedbyuser": "SignedByUser",
          "@reviewedbyuser": "ReviewedByUser",
          "@confidential": "Confidential",
          "@printedat": "PrintedAt"
        },
        field: {
          "@ordinal": "Ordinal",
          "@name": "FieldName",
          "@value": "Value"
        }
      }
    });

    let config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      headers: {
        Cookie: `token=99003935b0b17010e94777b485867187f566109869e6b68745312862de01f532d17296`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      data: data
    };

    const response = await axios.request(config);
    const rowData = response.data.PPMDResults.Results.patientnotelist.patientnote;

    // Ensure rowData can be processed whether it's an array or an object
    const notes = Array.isArray(rowData) ? rowData : [rowData];

    // Iterate over each note
    notes.forEach((note) => {
      console.log("note====",note);
      
      const pagelist = note.pagelist;
      const page = pagelist.page;
      const fieldlist = page.fieldlist;
      const field = fieldlist.field;
      const templateName = note['@templatename'];

      const filteredData = field.filter(
        item => item['@name'] && !item['@name'].startsWith('Unitialed')
      );

      const products = [];
      const productGroups = {}; // Temporary object to group product fields by dynamic index
     console.log("filteredData.length",filteredData.length)

      // Process each field in the filtered data
      filteredData.forEach(item => {
        const name = item['@name'];
        const value = item['@value'];

        const match = name.match(/_(\d+)$/);
        if (match) {
          const index = match[1];

          // Initialize the product entry if it doesn't exist
          if (!productGroups[index]) productGroups[index] = {};

          // Populate product details based on field type
          if (name.includes('sku_no')) productGroups[index].sku = value;
          if (name.includes('quantity_no')) productGroups[index].quantity = value;
          if (name.includes('refill_no')) productGroups[index].refills = value || '0';
          if (name.includes('instructions_num') || name.includes('instructions_no')) {
            productGroups[index].sig = value || "Use as directed";
          }
        }
      });

      // Convert productGroups to an array of products
      for (const index in productGroups) {
        products.push({
          ...productGroups[index],
          days_supply: "30"
        });
      }

      // Create the final object with the products array
      const result = {
        patient_id: note["@patientid"],
        physician_id: filteredData.find(item => item['@name'] === 'provider_id')?.['@value'] || '',
        ship_to_clinic: filteredData.find(item => item['@name'] === 'ship_to')?.['@value'] === 'Patient' ? "0" : "1",
        service_type: "two_day",
        signature_required: "1",
        memo: "Test memo",
        external_id: "testing450",
        products: products
      };

      // Output the result
      console.log(result);
    });
      console.log("🚀  notes.forEach  filteredData:", filteredData)
      console.log("🚀  notes.forEach  filteredData:", filteredData)
      console.log("🚀  notes.forEach  filteredData:", filteredData)
  } catch (error) {
    console.log("🚀  exports.getEhrNotes=async  error:", error.response?.data?.PPMDResults?.Error);
  }
};

exports.getEhrTemplates = async (req, res) => {
  try {
    // const token = await get_advanced_md_token();
    const data = JSON.stringify({
      ppmdmsg: {
        "@action": "getehrtemplates",
        "@class": "api",
        "@msgtime": "4/1/2021 2:16:55 PM",
        "@nocookie": "0",
        template: {
          "@templatename": "TemplateName",
          "@templatetype": "TemplateType",
          "@templatetypeid": "TemplateTypeID",
          "@defaultcategory": "DefaultCategory",
          "@defaultcategoryid": "DefaultCategoryID",
          "@isactive": "IsActive",
        },
        page: {
          "@pagename": "PageName",
          "@pageindex": "PageIndex",
        },
        field: {
          "@ordinal": "Ordinal",
          "@fieldname": "FieldName",
          "@x": "X",
          "@y": "Y",
          "@width": "Width",
          "@height": "Height",
          "@font": "Font",
          "@fontsize": "FontSize",
          "@maxlength": "MaxLength",
          "@defaultvalue": "DefaultValue",
        },
      },
    });

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      headers: {
        Cookie: "token=990039f2eae4ecfe2f405ea0f760f36dec57e42f12dca025b80a26b424d69e1e4a7a8a",
        "Content-Type": "application/json",
      },
      data: data,
    };

    // Make the API request and await the response
    const response = await axios.request(config);

    // Extract and map template data
    const templates = response.data.PPMDResults.Results.templatelist.template.map(
      ({
        "@id": id,
        "@templatename": templatename,
        "@templatetype": templatetype,
        "@defaultcategory": defaultcategory,
        "@defaultcategoryid": defaultcategoryid,
        "@isactive": isactive,
      }) => ({
        id,
        templatename,
        templatetype,
        defaultcategory,
        defaultcategoryid,
        isactive,
      })
    );

    // Loop through each template and check/add to the database
    // for (const element of templates) {
    //   const checkEhrTemplate = await EHR_TEMPLATE.findOne({
    //     template_name: element.templatename,
    //   });
    //   if (!checkEhrTemplate) {
    //     await EHR_TEMPLATE.create({
    //       template_name: element.templatename,
    //       template_type: element.templatetype,
    //       template_id: element.id,
    //     });
    //   }
    // }

    // Send a successful response
    return res.status(200).json({ status: true, data: templates });
  } catch (error) {
    // Handle and log errors
    console.error("🚀 Error fetching EHR templates:", error.message);
    return res.status(400).json({
      status: false,
      message: error.response?.data?.PPMDResults?.Error || error.message,
    });
  }
};



exports.patientSearch = async (req, res) => {
  try {
    // const token = await get_advanced_md_token();

    const axios = require('axios');
let data = '';

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://providerapi.advancedmd.com/api/api-801/TEMP/lookup/patients',
  headers: { 
    'Accept': 'application/json', 
    'Content-Type': 'application/json', 
    'Authorization': 'Bearer 990039f2eae4ecfe2f405ea0f760f36dec57e42f12dca025b80a26b424d69e1e4a7a8a'
  },
  data : data
};



    
    axios.request(config)
    .then((response) => {
      return res.status(200).json({ status: true, data : response.data});

    
    })
    .catch((error) => {
      return res.status(400).json({status:false, data : null, error: error})
    });
    
  } catch (error) {
    console.log(
      "🚀  exports.getEhrTemplates=async  error:",
      error.response.data.PPMDResults.Error
    );
    return res.status(400).json({status:false, message :error.response.data.PPMDResults.Error || error.message})

  }
};


exports.getEhrUpdatedNotes = async (req,res) => {
  try {
    let data = JSON.stringify({
      "ppmdmsg": {
        "@action": "getehrupdatednotes",
        "@class": "api",
        "@msgtime": "4/1/2021 2:16:55 PM",
        "@templateid": "100044028",
        "@datechanged": "11/11/2021",
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
      }
    });
    
    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx',
      headers: { 
        'Cookie': 'token=990039f2eae4ecfe2f405ea0f760f36dec57e42f12dca025b80a26b424d69e1e4a7a8a', 
        'Content-Type': 'application/json'
      },
      data : data
    };
    

    

    const response = await axios.request(config);
    const rowData = response.data.PPMDResults.Results.patientnotelist.patientnote;

    // Ensure rowData can be processed whether it's an array or an object
    const notes = Array.isArray(rowData) ? rowData : [rowData];

    // Iterate over each note
    notes.forEach((note) => {
      if(note["@signedbyuser"] && note["@signedbyuser"] !== ""){
        console.log("note====",note);

        const pagelist = note.pagelist;
        const page = pagelist.page;
        const fieldlist = page.fieldlist;
        const field = fieldlist.field;
        const templateName = note['@templatename'];
        
        const filteredData = field.filter(
          item => item['@name'] && !item['@name'].startsWith('Unitialed')
        );
        
        const products = [];
        const productGroups = {}; // Temporary object to group product fields by dynamic index
        console.log("filteredData.length",filteredData.length)
        
        // Process each field in the filtered data
        filteredData.forEach(item => {
          const name = item['@name'];
          const value = item['@value'];
          
          const match = name.match(/_(\d+)$/);
          if (match) {
            const index = match[1];
            
            // Initialize the product entry if it doesn't exist
            if (!productGroups[index]) productGroups[index] = {};
            
            // Populate product details based on field type
            if (name.includes('sku_no')) productGroups[index].sku = value;
            if (name.includes('quantity_no')) productGroups[index].quantity = value;
            if (name.includes('refill_no')) productGroups[index].refills = value || '0';
            if (name.includes('instructions_num') || name.includes('instructions_no')) {
              productGroups[index].sig = value || "Use as directed";
            }
          }
        });
        
        // Convert productGroups to an array of products
        for (const index in productGroups) {
          products.push({
            ...productGroups[index],
            days_supply: "30"
          });
        }
        
        // Create the final object with the products array
        const result = {
          patient_id: note["@patientid"],
          physician_id: filteredData.find(item => item['@name'] === 'provider_id')?.['@value'] || '',
          ship_to_clinic: filteredData.find(item => item['@name'] === 'ship_to')?.['@value'] === 'Patient' ? "0" : "1",
          service_type: "two_day",
          signature_required: "1",
          memo: "Test memo",
          external_id: "testing450",
          products: products
        };
        
        // Output the result
        console.log(result);
        // return res.status(200).json({status:true, data: result})
      }
    });
 
  } catch (error) {
    console.log("🚀  exports.getEhrNotes=async  error:", error.response?.data?.PPMDResults?.Error);
  }
};




// exports.full_absolute_create_order_flow = async (req,res) => {
//   try {
//     const token = await get_advanced_md_token();

//     const data = JSON.stringify({
//       ppmdmsg: {
//         "@action": "getehrtemplates",
//         "@class": "api",
//         "@msgtime": "4/1/2021 2:16:55 PM",
//         "@nocookie": "0",
//         template: {
//           "@templatename": "TemplateName",
//           "@templatetype": "TemplateType",
//           "@templatetypeid": "TemplateTypeID",
//           "@defaultcategory": "DefaultCategory",
//           "@defaultcategoryid": "DefaultCategoryID",
//           "@isactive": "IsActive",
//         },
//         page: {
//           "@pagename": "PageName",
//           "@pageindex": "PageIndex",
//         },
//         field: {
//           "@ordinal": "Ordinal",
//           "@fieldname": "FieldName",
//           "@x": "X",
//           "@y": "Y",
//           "@width": "Width",
//           "@height": "Height",
//           "@font": "Font",
//           "@fontsize": "FontSize",
//           "@maxlength": "MaxLength",
//           "@defaultvalue": "DefaultValue",
//         },
//       },
//     });

//     const config = {
//       method: "post",
//       maxBodyLength: Infinity,
//       url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
//       headers: {
//         Cookie: `token=${token}`,
//         "Content-Type": "application/json",
//       },
//       data: data,
//     };

//     // Make the API request and await the response
//     const response = await axios.request(config);

//     // Extract and map template data
//     const templates = response.data.PPMDResults.Results.templatelist.template.map(
//       ({
//         "@id": id,
//         "@templatename": templatename,
//         "@templatetype": templatetype,
//         "@defaultcategory": defaultcategory,
//         "@defaultcategoryid": defaultcategoryid,
//         "@isactive": isactive,
//       }) => ({
//         id,
//         templatename,
//         templatetype,
//         defaultcategory,
//         defaultcategoryid,
//         isactive,
//       })
//     );

//     for (const temp of templates) {
      
//       let get_ehr_updates_data = JSON.stringify({
//         "ppmdmsg": {
//           "@action": "getehrupdatednotes",
//           "@class": "api",
//           "@msgtime": "4/1/2021 2:16:55 PM",
//           "@templateid": temp.id,
//           "@datechanged": "11/11/2021",
//           "@nocookie": "0",
//           "patientnote": {
//             "@templatename": "TemplateName",
//             "@notedatetime": "NoteDatetime",
//             "@username": "UserName",
//             "@signedbyuser": "signedbyuser",
//             "@patientid": "patientid",
//             "@createdat": "CreatedAt",
//             "@comments": "Comments",
//             "@patientcomment": "PatientComment",
//             "@confidential": "Confidential",
//             "@printedat": "PrintedAt",
//             "@changedat": "ChangedAt",
//             "@profileid": "ProfileID",
//             "@departmentid": "DepartmentID",
//             "@templatetypeid": "TemplateTypeID",
//             "@categoryid": "CategoryID",
//             "@minutes": "Minutes",
//             "@holdflag": "HoldFlag",
//             "@priorityflag": "PriorityFlag",
//             "@assistantflag": "AssistantFlag",
//             "@clinicalsummaryflag": "ClinicalSummaryFlag",
//             "@icd": "ICD",
//             "@updatedatetime": "UpdateDatetime"
//           },
//           "page": {
//             "@pagename": "PageName"
//           },
//           "field": {
//             "@ordinal": "Ordinal",
//             "@name": "FieldName",
//             "@value": "Value"
//           }
//         }
//       });
      
//       let config = {
//         method: 'post',
//         maxBodyLength: Infinity,
//         url: 'https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx',
//         headers: { 
//           Cookie: `token=${token}`,
//           'Content-Type': 'application/json'
//         },
//         data : get_ehr_updates_data
//       };
      
  
      
  
//       const response = await axios.request(config);
//       const rowData = response.data.PPMDResults.Results.patientnotelist.patientnote;
  
//       // Ensure rowData can be processed whether it's an array or an object
//       const notes = Array.isArray(rowData) ? rowData : [rowData];
  
//       // Iterate over each note
//       notes.forEach((note) => {
//         if(note["@signedbyuser"] && note["@signedbyuser"] !== ""){

//           let get_demographic_data = JSON.stringify({
//             ppmdmsg: {
//               "@action": "getdemographic",
//               "@class": "api",
//               "@msgtime": "4/1/2021 2:16:55 PM",
//               "@patientid": note["@patientid"],
//               "@nocookie": "0",
//             },
//           });
      
//           let config = {
//             method: "post",
//             maxBodyLength: Infinity,
//             url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
//             headers: {
//               Cookie: `token=${token}`,
//               "Content-Type": "application/json",
//             },
//             data: get_demographic_data,
//           };
      
//           axios
//             .request(config)
//             .then((response) => {
//               // Log the raw response data
      
//               // Check if patientlist is already in JSON format
//               const patientList = response?.data?.PPMDResults?.Results?.patientlist?.patient;
            
//               const email = patientList?.contactinfo["@email"];
//               const phone_number = patientList?.contactinfo["@homephone"];
//               const name = patientList["@name"]
//               const dob = patientList["@dob"]
//               const gender = patientList["@sex"]
//               const address = patientList.address
//               const street = address["@address1"]
//               const street2 = address["@address2"]
//               const city = address["@city"]
//               const state = address["@state"]
//               const zip = address["@zip"]
//               const country = address["@countrycode"]



//               if (!email)
//                 return res
//                   .status(400)
//                   .json({ status: false, message: "Please provide the email!" });
//               let url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}&email=${email}`;
          
//               const response = await axios.get(url, {
//                 headers: {
//                   "Content-Type": "application/json",
//                 },
//               });
          
//               // Check if the patient exists in Absolute RX
//               if (response?.data?.data && !response?.data?.data.length) {
//                 // If the patient does not exist, create a new patient in Absolute RX

//                 let create_patient_payload = {
//                   first_name,
//                   middle_name: middle_name || "",
//                   last_name,
//                   dob,
//                   gender,
//                   email,
//                   phone_number,
//                 };
//                 if (street && city && state && zip && country) {
//                   create_patient_payload.address = {};
//                   create_patient_payload.address.street = street;
//                   create_patient_payload.address.street_2 = street2 || "";
//                   create_patient_payload.address.city = city;
//                   create_patient_payload.address.state = state;
//                   create_patient_payload.address.zip = zip;
//                   create_patient_payload.address.country = country;
//                 }

//                 const create_patient_url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
//                 const response = await axios.post(create_patient_url, create_patient_payload, {
//                   headers: {
//                     "Content-Type": "application/json",
//                   },
//                 });
//               }

//             })
//             .catch((error) => {
//               console.error(
//                 "Error fetching patient data:",
//                 error.response?.data || error.message
//               );
           
//             });











//           console.log("note====",note);
  
//           const pagelist = note.pagelist;
//           const page = pagelist.page;
//           const fieldlist = page.fieldlist;
//           const field = fieldlist.field;
//           const templateName = note['@templatename'];
          
//           const filteredData = field.filter(
//             item => item['@name'] && !item['@name'].startsWith('Unitialed')
//           );
          
//           const products = [];
//           const productGroups = {}; // Temporary object to group product fields by dynamic index
//           console.log("filteredData.length",filteredData.length)
          
//           // Process each field in the filtered data
//           filteredData.forEach(item => {
//             const name = item['@name'];
//             const value = item['@value'];
            
//             const match = name.match(/_(\d+)$/);
//             if (match) {
//               const index = match[1];
              
//               // Initialize the product entry if it doesn't exist
//               if (!productGroups[index]) productGroups[index] = {};
              
//               // Populate product details based on field type
//               if (name.includes('sku_no')) productGroups[index].sku = value;
//               if (name.includes('quantity_no')) productGroups[index].quantity = value;
//               if (name.includes('refill_no')) productGroups[index].refills = value || '0';
//               if (name.includes('instructions_num') || name.includes('instructions_no')) {
//                 productGroups[index].sig = value || "Use as directed";
//               }
//             }
//           });
          
//           // Convert productGroups to an array of products
//           for (const index in productGroups) {
//             products.push({
//               ...productGroups[index],
//               days_supply: "30"
//             });
//           }
          
//           // Create the final object with the products array
//           const result = {
//             patient_id: note["@patientid"],
//             physician_id: filteredData.find(item => item['@name'] === 'provider_id')?.['@value'] || '',
//             ship_to_clinic: filteredData.find(item => item['@name'] === 'ship_to')?.['@value'] === 'Patient' ? "0" : "1",
//             service_type: "two_day",
//             signature_required: "1",
//             memo: "Test memo",
//             external_id: "testing450",
//             products: products
//           };

          
          
//           // Output the result
//           console.log(result);


//           // return res.status(200).json({status:true, data: result})
//         }
//       });
  

      
//     }

//   } catch (error) {
//     console.log("🚀  exports.getEhrNotes=async  error:", error.response?.data?.PPMDResults?.Error);
//   }
// };
