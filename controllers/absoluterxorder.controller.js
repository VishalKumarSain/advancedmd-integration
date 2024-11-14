// Helper function to check or create patient in Absolute RX
exports.checkOrCreatePatientInAbsoluteRX = async (patientData) => {
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