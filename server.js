const express = require('express');
const bodyParser = require('body-parser');
const {MongoClient} = require('mongodb');

const app = express();
const dbUrl = "mongodb://localhost:27017/exercice-tracker"

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/view/index.html");
});

app.post("/api/exercise/new-user", (req, res) => {
    const userName = req.body.username;
    if(userName == ""){
        res.json({error: "user can not be empty"});
        return;
      };
    (async () => {
        const client = new MongoClient(dbUrl, { useNewUrlParser: true });
        try {
            await client.connect()
            const db = client.db();
            const users = db.collection('users');
            const counter = db.collection('counter');
            const isUser = await users.findOne({userName: userName});
            if(isUser){
              res.json({error: 'username already taken'})
            }else{
              const id = await counter.findOneAndUpdate({_id: 'userId'}, {$inc: {id : 1}}, {returnOriginal: false, upsert: true});
              await users.insertOne({_id: id.value.id, userName: userName});
              res.json({userName, id: id.value.id});
            }
        } catch (error) {
            console.log(error)
        }
        client.close()
    })();
  
});
app.post("/api/exercise/add", (req, res) => {
    const userId = +req.body["user-id"];
    const description = req.body.description;
    const duration = req.body.duration;
    let date = '';
    if(userId ==='' || description ==='' || duration ===''){
        res.json({error : "user id, description , duration cannot be empty"});
        return;
    };
    if(req.body.date === ''){
        const d = new Date();
        const m = (d.getMonth() + 1) > 9 ? (d.getMonth() + 1) : '0' + (d.getMonth() + 1);
        const j = d.getDate() > 9 ? d.getDate() : '0' + d.getDate();
        date = d.getFullYear() + '-' + m + '-' + j;
    }else if(/\d{4}-\d{2}-\d{2}/.test(req.body.date) && !isNaN(new Date(req.body.date))){
        date = req.body.date;
    }else{
        res.json({error: "Invalid date"});
        return;
    }
    
    (async () => {
        const client = new MongoClient(dbUrl, { useNewUrlParser: true });
        try {
            await client.connect()
            const db = client.db();
            const users = db.collection('users');
            const exercise = db.collection('exercises');
            const isUser = await users.findOne({_id: userId});
            if(!isUser){
              res.json({error: 'user id not found'})
            }else{
              await exercise.insertOne({userId, description,duration, date});
              res.json({userId, userName: isUser.userName, description, duration, date});
            }
        } catch (error) {
            console.log(error)
        }
        client.close()
    })();  
});

app.get("/api/exercise/users", (req, res) => {
    (async () => {
        const client = new MongoClient(dbUrl, { useNewUrlParser: true });
        try {
            await client.connect()
            const db = client.db();
            const users = db.collection('users');
            const userList = await users.find();
            const listOfUsers = [];
            while(await userList.hasNext()) {
                const doc = await userList.next();
                listOfUsers.push(doc);
              }
            res.json(listOfUsers);
           
        } catch (error) {
            console.log(error)
        }
        client.close()
    }
    )();
});
app.get("/api/exercise/log", (req, res) => {
    const userId = +req.query.userId;
    const limit = +req.query.limit || 0;
    const from = req.query.from;
    const to = req.query.to;
    const filter = {
        userId
    };
    if(/\d{4}-\d{2}-\d{2}/.test(from) && !isNaN(new Date(from))){
        filter.date = {...filter.date,...{$gte : from}};
    };
    if(/\d{4}-\d{2}-\d{2}/.test(to) && !isNaN(new Date(to))){
        filter.date = {...filter.date,...{$lte : to}};
    };
    (async () => {
        const client = new MongoClient(dbUrl, { useNewUrlParser: true });
        try {
            await client.connect()
            const db = client.db();
            const users = db.collection('users');
            const exercise = db.collection('exercises');
            const user = await users.findOne({ _id: userId });
            const exerciseList = await exercise.find(filter, { projection: { _id: 0, userId: 0 }, limit: limit });
            const listOfExercises = [];
            while (await exerciseList.hasNext()) {
                const doc = await exerciseList.next();
                listOfExercises.push(doc);
            }
            res.json({ _id: user._id, username: user.userName, count: listOfExercises.length, log: listOfExercises });

        } catch (error) {
            console.log(error)
        }
        client.close()
    }
    )();
});

app.listen(3000, () => {
    console.log("server listen on port 3000");
})