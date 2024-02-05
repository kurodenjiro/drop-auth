const express = require("express");
const mongoose = require("mongoose")
const cors = require("cors")


const app = express();
app.use(cors());
app.use(express.json());

const connect_string = "mongodb+srv://louisdevzz04:vohuunhan1310@cluster0.zmwbg2i.mongodb.net/dropauth?retryWrites=true&w=majority"
const dataSchema = new mongoose.Schema({
    name: {
        required: true,
        type: String
    },
    description: {
        required: true,
        type: String
    },
    start: {
        required: true,
        type: String
    },
    end: {
        required: true,
        type: String
    },
    link:{
        required: true,
        type: Array
    },
    amount:{
        required: true,
        type: String
    }

})
const Model = mongoose.model('Data', dataSchema)
mongoose.connect(connect_string)
const database = mongoose.connection

database.on('error', (error) => {
    console.log(error)
})

database.once('connected', () => {
    console.log('Database Connected');
})

app.get("/api/dropauth/getData",async(req,res)=>{
    const data = await Model.find();
    res.json(data)
})

app.post("/api/dropauth/postData",async(req,res,next)=>{
    const data = new Model({
        name: req.body.name,
        description: req.body.description,
        start: req.body.start,
        end: req.body.end,
        link: req.body.link,
        amount: req.body.amount
    }) 
    try{
        const dataToSave = await data.save();
        res.status(200).json(dataToSave)
    }
    catch(error){
        res.status(400).json({message: error.message})
    }
})

app.listen(8080,()=>{
    console.log(`Server Started at ${8080}`)
})