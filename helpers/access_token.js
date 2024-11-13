const axios = require("axios");
const xml2js = require('xml2js');

exports.get_advanced_md_token = async () => {
  try {
    const requestBody = {
      ppmdmsg: {
        "@action": "login",
        "@class": "login",
        "@msgtime": new Date().toLocaleString("en-US", { hour12: false }),
        "@username": process.env.ADVANCEDMD_APP_USERNAME,
        "@psw": process.env.ADVANCEDMD_APP_PASSWORD,
        "@officecode": process.env.ADVANCEDMD_APP_OFFICE_KEY,
        "@appname": process.env.ADVANCEDMD_APP_NAME,
      },
    };

    const response = await axios.post(
      "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("response?.data?.PPMDResults?.Results?.usercontext[#text]===",response?.data?.PPMDResults?.Results?.usercontext["#text"]);
    
    return response?.data?.PPMDResults?.Results?.usercontext["#text"];
  } catch (error) {
    console.error(
      "Error fetching AdvancedMD token:",
      error.response?.data || error.message || error.response?.data?.PPMDResults?.Results?.Error?.Fault
    );
    throw error;
  }
};
