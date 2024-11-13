const express = require("express");
const { getPatient, getPatientAdvancedmd, getPatientMedication, getEhrNotes, getEhrTemplates } = require("../controllers/advancedmd.controller");
const { updateOrderStatus, updateOrderShipping, createOrder } = require("../controllers/lifefile.controller.js");
const { createOrderAbsolute, createPhysicianAbsolute, createLicenseAbsolute, createAllergyAbsolute, createDiseasesAbsolute, createMedicationAbsolute, createPatientAbsolute, getPatientAbsolute, getPhysicianAbsolute } = require("../controllers/absoluterx.controller");
const { fullCreateOrderFlow } = require("../controllers/helper.controller");
const router = express.Router();

//ADVANCEDMD APIS
//Fetch patient data from advancedmd
// -API URL
router.get("/patient/:patientId", getPatient);
router.get("/patient-medication/:patientId", getPatientMedication);

router.get("/advancedmd-patient", getPatientAdvancedmd);
router.get("/full-order-flow/:patientId", fullCreateOrderFlow);
router.get("/ehrnotes", getEhrNotes);
router.get("/ehrtemplates", getEhrTemplates);



// -PATIENT RESPONSE

// -PROVIDER RESPONSE




//ABSOLUTERX API
//CASE 1
// GET PATIENT (IF PATIENT DOES NOT EXISTS THEN WE CREATE A NEW PATIENT)
// CREATE PATIENT
// PATIENT RESPONSE

//GET PHYSICIAN (IF PHYSICIAN DOES NOT EXISTS THEN WE CREATE A NEW PHYSICIAN)
//CREATE PHYSICIAN
//INSUFFICIENT DATA (EMAIL, NPI_NUMBER AND VALID PHONE NUMBER ARE NOT GIVEN)


//CASE 2
// CREATE A PATIENT WITH DUMMY DATA
//PAYLOAD
//RESPONSE


router.post("/create-patient", createPatientAbsolute);
router.get("/fetch-patient", getPatientAbsolute);
router.post("/create-order", createOrderAbsolute);
router.post("/create-physician", createPhysicianAbsolute);
router.post("/fetch-physician", getPhysicianAbsolute);
router.post("/create-licenses", createLicenseAbsolute);
router.post("/create-allergy", createAllergyAbsolute);
router.post("/create-diseases", createDiseasesAbsolute);
router.post("/create-medication", createMedicationAbsolute);


//LIFEFILE APIS
router.post("/create-lifefile-order", createOrder);
// {
//     "success": true,
//     "data": {
//         "type": "success",
//         "message": "Success.",
//         "data": {
//             "orderId": 65145115
//         }
//     },
//     "message": "Order successfully created!"
// }
router.put("/update-order-status", updateOrderStatus);
router.put("/update-shipping-info/:orderId", updateOrderShipping);






module.exports = router;
