const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const moment = require("moment-timezone");

// Cron to run at 10:00 AM, 2:00 PM, and 6:00 PM New York time
cron.schedule(
  "0 10,14,18 * * *",
  () => {
    const time = moment().tz("America/New_York").format("HH:mm");
    console.log("Cron Job Triggered!", time);
  },
  { timezone: "America/New_York" }
);
module.exports = router;
