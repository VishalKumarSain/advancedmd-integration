const axios = require("axios");
const Failed_order = require("../models/order_failure.model");
const { saveOrderInDatabse, getOrderfromDatabaase } = require("../services/absoluteServices");

const checkOrCreatePatientInAbsoluteRX = async (patientData, template) => {
  try {
    // Define the URL for checking if the patient exists
    const url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${
      process.env.ABSOLUTE_RX_API_KEY
    }&email=${encodeURIComponent(patientData.email)}`;

    // Check if the patient already exists
    const existingPatientResponse = await axios.get(url, {
      headers: { "Content-Type": "application/json" },
    });

    // Log existing patient data for debugging
    // console.log("existingPatient:", existingPatientResponse?.data?.data);

    // If the patient does not exist, proceed to create the patient
    if (!existingPatientResponse?.data?.data?.length) {
      console.log("Patient does not exist, creating new patient");

      const createPatientUrl = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;

      // Make POST request to create new patient
      const newPatientResponse = await axios.post(
        createPatientUrl,
        patientData,
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      // console.log("newPatientResponse.data====", newPatientResponse.data);

      // Check if patient creation was successful
      if (!newPatientResponse?.data?.data) {
        return {
          status: false,
          data: null,
          message: "Failed to create patient on AbsoluteRX.",
        };
      }

      return {
        status: true,
        data: newPatientResponse.data.data,
        message: "Patient created successfully",
      };
    } else {
      console.log("Patient already exists");
      return {
        status: true,
        data: existingPatientResponse.data.data[0],
        message: "Patient already exists",
      };
    }
  } catch (error) {
    // Improved error logging
    // console.error("Error during check or create patient process:", error);

    // Capture specific error details for better debugging
    const errorMessage =
      error?.response?.data?.errors ||
      error.message ||
      "Unknown error occurred";
    return {
      status: false,
      data: null,
      message: errorMessage,
    };
  }
};

const createOrderAbsoluteRXHelper = async (orderPayload, template, additional_data) => {
  try {

    // const check_exists_order_note = await getOrderfromDatabaase()
    const create_order_url = `https://portal.absoluterx.com/api/clinics/orders?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;

    const response = await axios.post(create_order_url, orderPayload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("response.data===",response.data);
    
    if (!response?.data?.data) {
      return { status: false, data: null, message: "Order created failed" };
    }
    // console.log("Order Payload:", orderPayload);

    const data_res = response?.data?.data;
    const local_db_data = {
      frist_name: data_res.patient.first_name,
      last_name: data_res.patient.last_name,
      email: data_res.patient.email,
      order_id: data_res.number,
      patient_id: orderPayload.patient_id,
      physician_id: orderPayload.physician_id,
      template_id: additional_data.template_id,
      notes_id: additional_data.note_id,
      advancemd_patient_id: additional_data.advancedmd_patient_id,
      order_status: data_res.status,
    }

    console.log("local_db_data====",local_db_data);
    
    const save_new_order = await saveOrderInDatabse(local_db_data);
    return {
      status: true,
      data: response?.data?.data,
      message: "Order created successfull",
    };
  } catch (error) {
    // console.error("Error creating order:", error?.response?.data?.errors);
    console.error("Error creating order:", error);

    return {
      status: false,
      data: null,
      message: error?.response?.data?.message || error?.response?.data?.error,
    };
  }
};

module.exports = {
  checkOrCreatePatientInAbsoluteRX,
  createOrderAbsoluteRXHelper,
};
