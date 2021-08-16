const bodyParser = require("body-parser");
const express = require("express");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const PORT = process.env.PORT || 5000;
const app = express();

app.set('view engine', 'ejs');
app.use(express.static("static"));
app.use(express.urlencoded({
  extended: true
}))

app.use(bodyParser.json());

app.get("/login", function (req, res) {
  res.render("login.html");
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.get("/profile", function (req, res) {
  res.render("profile.html");
});

app.get("/", function (req, res) {
  res.render("login.html");
});

app.post('/createUser', (req, res) => {
  const email = req.body.email;
  const password = req.body.pass;
  const name = req.body.name;
  const fatherName = req.body.fatherName;
  const regNo = req.body.regNo;
  const startReg = regNo.substring(0, 3)
  const phone = req.body.phone;
  const age = req.body.age;
  const repass = req.body.re_pass;

  if(password === repass){
    if(password.length >= 8){
      if(phone.length === 10){
        if(regNo.length === 8 && startReg === '121'){
          admin
          .auth()
          .createUser({
            email,    
            password: password,
          })
          .then((userRecord) => {
            
          })
          .catch((error) => {
            console.log('Error creating new user:', error);
          });
        }else{
          res.status(401).send("Registration number provided does not belong to freshmen student")
        }        
      }else{
        res.status(401).send("incorrect phone number provided")
      }
    }else{
      res.status(401).send("Password length should be equal to or greater than 8 characters")
    }
  }else{
    res.status(401).send("password does not match the confirmed password")
  }
  
 
})

app.use(express.static(__dirname + '/public'));

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});