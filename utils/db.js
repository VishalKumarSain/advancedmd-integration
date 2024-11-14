const mongoose = require("mongoose");
// mongoose.set("strictQuery", true);

exports.connectDB = async () => {
	try {        
		let isConnected = await mongoose.connect("mongodb://localhost:27017/MYADVANCEDMD-TESTING");
		console.log("Advancedmd Database connected successfully.");
	} catch (err) {
        console.log("err--->",err);
        process.exit()
	}
};

