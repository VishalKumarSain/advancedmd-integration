const { AbsoluteOrderInfo } = require("../models/absoluteOrderHistry");
const Failed_order = require("../models/order_failure.model");

exports.saveOrderInDatabse =async(data)=>{
    try{
        return await AbsoluteOrderInfo.create(data)
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
exports.getAllOrderfromDatabaase = async(filter)=>{
    try{
      return await  AbsoluteOrderInfo.find({}).sort({_id:-1})
    }catch(error){
    console.log("🚀 ~ error:", error)

    }
} 
exports.getAllFailedOrder = async(filter)=>{
  try{
    return await  Failed_order.find({}).sort({_id:-1})
  }catch(error){
  console.log("🚀 ~ error:", error)

  }
} 