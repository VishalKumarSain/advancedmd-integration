const mongoose = require("mongoose");
// mongoose.set("strictQuery", true);

exports.connectDB = async () => {
	try {        
		let isConnected = await mongoose.connect(process.env.MONGODB_URI);
		console.log("Advancedmd Database connected successfully.");
	} catch (err) {
        console.log("err--->",err);
        process.exit()
	}
};

