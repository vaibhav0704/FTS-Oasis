const bodyParser = require("body-parser");
const { response } = require("express");
const ejs = require("ejs");
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

app.get("/", function (req, res) {
  res.render("landing");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/signup", function (req, res) {
  res.render("signup");
});

app.get("/profile", function (req, res) {

  res.render("profile");
});

app.get('/verifyEmail', (req, res) => {
  res.render('emailPage')
})

app.get("/admin/login", (req, res) => {
  res.render('adminLogin')
})

app.get('/admin/dashboard', (req, res) => {
  res.render('dashboard')
})

app.get('/admin/event/:eventName', (req, res) => {  
  const eventRoute = req.params.eventName;
  const studentData = []
  db.collection('Events').doc(eventRoute).collection('registeredStudents').get()
  .then(async (querySnapshot) => {
      try {
        for(const doc of querySnapshot.docs){
          const email = doc.id
          const uid = doc.data(doc.id).uid
          const link = doc.data(doc.id).link
          const newDoc = await db.collection('users').doc(uid).collection('details').doc('details').get()
          const registrationNo = newDoc.data().regNo
          const name = newDoc.data().name
          const phone = newDoc.data().phone
          studentData.push({"regNo": registrationNo, "name": name, "phone": phone, "email": email, "link": link})
          
        }
        res.render('table', {
          'title': eventRoute,
          'data': studentData,
        })
      }
      catch(err){
        console.log(err)
      }   
  })
  

})

app.post('/admin/getEventData', (req, res) => {

})

app.post('/createUser', (req, res) => {
  const email = req.body.email;
  const password = req.body.pass;
  const name = req.body.name;
  const regNo = req.body.regNo;
  const startReg = regNo.substring(0, 3)
  const phone = req.body.phone;
  const repass = req.body.re_pass;
  const department = req.body.department;
  const course = req.body.course
  const saltRounds = 10;
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
                  regNo,
                  phone,
                  department,
                  course,
                  role: 'USER'
                }
                db.collection("users").doc(userRecord.uid).collection('details').doc('details').set(record)
                .then(() => {
                  res.json({ token: 'done'});
                })
                .catch((error) => {
                  console.log("Error writing document: ", error);
                })
              })
              .catch((error) => {
                res.status(401).send("You already have an account try login GO BACK")
              });  
            }else{
              console.log(err)
            }  
          });
        }else{
          res.status(401).send("Registration number provided does not belong to freshmen student GO BACK")
        }        
      }else{
        res.status(401).send("incorrect phone number provided GO BACK")
      }
    }else{
      res.status(401).send("Password length should be equal to or greater than 8 characters GO BACK")
    }
  }else{
    res.status(401).send("password does not match the confirmed password GO BACK")
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
              res.status(401).send('could not authenticate')
            });        
          }else{
            
            res.status(401).send("Password that you have entered is invalid GO BACK AND LOGIN AGAIN")
          }
        });        
      } else {
          
          // doc.data() will be undefined in this case
          console.log("No such document!");
      }
    }).catch((error) => {
      
        res.status(401).send('Email is not registered with us GO BACK AND LOGIN AGAIN OR REGISTER IF YOU HAVEN\'T')
    });    
  })
  .catch((error) => {    
    res.json({ token: 'noUser' })
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
                    userInfo.eventList.push({"name": doc.id, "bool": doc.data(doc.id).link})

                });
              res.json(userInfo)
            });
                
          }else {
            userInfo.userImgUrl = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
            db.collection('users').doc(uid).collection('eventsRegistered').get()
                .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                  userInfo.eventList.push({"name": doc.id, "bool": doc.data(doc.id).link})
                });
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

  admin
  .auth()
  .getUserByEmail(email)
  .then((userRecord) => {
    if(userRecord.emailVerified){
      events.forEach((event) => {
        db.collection('users').doc(uid).collection('eventsRegistered').doc(event).set({
          registered: true,
          link:false      
        })
        .then(() => {
          db.collection('Events').doc(event).collection("registeredStudents").doc(email).set({
            uid:uid,
            link: ""
          })
          .then(() => {
            res.status(200)
          })
          .catch(err => {
            console.log(err)
          })
        })
        .catch((error) => {
            console.error("Error writing document: ", error);
        })
      })    
    }else {
      res.status(401).send('You are unauthorized to register for events. Verify your email first')
    }    
  })
  .catch((error) => {
    console.log('Error fetching user data:', error);
  });
})

app.post('/uploadLinks', (req, res) => {
  const link = req.body.link;
  const event = req.body.event;
  const email = req.body.email
  const uid = req.body.uid

  admin
  .auth()
  .getUserByEmail(email)
  .then((userRecord) => {
    if(userRecord.emailVerified) {
      db.collection('Events').doc(event).collection("registeredStudents").doc(email).set({
        uid:uid,
        link:link
      })
      .then(() => {
        db.collection('users').doc(uid).collection('eventsRegistered').doc(event).set({
          registered: true,
          link: true
        })
        .then(() => {
          res.json({ token: 'done' })
        })
      })
      .catch(err => {
        console.log(err)
      })
    }
  })
  .catch(err => {
    res.status(401).send('You are unauthorized to register for events. Verify your email first');
  })
})

app.post('/getEventsData', (req, res) => {
  const idToken = req.body.idToken
  const eventList = ['MelodySiesta','DanceTillDawn','MrAndMrsFreshmen', 'StealTheSpotlight', 'CanvasThrill','SpecialTalent',
    'ClickSnick', 'VideoEditingCreativeFusion','AnimationDesk','ProGraphix', 'CODTournament','Valorant', 'PoeticTrails','EssayInkYourImagination',
    'MasterMinds', 'WebOMania', 'HackTheNoon']
  admin
  .auth()
  .verifyIdToken(idToken)
  .then((decodedToken) => {
    const uid = decodedToken.uid
    const docReference = db.collection('users').doc(uid).collection('details').doc('details')
    docReference.get().then((doc) => {
      if(doc.exists){
        if(doc.data().role === 'ADMIN'){
          async function getEventData() {
            try {
                const eventData = [];
        
                await Promise.all(eventList.map(async event => {
                    const querySnapshot = await db.collection('Events').doc(event)?.collection('registeredStudents')?.get();
                    eventData.push({"id": event, "number": querySnapshot.size});
                }));
                
                res.json(eventData);
            } catch (exception) {
              console.log(exception)
            }
        }
        getEventData()

        }
        else{
          res.json({ token: "fail" })
        }
      }
      else{
        res.status(401)
      }
    })
    .catch((err) => {
      console.log(2)
      console.log(err)
    })
  })
  .catch((error) => {
    res.status(401).send('could not identify you please log in')
  });
})

app.use(express.static(__dirname + '/public'));

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
