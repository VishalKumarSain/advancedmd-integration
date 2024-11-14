const axios = require("axios");
const Failed_order = require("../models/order_failure.model");

exports.checkOrCreatePatientInAbsoluteRX = async (patientData, template) => {
  try {
    // Define the URL for checking if the patient exists
    const url = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}&email=${encodeURIComponent(patientData.email)}`;
    
    // Check if the patient already exists
    const existingPatientResponse = await axios.get(url, {
      headers: { "Content-Type": "application/json" },
    });

    // Log existing patient data for debugging
    console.log("existingPatient:", existingPatientResponse?.data?.data);

    // If the patient does not exist, proceed to create the patient
    if (!existingPatientResponse?.data?.data?.length) {
      console.log("Patient does not exist, creating new patient");

      const createPatientUrl = `https://portal.absoluterx.com/api/clinics/patients?api_key=${process.env.ABSOLUTE_RX_API_KEY}`;

      // Make POST request to create new patient
      const newPatientResponse = await axios.post(createPatientUrl, patientData, {
        headers: { "Content-Type": "application/json" },
      });

      console.log("newPatientResponse.data====",newPatientResponse.data);
      

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
    console.error("Error during check or create patient process:", error);

    // Capture specific error details for better debugging
    const errorMessage = error?.response?.data?.errors || error.message || "Unknown error occurred";
    return {
      status: false,
      data: null,
      message: errorMessage,
    };
  }
};
