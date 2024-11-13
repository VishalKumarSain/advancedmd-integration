const axios = require("axios");

const { get_advanced_md_token } = require("../helpers/access_token");
const { parseString } = require("xml2js");
const {
  transMedicationtData,
  transformPatientData,
} = require("../helpers/data_extract");

exports.fullCreateOrderFlow = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Missing required patientId.",
      });
    }

    const patient_data = await getPatientFromAdvancedmdHelper(patientId);
    if (!patient_data.success) {
      return res.status(400).json({
        success: false,
        message: "Unable to fetch the patient data!",
      });
    }
    const parsed_patient_data = await transformPatientData(patient_data.data);
    console.log("parsed_patient_data===", parsed_patient_data);

    if(!parsed_patient_data?.profile?.doctor_code){
      return res.status(400).json({
        success: false,
        message: "Unable to fetch the physician id!",
      });
    }

    let fetch_physician_on_absolutrx_url = `https://portal.absoluterx.com/api/clinics/physicians/${parsed_patient_data?.profile?.doctor_code}?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const fetch_physician_on_absolutrx = await axios.get(
      fetch_physician_on_absolutrx_url,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );


    console.log("fetch_physician_on_absolutrx===",fetch_physician_on_absolutrx.data);
    
    if(!fetch_physician_on_absolutrx?.data?.data){
      return res.status(400).json({
        success: false,
        message: "Unable to fetch the physician data!",
      });
    }
    
    const medication_data = await getPatientMedicationsFromAdvancedmdHelper(
      patientId
    );
    if (!medication_data.success) {
      return res.status(400).json({
        success: false,
        message: "Unable to fetch the medication data!",
      });
    }

    const parsed_medication_data = await transMedicationtData(medication_data.data);
    console.log("parsed_medication_data===", parsed_medication_data);

    const {
      first_name,
      middle_name,
      last_name,
      dob,
      gender,
      email,
      phone_number,
    address,
      allergies,
      medications,
    } = parsed_patient_data;

    const {  street,
        street_2,
        city,
        state,
        zip,
        country,} = address
    if (!first_name)
      return res
        .status(400)
        .json({ status: false, message: "Missing patient first name!" });

    if (!last_name)
      return res
        .status(400)
        .json({ status: false, message: "Missing patient last name!" });

    if (!dob)
      return res
        .status(400)
        .json({ status: false, message: "Missing patient dob!" });

    if (!gender)
      return res
        .status(400)
        .json({ status: false, message: "Missing patient gender!" });

    if (!email)
      return res
        .status(400)
        .json({ status: false, message: "Missing patient email!" });

    if (!phone_number)
      return res
        .status(400)
        .json({ status: false, message: "Missing patient phone number!" });

    let fetch_patient_on_absolutrx_url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}&email=${email}`;
    const fetch_patient_on_absolutrx = await axios.get(
      fetch_patient_on_absolutrx_url,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );


    console.log("fetch_patient_on_absolutrx?.data?.data===",fetch_patient_on_absolutrx?.data?.data);
    
    
    let full_patient_details;
    if (
      fetch_patient_on_absolutrx?.data?.data &&
      !fetch_patient_on_absolutrx?.data?.data.length
    ) {
      let payload = {
        first_name,
        middle_name: middle_name || "",
        last_name,
        dob,
        gender,
        email,
        phone_number,
      };

      if (street && city && state && zip && country) {
        payload.address = {};
        payload.address.street = street;
        payload.address.street_2 = street_2 || "";
        payload.address.city = city;
        payload.address.state = state;
        payload.address.zip = zip;
        payload.address.country = "country";
      }
      const create_patient_url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
      const create_patient_response = await axios.post(
        create_patient_url,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (!create_patient_response?.data?.data) {
        return res
          .status(400)
          .json({
            status: false,
            message: "Unable to create patient in absolute rx!",
          });
      }

      full_patient_details = create_patient_response?.data?.data
    }

    full_patient_details = fetch_patient_on_absolutrx?.data?.data[0]
    console.log('full_patient_details====',full_patient_details);
    let products =[]
    for (const medi of parsed_medication_data) {
        const medi_name = medi.drug_name
        const find_product = `https://portal.absoluterx.com/api/clinics/products?api_key=${process.env.ABSOLUTE_RX_API_KEY}&state=NY&physician_id=3089&name=${medi_name}`
        const response = await axios.get(find_product, {
            headers: {
              "Content-Type": "application/json",
            },
          });

          console.log('response?.data?.data====',response?.data?.data);

          if(response?.data?.data && response?.data?.data?.length){
            products.push({
                sku: response.data?.data[0]?.sku,
                quantity: medi.quantity,
                refills: medi.refills,
                days_supply: medi.duration,
                sig: "Use as directed",
              },)
          }
    }
    
    console.log('products====',products, );

    // return
    const create_order_url = `https://portal.absoluterx.com/api/clinics/orders?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const orderData = {
      patient_id: full_patient_details.id,
      physician_id: fetch_physician_on_absolutrx?.data?.data.id,
      ship_to_clinic: 0,
      service_type: "two_day",
      signature_required: 1,
      memo: "Test memo",
      // external_id: "testing4",
      products: products
    };
    const response = await axios.post(create_order_url, orderData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      status: true,
      data: response?.data?.data,
      message: "Successfully created order",
    });
  } catch (error) {
    console.error(
      "Error fetching patient data:",
      error.response?.data || error.message
    );
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
      error: error.message,
    });
  }
};

const getPatientFromAdvancedmdHelper = async (patientId) => {
  try {
    const token = await get_advanced_md_token();

    let data = JSON.stringify({
      ppmdmsg: {
        "@action": "getdemographic",
        "@class": "api",
        "@patientid": patientId,
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

    // Return the entire axios request so that it becomes the return of getPatientFromAdvancedmdHelper
    return axios
      .request(config)
      .then(async (response) => {
        // Log the raw response data
        console.log("Raw response data of patient:", response.data);

        // Check if patientlist is already in JSON format
        const patientList = response?.data?.PPMDResults?.Results;
        console.log("typeof patientList====",typeof patientList);
        
        if (typeof patientList === "object") {
          return {
            success: true,
            data: patientList, // Directly return patient data if it's already an object
          };
        }

        // If it is still in XML format, parse it
        return new Promise((resolve, reject) => {
          parseString(patientList, (err, result) => {
            if (err) {
              console.error("Error parsing XML response:", err);
              reject({
                success: false,
                data: null,
              });
            } else {
              // Access and transform the parsed XML data
              const data = result.ppmdmsg; // Adjust the path based on actual XML structure
              console.log("Parsed patient data:", JSON.stringify(data));

              resolve({
                success: true,
                data: data,
              });
            }
          });
        });
      })
      .catch((error) => {
        console.error(
          "Error fetching patient data:",
          error.response?.data || error.message
        );
        return {
          success: false,
          data: null,
        };
      });
  } catch (error) {
    console.error("Error in getPatientFromAdvancedmdHelper:", error.message);
    return {
      success: false,
      data: null,
    };
  }
};

const getPatientMedicationsFromAdvancedmdHelper = async (patientId) => {
  try {
    const token = await get_advanced_md_token();
    const axios = require("axios");
    const { parseStringPromise } = require("xml2js"); // Use parseStringPromise for async/await

    const data = JSON.stringify({
      ppmdmsg: {
        "@action": "getehrmedications",
        "@class": "api",
        // "@msgtime": "4/1/2021 2:16:55 PM", // Uncomment if needed
        "@patientid": patientId,
        // "@iscurrent": "-1", // Uncomment if needed
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

    const config = {
      method: "post",
      maxBodyLength: Infinity,
      url: "https://providerapi.advancedmd.com/processrequest/api-801/TEMP/xmlrpc/processrequest.aspx",
      headers: {
        Cookie: `token=${token}`,
        "Content-Type": "application/json",
      },
      data: data,
    };

    const response = await axios.request(config); // Use await for axios request
    console.log("Raw response data of medication:", response.data);

    const drugList = response?.data?.PPMDResults?.Results?.druglist;

    if (typeof drugList === "object") {
      // If drugList is already an object
      return {
        success: true,
        data: drugList, // Return as JSON
      };
    }

    // If drugList is a string, proceed to parse it
    try {
      const parsedResult = await parseStringPromise(drugList); // Use parseStringPromise for async/await
      const drugData = parsedResult.ppmdmsg; // Adjust the path based on actual XML structure
      console.log(JSON.stringify(drugData)); // Log or process the patient data

      return {
        success: true,
        data: drugData, // Return the parsed JSON data
      };
    } catch (err) {
      console.error("Error parsing XML response:", err);
      return {
        success: false,
        data: null,
      };
    }
  } catch (error) {
    console.error(
      "Error fetching patient data:",
      error.response?.data || error.message
    );
    return {
      success: false,
      data: null,
    };
  }
};

const createPatientAbsoluteHelper = async (payload) => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      dob,
      gender,
      email,
      phone_number,
      street,
      street_2,
      city,
      state,
      zip,
      country,
      allergies,
      medications,
    } = payload;

    let payload = {
      first_name,
      middle_name: middle_name || "",
      last_name,
      dob,
      gender,
      email,
      phone_number,
    };
    if (street && city && state && zip && country) {
      payload.address = {};
      payload.address.street = street;
      payload.address.street_2 = street_2 || "";
      payload.address.city = city;
      payload.address.state = state;
      payload.address.zip = zip;
      payload.address.country = country;
    }

    if (allergies) {
    }

    // const payload = {
    //   first_name: "John",
    //   middle_name: "Michael",
    //   last_name: "Doe",
    //   dob: "1980-01-01",
    //   gender: "Male",
    //   // "allergies": [
    //     //   {
    //       //     "name": "Tree Pollen"
    //       //   }
    //       // ],
    //       // "diseases": [
    //         //   {
    //           //     "name": "Heart Disease"
    //           //   }
    //   // ],
    //   // "medications": [
    //     //   {
    //       //     "name": "Tylenol",
    //       //     "strength": "50 MG"
    //       //   }
    //       // ],
    //       email: "john@doe.com",
    //       phone_number: "8888888888",
    //       address: {
    //         street: "101 Some Street",
    //         street_2: "APT 101",
    //         city: "Lutz",
    //         state: "FL",
    //         zip: "33549",
    //         country: "USA",
    //       },
    //     };
    const url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      status: true,
      data: response?.data?.data,
      message: "Successfully created patient",
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    return res.status(400).json({
      status: false,
      message: "Failed to create patient",
      error: error.response.data.errors,
    });
  }
};
