const axios = require("axios");
const { v4: uuidv4 } = require('uuid');

var parseString = require("xml2js").parseString;

const { get_advanced_md_token } = require("../helpers/access_token");
const {
  transformPatientData,
  transMedicationtData,
} = require("../helpers/data_extract");

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
        const patientList = response?.data?.PPMDResults?.Results;
        if (typeof patientList === "object") {
          console.log("returnder in if");
          // const data = transformPatientData(patientList);

          // Directly return patient data if it's already an object
          return res.status(200).json({
            success: true,
            data: patientList, // Return as JSON
          });
        }
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
        "@msgtime": "4/1/2021 2:16:55 PM",
        "@datechanged": "3/1/2021 2:16:55 PM",
        "@nocookie": "0",
        "patient": {
          "@name": "sharma,robin",
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
    const patients = patientListResponse.data?.PPMDResults?.Results?.patientlist?.patient;

    if (!patients || patients.length === 0) {
      return res.status(404).json({ success: false, message: "No patients found." });
    }

    // Fetch demographic details for each patient concurrently
    const demographicRequests = patients.map((pt) => {
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
          demographic: demographicData || null,  // Demographic data (if available)
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


exports.getEhrNotes = async (req, res) => {
  try {
    const token = await get_advanced_md_token();
    // console.log("🚀  getEhrNotes  token:", token)
    let data = JSON.stringify({
      ppmdmsg: {
        "@action": "getehrnotes",
        "@class": "api",
        "@msgtime": "4/1/2021 2:16:55 PM",
        "@patientid": "6083481", //6082877 6083235 // ivo 6083481
        "@templateid": "100044027", //100044028 100044027
        // "@createdfrom": "10/05/1900",
        // "@createdto": "2/20/2999",
        // "@notedatefrom": "2/20/1900",
        // "@notedateto": "2/20/2999",
        // "@nocookie": "0",
        patientnote: {
          "@templatename": "TemplateName",
          "@notedatetime": "NoteDatetime",
          "@username": "UserName",
          "@signedbyuser": "SignedByUser",
          "@reviewedbyuser": "ReviewedByUser",
          "@confidential": "Confidential",
          "@printedat": "PrintedAt",
        },
        field: {
          "@ordinal": "Ordinal",
          "@name": "FieldName",
          "@value": "Value",
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
        Accept: "application/json",
      },
      data: data,
    };
    const response = axios.request(config).then((response) => {
      console.log("🚀  .then  response:", response.data.PPMDResults.Results.patientnotelist.patientnote);
      // parseXmlToJson(response.data.PPMDResults.Results.patientnotelist.patientnote)
      let rowData = response.data.PPMDResults.Results.patientnotelist.patientnote;
      let pagelist = rowData.pagelist;
      let page = pagelist.page;
      let fieldlist = page.fieldlist;
      let field = fieldlist.field;
      let tamplateName = rowData["@templatename"];
      // let json_response =  parseXmlToJson(response.data.PPMDResults)
      // console.log("🚀  .then  json_response:", json_response)

      //console.log("🚀  .then  tamplateName:", tamplateName)
      //console.log("🚀  .then  field:", field)
      const filteredData = field.filter((item) => item["@name"] && !item["@name"].startsWith("Unitialed"));

      //console.log(filteredData);
      // Extract product details using regex
      const products = [];
      const productGroups = {}; // Temporary object to group product fields by dynamic index

      filteredData.forEach((item) => {        
        const name = item["@name"];
        const value = item["@value"];

        // Match the pattern to extract the dynamic index (e.g., 10, 3, etc.)
        const match = name.match(/_(\d+)$/);
        if (match) {
          const index = match[1]; // Extract dynamic index

          // Initialize the product entry if it doesn't exist
          if (!productGroups[index]) productGroups[index] = {};

          // Populate product details based on field type
          if (name.includes("sku_no")) productGroups[index].sku = value;
          if (name.includes("quantity_no")) productGroups[index].quantity = value;
          if (name.includes("refill_no")) productGroups[index].refills = value || "0";
          if (name.includes("instructions_num") || name.includes("instructions_no")) {
            productGroups[index].sig = value || "Use as directed";
          }
        }
      });

      // Convert productGroups to an array of products
      for (const index in productGroups) {
        products.push({
          ...productGroups[index],
          days_supply: "30",
        });
      }

      // Create the final object with the products array
      const result = {
        patient_id: "99945",
        physician_id: filteredData.find((item) => item["@name"] === "provider_id")?.["@value"] || "",
        ship_to_clinic: filteredData.find((item) => item["@name"] === "ship_to")?.["@value"] === "Patient" ? "0" : "1",
        service_type: "two_day",
        signature_required: "1",
        memo: "Test memo",
        external_id: uuidv4(),
        products: products,
      };

      // Output the result
      console.log("result===",result);

      return res.status(200).json({status:false, data:result, message:"success"})
    });
  } catch (error) {
    console.log(
      "🚀  exports.getEhrNotes=async  error:",
      error.response.data.PPMDResults.Error
    );
  }
};

exports.getEhrTemplates = async (req, res) => {
  try {
    // const token = await get_advanced_md_token();
    const axios = require('axios');
    let data = JSON.stringify({
      "ppmdmsg": {
        "@action": "getehrtemplates",
        "@class": "api",
        "@msgtime": "4/1/2021 2:16:55 PM",
        "@nocookie": "0",
        "template": {
          "@templatename": "TemplateName",
          "@templatetype": "TemplateType",
          "@templatetypeid": "TemplateTypeID",
          "@defaultcategory": "DefaultCategory",
          "@defaultcategoryid": "DefaultCategoryID",
          "@isactive": "IsActive"
        },
        "page": {
          "@pagename": "PageName",
          "@pageindex": "PageIndex"
        },
        "field": {
          "@ordinal": "Ordinal",
          "@fieldname": "FieldName",
          "@x": "X",
          "@y": "Y",
          "@width": "Width",
          "@height": "Height",
          "@font": "Font",
          "@fontsize": "FontSize",
          "@maxlength": "MaxLength",
          "@defaultvalue": "DefaultValue"
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
    
    axios.request(config)
    .then((response) => {
      // console.log(JSON.stringify(response.data));
      
      const data = response.data.PPMDResults.Results.templatelist.template.map(({ 
        "@id": id, 
        "@templatename": templatename, 
        "@templatetype": templatetype, 
        "@defaultcategory": defaultcategory, 
        "@defaultcategoryid": defaultcategoryid, 
        "@isactive": isactive 
      }) => ({
        id,
        templatename,
        templatetype,
        defaultcategory,
        defaultcategoryid,
        isactive
      }));
      
      return res.status(200).json({ status: true, data });
    
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
