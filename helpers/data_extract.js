exports.transformPatientData = (athenaData) => {
    try {   
      // console.log("athenaData===",athenaData);
       
      const patient = athenaData.patientlist.patient;
      const profile = athenaData.profilelist.profile;
  
  
      // Split the name (format is "Lastname,Firstname")
      const [lastName, firstName] = patient["@name"]?.split(",");
  
      // Format date of birth from MM/DD/YYYY to YYYY-MM-DD
      const dobParts = patient["@dob"]?.split("/");
      const formattedDOB = `${dobParts[2]}-${dobParts[0]?.padStart(
        2,
        "0"
      )}-${dobParts[1]?.padStart(2, "0")}`;
  
      // Map gender (M/F to Male/Female)
      const genderMap = {
        M: "Male",
        F: "Female",
      };
  
      // Create the transformed payload
      const absoluteRxPayload = {
        first_name: firstName?.trim() || "",
        middle_name: "", // Middle name not provided in source data
        last_name: lastName?.trim() || "",
        dob: formattedDOB,
        gender: genderMap[patient["@sex"]] || "Unknown",
        email: patient.contactinfo["@email"] || "",
        phone_number: (patient.contactinfo["@homephone"] || "").replace(
          /\D/g,
          ""
        ), // Remove non-numeric characters
        address: {
          street: patient.address["@address1"] || "",
          street_2: patient.address["@address2"] || "",
          city: patient.address["@city"] || "",
          state: patient.address["@state"] || "",
          zip: patient.address["@zip"] || "",
          country: patient.address["@countrycode"] || "USA",
        },
        profile : {
          profile_id: profile["@id"] || "",
          doctor_name: profile["@fullname"] || "",
          doctor_code: profile["@code"] || "",
          status: profile["@status"] || "",
          charge_fee_schedule: profile["@chargefeesched"] || "",
        }
      };
  
      
  
      return absoluteRxPayload;
    } catch (error) {
      console.log("error---", error);
      throw error;
    }
  };
  
  exports.transMedicationtData = (athenaData) => {
    try {
      // Extract patient data from the nested structure
      const medications = (athenaData.drug || []).map((medication) => ({
        id: medication["@id"],
        drug_name: medication["@drugname"],
        strength: medication["@drugstrength"],
        dose_form: medication["@doseform"],
        frequency: medication["@frequency"],
        refills: medication["@refills"],
        start_date: medication["@startdate"],
        quantity: medication["@quantity"],
        duration: medication["@duration"],
        prescription_type: medication["@presctype"],
        signed_by: medication["@signedby"],
      }));
  
      return medications;
    } catch (error) {
      console.log("error---", error);
      throw error;
    }
  };
  