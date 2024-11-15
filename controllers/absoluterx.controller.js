const axios = require("axios");
const { getAllOrderfromDatabaase, getAllFailedOrder } = require("../services/absoluteServices");

exports.createPatientAbsolute = async (req, res) => {
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
    } = req.body;
    if (!first_name)
      return res
        .status(400)
        .json({ status: false, message: "Please provide the first name!" });

    if (!last_name)
      return res
        .status(400)
        .json({ status: false, message: "Please provide the last name!" });

    if (!dob)
      return res
        .status(400)
        .json({ status: false, message: "Please provide the dob!" });

    if (!gender)
      return res
        .status(400)
        .json({ status: false, message: "Please provide the gender!" });

    if (!email)
      return res
        .status(400)
        .json({ status: false, message: "Please provide the email!" });

    if (!phone_number)
      return res
        .status(400)
        .json({ status: false, message: "Please provide the phone number!" });

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

exports.getPatientAbsolute = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email)
      return res
        .status(400)
        .json({ status: false, message: "Please provide the email!" });
    let url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}&email=${email}`;

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response?.data?.data && !response?.data?.data.length) {
      return res
        .status(404)
        .json({ status: false, message: "Patient not found" });
    }
    return res.status(200).json({
      status: true,
      data: response?.data?.data,
      message: "Successfully fetched patient",
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return res.status(400).json({
      status: false,
      message: "Failed to fetch patient",
      error: error.response.data.errors,
    });
  }
};

exports.createOrderAbsolute = async (req, res) => {
  try {
    const url = `https://portal.absoluterx.com/api/clinics/orders?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const orderData = {
      patient_id: "98751",
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
    const response = await axios.post(url, orderData, {
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
    console.error("Error creating order:", error);
    return res.status(400).json({
      status: false,
      message: error.response.data.message || error.response.data.error,
      error: error.response.data.errors,
    });
  }
};

exports.createPhysicianAbsolute = async (req, res) => {
  try {
    const url = `https://portal.absoluterx.com/api/clinics/physicians?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const payload = {
      phone_number: "5418059835", //REQUIRED
      email: "peterpark@yopmail.com",
      first_name: "PETER", //REQUIRED
      // middle_name: "physician", //OPTIONAL
      last_name: "PARK", //REQUIRED
      npi_number: "rprov377",
      // licenses: [
      //   {
      //     state: "Montana",
      //     number: "12342",
      //     type: "MEDICAL",
      //     expires_on: "2026-12-31",
      //   },
      // ],
      street: "30 RT 100",
      // street_2: "APT 101",
      city: "WILMINGTON",
      state: "VT",
      zip: "05363",
    };
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("response==", response);

    return res.status(200).json({
      status: true,
      data: response.data,
      message: "Successfully created physician",
    });
  } catch (error) {
    console.log("error==", error);

    console.error("Error creating order:", error.response.data);
    return res.status(400).json({
      status: false,
      message: error.response.data.message || error.response.data.error,
      error: error.response.data.errors,
    });
  }
};

exports.getPhysicianAbsolute = async (req, res) => {
  try {
    const { id, dea_number, npi_number, first_name, middle_name, last_name } = req.query;
    
    const queryParams = new URLSearchParams();
    
    // Add the API key as the first parameter
    queryParams.append('api_key', process.env.ABSOLUTE_RX_API_KEY);
    
    // Conditionally add parameters if they exist
    if (id) queryParams.append('id', id);
    if (dea_number) queryParams.append('dea_number', dea_number);
    if (npi_number) queryParams.append('npi_number', npi_number);
    if (first_name) queryParams.append('first_name', first_name);
    if (middle_name) queryParams.append('middle_name', middle_name);
    if (last_name) queryParams.append('last_name', last_name);
    
    // Construct the full URL with query parameters
    const baseUrl = 'https://portal.absoluterx.com/api/clinics/physicians';
    const url = `${baseUrl}?${queryParams.toString()}`;
    
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      status: true,
      data: response.data,
      message: "Successfully fetched physician",
    });
  } catch (error) {
    console.log("error==", error);

    // More robust error handling
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'An error occurred while fetching physician data';
    const errorDetails = error.response?.data?.errors || {};
    const statusCode = error.response?.status || 400;

    return res.status(statusCode).json({
      status: false,
      message: errorMessage,
      error: errorDetails,
    });
  }
};

exports.createLicenseAbsolute = async (req, res) => {
  try {
    const url = `https://portal.absoluterx.com/api/clinics/licenses?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const payload = {
      physician_id: 3014,
      number: "123456789",
      state: "Texas",
      type: "MEDICAL",
      expires_on: "2029-01-01",
    };
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      status: true,
      data: response?.data?.data,
      message: "Successfully created licenses",
    });
  } catch (error) {
    console.error("Error creating order:", error.response.data);
    return res.status(400).json({
      status: false,
      message: error.response.data.message || error.response.data.error,
      error: error.response.data.errors,
    });
  }
};

exports.createAllergyAbsolute = async (req, res) => {
  try {
    const url = `https://portal.absoluterx.com/api/clinics/allergies?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const payload = {
      patient_id: 98751,
      name: "cough",
    };
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      status: true,
      data: response?.data?.data,
      message: "Successfully created allergies",
    });
  } catch (error) {
    console.error("Error creating order:", error.response.data);
    return res.status(400).json({
      status: false,
      message: error.response.data.message || error.response.data.error,
      error: error.response.data.errors,
    });
  }
};

exports.createDiseasesAbsolute = async (req, res) => {
  try {
    const url = `https://portal.absoluterx.com/api/clinics/diseases?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const payload = {
      patient_id: 98751,
      name: "fiver",
    };
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      status: true,
      data: response?.data?.data,
      message: "Successfully created diseases",
    });
  } catch (error) {
    console.error("Error creating order:", error.response.data);
    return res.status(400).json({
      status: false,
      message: error.response.data.message || error.response.data.error,
      error: error.response.data.errors,
    });
  }
};

exports.createMedicationAbsolute = async (req, res) => {
  try {
    const url = `https://portal.absoluterx.com/api/clinics/medications?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;
    const payload = {
      patient_id: 98751,
      name: "amoxicillin-pot clavulanate",
      strength: "50 MG",
    };
    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return res.status(200).json({
      status: true,
      data: response?.data?.data,
      message: "Successfully created medications",
    });
  } catch (error) {
    console.error("Error creating order:", error.response.data);
    return res.status(400).json({
      status: false,
      message: error.response.data.message || error.response.data.error,
      error: error.response.data.errors,
    });
  }
};
exports.getBbsoluteOrder = async (req, res) => {
  try {
   const { physician_id, patient_id, order_number } = req.query;
    if(!physician_id) throw new Error("physician id is required")
    if(!patient_id) throw new Error("patient id is required")
    if(!order_number) throw new Error("order number is required")
    const queryParams = new URLSearchParams();
    
    // Add the API key as the first parameter
    queryParams.append('api_key', process.env.ABSOLUTE_RX_API_KEY);
    
    // Conditionally add parameters if they exist
     queryParams.append('physician_id', physician_id);
     queryParams.append('patient_id', patient_id);
     queryParams.append('number', order_number);
    // Construct the full URL with query parameters
    const baseUrl = 'https://portal.absoluterx.com/api/clinics/orders';
    const url = `${baseUrl}?${queryParams.toString()}`;
    
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
      },
    });
     console.log("response",response.data.data[0])
    return res.status(200).json({
      status: true,
      data: response.data.data[0],
      message: "Successfully fetched order detail",
    });
  } catch (error) {
    console.log("error==", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
exports.getAllOrderList = async(req,res)=>{
  try {
   let response= await getAllOrderfromDatabaase(req.query)
     return res.status(200).json({
       status: true,
       data: response,
       message: "Successfully fetched order list",
     });
   } catch (error) {
     console.log("error==", error);
     return res.status(500).json({
       status: false,
       message: error.message,
     });
   }
}
exports.getAllFailedOrderList = async(req,res)=>{
  try {
    let response= await getAllFailedOrder(req.query)
      return res.status(200).json({
        status: true,
        data: response,
        message: "Successfully fetched failed order list",
      });
    } catch (error) {
      console.log("error==", error);
      return res.status(500).json({
        status: false,
        message: error.message,
      });
    }
 }

