const express = require("express");
const { getPatient, getPatientAdvancedmd, getPatientMedication, getEhrNotes, getEhrTemplates, patientSearch, getEhrUpdatedNotes } = require("../controllers/advancedmd.controller");
const { updateOrderStatus, updateOrderShipping, createOrder } = require("../controllers/lifefile.controller.js");
const { createOrderAbsolute, createPhysicianAbsolute, createLicenseAbsolute, createAllergyAbsolute, createDiseasesAbsolute, createMedicationAbsolute, createPatientAbsolute, getPatientAbsolute, getPhysicianAbsolute, getBbsoluteOrder, getAllOrderList, getAllFailedOrderList } = require("../controllers/absoluterx.controller");
const { fullCreateOrderFlow } = require("../controllers/helper.controller");
const { full_absolute_create_order_flow } = require("../controllers/newadvancedmd.controller.js");
const router = express.Router();

//ADVANCEDMD APIS
//Fetch patient data from advancedmd
// -API URL
router.get("/patient/:patientId", getPatient);
router.get("/patient-medication/:patientId", getPatientMedication);

router.get("/advancedmd-patient", getPatientAdvancedmd);
router.get("/full-order-flow/:patientId", fullCreateOrderFlow);
router.get("/ehrnotes", getEhrNotes);
router.get("/ehrupdatednotes", getEhrUpdatedNotes);
router.get("/ehrtemplates", getEhrTemplates);
router.get("/patient-search", patientSearch);


router.get("/advancedmd-flow", full_absolute_create_order_flow);

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
// from absolute rx fetch order detail by  paitent id and order number
router.get("/get-patient-order-details-from-absolute", getBbsoluteOrder);
router.get("/get-all-order-list-from-absolute", getAllOrderList);
router.get("/get-all-failed-order", getAllFailedOrderList);

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
