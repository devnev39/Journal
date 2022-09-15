const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");

const app = express();

app.use(express.static(__dirname+"/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

app.set("view engine","ejs");

mongoose.connect("mongodb+srv://devnev:Password-123@cluster0.uayzvos.mongodb.net/journalDB",{useNewUrlParser : true});

const postSchema = {
    title : String,
    content : String
}

const journalSchema = {
    name : String,
    posts : [postSchema]
}

const Journal = mongoose.model("journal",journalSchema);
const Post = mongoose.model("post",postSchema);

const getPostsFromDb = async () => {
    const result = await Journal.find();
    if(result.length){
        return result[0];
    }
    return undefined;
}

const sendPostsResponse = async (res) => {
    let result = await getPostsFromDb();
    if(!result){
        result = [];
    }
    res.render("home",{title : "Home",posts : result.posts, journalName : result.name});
}

app.get("/",(req,res) => {
    sendPostsResponse(res); 
});

app.get("/journals/:journalName",async (req,res) => {
    const result = await Journal.find({name : req.params.journalName});
    if(result.length){
        res.render("home",{title : "Home",posts : result[0].posts,journalName : result[0].name});
    }else{
        res.render("home",{title : "Home",posts : [], journalName : "None"});
    }
});

app.get("/home",(req,res) => {
    sendPostsResponse(res);
});

app.get("/journals/:journalName/:post",async (req,res) => {
    const postReq = _.lowerCase(req.params.post);
    const journal = req.params.journalName;

    if(postReq == "home")
        res.redirect("/")
    
    if(postReq == "about")
        res.redirect("/about")

    if(postReq == "contact")
        res.redirect("/contact")

    const result = await Journal.find({name : journal});
    if(result.length){
        const ind = _.findIndex(result[0].posts,function(o){
            return _.lowerCase(o.title) == postReq;
        });
        if(ind != -1)
            res.render("post",{title : "Posts", post : result[0].posts[ind], journalName : journal});
        else 
            res.render("post",{title : "Posts", posts : {title : "No posts found !"}});   
    }else{
        res.render("post",{title : "Post", posts : {title : `No journal named ${journal} found !`}});
    }
});

app.get("/about",(req,res) => {
    res.render("about",{title : "About Us"});
});

app.get("/contact",(req,res) => {
    res.render("contact",{title : "Contact Us"});
});

app.get("/compose",async (req,res) => {
    const result = await Journal.find();
    res.render("compose",{title : "Publish", journals : result});
});

app.get("/journals",async (req,res) => {
    const result = await Journal.find();
    res.render("journals",{title : "Journals", journals : result});
});

app.post("/",async (req,res) => {
    console.log(req.body);
    const post = new Post({
        title : req.body.title,
        content : req.body.content
    });
    const result = await Journal.find({name : req.body.journalName});
    console.log(result);
    if(result.length){
        result[0].posts.push(post);
        result[0].save();
    }else{
        const newJournal = new Journal({
            name : req.body.journalName,
            posts : [post]
        });
        newJournal.save();
    }
    res.redirect("/");
});

app.post("/operation/:journalName",async (req,res) => {
    const journalName = req.params.journalName;
    console.log(req.body);
    const isSave = req.body.toSave;
    const journal = await Journal.find({name : journalName});
    if(isSave){
        if(journal.length){
            for(let post of journal[0].posts){
                if(post._id.toString() == req.body.postID){
                    post.title = req.body.title;
                    post.content = req.body.content;
                }
            }
            const result = await journal[0].save();
            console.log(result);
            res.redirect(`../journals/${journalName}`);
        }
    }else{
        if(journal.length){
            _.remove(journal[0].posts,function(o){
                return o._id.toString() == req.body.postID;
            });
            journal[0].markModified("posts"); // Works here
            const result = await journal[0].save(); 
            console.log(result);
            res.redirect(`../journals/${journalName}`);
        }
    }
});

const PORT = process.env.PORT;

app.listen(3000,() => {
    console.log(`Server up and running on port ${PORT} !`);
});