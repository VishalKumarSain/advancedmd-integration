const axios = require("axios");

const { VENDOR_ID, LOCATION_ID, API_NETWORK_ID ,API_USERNAME, API_PASSWORD, API_BASE_URL} = require("../config/config");
const { saveOrderInDatabse } = require("../services/absoluteServices");


const createHelendalOrder = async (body, patientData, template, additional_data) => {
  try {
    const { message, order } = body;
    let payload = {};
    const auth = Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString("base64");
    // Send the request to Life File API
    const response = await axios.post(`${API_BASE_URL}/order`, body, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Vendor-ID": VENDOR_ID,
        "X-Location-ID": LOCATION_ID,
        "X-API-Network-ID": API_NETWORK_ID
      }
    });

    // Return success response
    console.log("response.data",response.data)


    if(response.data.type =="success"){
      
    const local_db_data = {
      template_name : template.template_name,
      frist_name: patientData.first_name,
      last_name: patientData.last_name,
      email: patientData.email,
      order_id: response?.data?.data.orderId,
      // patient_id: orderPayload.patient_id,
      physician_id: body?.order?.practice?.id,
      template_id: additional_data.template_id,
      notes_id: additional_data.note_id,
      advancemd_patient_id: additional_data.advancedmd_patient_id,
      // order_status: data_res.status,
    }

    console.log("local_db_data====",local_db_data);
    
    const save_new_order = await saveOrderInDatabse(local_db_data);
      return {status: true,  data : response.data, message :"Order created"}

    }else{
      return {status: false,  data : response.data, message :"Order creation failed"}
    }

  } catch (error) {
    // Handle error response with a clear error message
    // if( error.response.data.type=="error"){
    //   error.message = error.response.data.data.message
    // }
    console.error("Error creating order:", error);
   return {status : false, data:null,  message: error.message}
  }
};
const createOrder = async (req, res) => {
    try {
      const { message, order } = req.body;
      let payload = {};
  
      // Construct payload conditionally as before
      if (message.id || message.sentTime) {
        payload.message = {
          ...(message.id && { id: message.id }),
          ...(message.sentTime && { sentTime: message.sentTime })
        };
      }
  
      if (order) {
        payload.order = {};
  
        if (order.general) {
          payload.order.general = {
            ...(order.general.memo && { memo: order.general.memo }),
            ...(order.general.referenceId && { referenceId: order.general.referenceId }),
            ...(order.general.statusId && { statusId: order.general.statusId })
          };
        }
  
        if (order.document?.pdfBase64) {
          payload.order.document = { pdfBase64: order.document.pdfBase64 };
        }
  
        if (order.prescriber) {
          payload.order.prescriber = {
            ...(order.prescriber.npi && { npi: order.prescriber.npi }),
            ...(order.prescriber.lastName && { lastName: order.prescriber.lastName }),
            ...(order.prescriber.firstName && { firstName: order.prescriber.firstName })
          };
        }
  
        if (order.practice?.id) {
          payload.order.practice = { id: order.practice.id };
        }
  
        if (order.patient) {
          payload.order.patient = {
            ...(order.patient.lastName && { lastName: order.patient.lastName }),
            ...(order.patient.firstName && { firstName: order.patient.firstName }),
            ...(order.patient.gender && { gender: order.patient.gender }),
            ...(order.patient.dateOfBirth && { dateOfBirth: order.patient.dateOfBirth })
          };
        }
  
        if (order.rxs) {
          payload.order.rxs = order.rxs.map(rx => ({
            ...(rx.drugName && { drugName: rx.drugName })
          }));
        }
      }
  
      // Clean the payload of any undefined properties
      const cleanPayload = JSON.parse(JSON.stringify(payload));
  
      // Send the request to Life File API
      const response = await axios.post(`${API_BASE_URL}/order`, cleanPayload, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          "X-Vendor-ID": VENDOR_ID,
          "X-Location-ID": LOCATION_ID,
          "X-API-Network-ID": API_NETWORK_ID
        }
      });
  
      // Return success response
      return res.status(200).json({
        success: true,
        data: response.data,
        message: "Order successfully created!"
      });
    } catch (error) {
      // Handle error response with a clear error message
      console.error("Error creating order:", error.message);
      return res.status(400).json({
        success: false,
        message: "Something went wrong!",
        error: error.response?.data || error.message
      });
    }
  };
  
  
  const updateOrderStatus = async (req, res) => {
    try {
      const orderId = 65144829; // Replace with the correct order ID as needed
      const status = "b1a55"; // Replace with the appropriate status code if necessary
  
      // Sandbox credentials and API base URL
      // const API_BASE_URL = "https://host100-7.lifefile.net/lfapi/v1";
      const VENDOR_ID = "11504";
      const LOCATION_ID = "110285";
      const API_NETWORK_ID = "1282";
  
      // const auth = Buffer.from("sandboxapi11437-171:@ANESeTBJ5n#9eoxuPzN").toString("base64");
  
      // Perform the PUT request to update order status
      const response = await axios.put(
        `${API_BASE_URL}/order/${orderId}/status`,
        { status: "b1a55" },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "X-Vendor-ID": VENDOR_ID,
            "X-Location-ID": LOCATION_ID,
            "X-API-Network-ID": API_NETWORK_ID,
            "Content-Type": "application/json",
          },
        }
      );
  
      // Return success response
      return res.status(200).json({
        success: true,
        data: response.data,
        message: "Successfully updated order status",
      });
    } catch (error) {
      console.log("error===>", error.response?.data || error.message);
      return res.status(400).json({
        success: false,
        message: "Something went wrong!",
        error: error.response?.data || error.message,
      });
    }
  };
  
  
  
  
const updateOrderShipping = async (req, res) => {
    try {
      const { orderId } = req.params;
      const {
        recipientType,
        recipientLastName,
        recipientFirstName,
        recipientPhone,
        recipientEmail,
        addressLine1,
        addressLine2,
        addressLine3,
        city,
        state,
        zipCode,
        country,
        service
      } = req.body;
  
      // Create the request body based on the API specification
      const requestBody = {
        shipping: {
          recipientType, // Enum: 'clinic' or 'patient'
          recipientLastName,
          recipientFirstName,
          recipientPhone,
          recipientEmail,
          addressLine1,
          addressLine2,
          addressLine3,
          city,
          state, // Two-letter state abbreviation
          zipCode,
          country, // Two-letter country code
          service // Internal Life File shipping service code
        }
      };
  
      // Make the PUT request to update shipping information
      const response = await axios.put(
        `${API_BASE_URL}/order/${orderId}/shipping`,
        requestBody,
        {
          headers: {
            Authorization: `Basic ${auth}`, 
            "X-Vendor-ID": VENDOR_ID, 
            "X-Location-ID": LOCATION_ID, 
            "X-API-Network-ID": API_NETWORK_ID,
            "Content-Type": "application/json"
          }
        }
      );
  
      // Return only response.data to avoid circular references
      return res.status(200).json({
        success: true,
        data: response.data,
        message: "Shipping information updated successfully",
      });
    } catch (error) {
      // Handle any errors that occur during the request
      console.error("Error updating shipping info:", error.response?.data || error.message);
      return res.status(400).json({
        success: false,
        message: "Something went wrong!",
        error: error.response?.data || error.message,
      });
    }
  };
  module.exports={
    createOrder,
    updateOrderShipping,
    createHelendalOrder,
    updateOrderStatus
  }