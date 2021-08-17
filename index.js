const bodyParser = require("body-parser");
const { response } = require("express");
const express = require("express");
const admin = require("firebase-admin");
const bcrypt = require ('bcrypt');

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
  res.render("login");
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.get("/profile", function (req, res) {

  res.render("profile");
});

app.get("/", function (req, res) {
  res.render("login");
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

  const saltRounds = 10;
  console.log(password)

  if(password === repass){
    if(password.length >= 8){
      if(phone.length === 10){
        if(regNo.length === 8 && startReg === '121'){
          bcrypt.hash(password, saltRounds, function(err, hash) {
            if(hash) {
              admin
              .auth()
              .createUser({
                email,    
                password: password,
              })
              .then((userRecord) => {
                const record = {
                  email,
                  password: hash,
                  name,
                  fatherName,
                  regNo,
                  phone,
                  age,
                  role: 'USER'
                }
                db.collection("users").doc(userRecord.uid).collection('details').doc('details').set(record)
                .then(() => {
                  res.status(200).redirect('/login');
                })
                .catch((error) => {
                  console.log("Error writing document: ", error);
                })
              })
              .catch((error) => {
                res.status(401).send("You already have an account try login")
              });  
            }else{
              console.log(err)
            }  
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

app.post('/getToken', (req, res) => {
  const email = req.body.email
  const password = req.body.password

  admin
  .auth()
  .getUserByEmail(email)
  .then((userRecord) => {
    const uid = userRecord.uid;
    var docRef = db.collection('users').doc(uid).collection('details').doc('details')
    docRef.get().then((doc) => {
      if (doc.exists) {
        const dataPassword = doc.data().password;
        bcrypt.compare(password, dataPassword, function(err, result) {
          if(result) {
            admin
            .auth()
            .createCustomToken(uid)
            .then((customToken) => {
              res.json({ token: customToken });
            })
            .catch((error) => {
              console.log('Error creating custom token:', error);
            });        
          }else{
            res.status(401).send("Password that you have entered is invalid")
          }
        });        
      } else {
          // doc.data() will be undefined in this case
          console.log("No such document!");
      }
    }).catch((error) => {
        res.status(401).send('Email is not registered with us')
    });    
  })
  .catch((error) => {
    console.log('Error fetching user data:', error);
  });

})

app.post('/getUser', (req, res) => {
  const idToken = req.body.idToken
  let userInfo = {}
  admin
  .auth()
  .verifyIdToken(idToken)
  .then((decodedToken) => {
    const uid = decodedToken.uid;
    const docReference = db.collection('users').doc(uid).collection('details').doc('details')
    docReference.get().then((doc) => {
      if(doc.exists) {
        userInfo = {
          userName: doc.data().name,
          userEmail: doc.data().email,
          userPhone: doc.data().phone,
          userRegNo: doc.data().regNo,
          userUid: uid,
          userImgUrl: '',
          eventList: []
        }

        db.collection('users').doc(uid).collection('profileImage').doc('imageUrl').get()
        .then((doc) => {
          if(doc.exists) {
            userInfo.userImgUrl = doc.data().imgUrl

            db.collection('users').doc(uid).collection('eventsRegistered').get()
                .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    userInfo.eventList.push(doc.id)

                });
                console.log(userInfo)
              res.json(userInfo)
            });
                
          }else {
            userInfo.userImgUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
            db.collection('users').doc(uid).collection('eventsRegistered').get()
                .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    userInfo.eventList.push(doc.id)
                    
                });
                console.log(userInfo)
              res.json(userInfo)
            });           
          }         
        })
      }else{
        console.log('no such doc exists')
      }  
    }).catch((err) => {
      console.log(err)
    })
  })
  .catch((error) => {
    res.status(401).send('could not identify you please log in')
  });

})

app.post('/setImageUrl', (req, res) => {
  const uid = req.body.uid
  const url = req.body.imgUrl
  
  db.collection('users').doc(uid).collection('profileImage').doc('imageUrl').set({
    imgUrl: url
  })
  res.json({msg: 'done'})
})

app.post('/registerEvents', (req, res) => {
  const uid = req.body.uid
  const events = req.body.events
  const email = req.body.email

  events.forEach((event) => {
    db.collection('users').doc(uid).collection('eventsRegistered').doc(event).set({
      registered: true      
    })
    .then(() => {
      db.collection('Events').doc(event).collection("registeredStudents").doc(email).set({
        uid:uid
      })
    })
    .catch((error) => {
        console.error("Error writing document: ", error);
    })
  })
})

app.use(express.static(__dirname + '/public'));

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});