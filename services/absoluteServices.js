const { AbsoluteOrderInfo } = require("../models/absoluteOrderHistry");

exports.saveOrderInDatabse =async(data)=>{
    try{
        return await AbsoluteOrderInfo.save(data)
    }catch(error){
    console.log("🚀 ~ error:", error)

    }
} 
exports.getOrderfromDatabaase = async(filter)=>{
    try{
      return await  AbsoluteOrderInfo.findOne(filter)
    }catch(error){
    console.log("🚀 ~ error:", error)

    }
} 
exports.updateOrderInDatabse = async(query,data)=>{
    try{
      return await  AbsoluteOrderInfo.updateOne(query,data)
    }catch(error){
    console.log("🚀 ~ error:", error)

    }
} 