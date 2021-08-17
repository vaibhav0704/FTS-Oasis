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
        console.log("Error getting document:", error);
    });    
  })
  .catch((error) => {
    console.log('Error fetching user data:', error);
  });

})

app.post('/getUser', (req, res) => {
  const idToken = req.body.idToken
  admin
  .auth()
  .verifyIdToken(idToken)
  .then((decodedToken) => {
    const uid = decodedToken.uid;
    const docReference = db.collection('users').doc(uid).collection('details').doc('details')
    docReference.get().then((doc) => {
      const userInfo = {
        userName: doc.data().name,
        userEmail: doc.data().email,
        userPhone: doc.data().phone,
        userRegNo: doc.data().regNo,
        userUid: uid,
      }
      res.json(userInfo)
    }).catch((err) => {
      console.log(err)
    })
  })
  .catch((error) => {
    console.log(err)
  });

})

app.post('/setImageUrl', (req, res) => {
  const uid = req.body.uid
  const imgUrl = req.body.imgUrl
  
  
})

app.use(express.static(__dirname + '/public'));

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});


// var firebaseConfig = {
//   apiKey: "AIzaSyDBEvY6J88DhlPfUFs27CJdFqMflF9cu80",        
//   authDomain: "oasis-81f3e.firebaseapp.com",        
//   databaseURL: "https://oasis-81f3e-default-rtdb.asia-southeast1.firebasedatabase.app",        
//   projectId: "oasis-81f3e",        
//   storageBucket: "oasis-81f3e.appspot.com",        
//   messagingSenderId: "691297823995",        
//   appId: "1:691297823995:web:10ffd1fc1684882256545e",        
//   measurementId: "G-3ZGYCCQD6R"        
// };

// // Initialize Firebase
// firebase.initializeApp(firebaseConfig);

// var db = firebase.firestore();

// const signout = () => {
//     firebase.auth().signOut().then(() => {
//         window.location.assign("/");
//     }).catch((error) => {
//         console.log(error)
//     });
// }

//     const uploadImage = () => {
//         const ref = firebase.storage().ref()
//         const file = document.getElementById("photo").files[0]
//         firebase.auth().onAuthStateChanged((user) => {                
//             uid = user.uid;
//             const name = uid;
            
//             const metadata ={
//                 contentType: file.type
//             }
//             const task = ref.child(name).put(file, metadata)

//             task
//             .then(snapshot => snapshot.ref.getDownloadURL())
//             .then(url => {
//                 db.collection('users').doc(uid).collection('profileImage').doc('imageUrl').set({
//                     imgUrl: url,
//                 })
//                 .then(() => {
//                     window.location.assign("/profile");
//                 })
//                 .catch((error) => {
//                     console.error("Error writing document: ", error);
//                 })
//             })
//         })                
//     }


// firebase.auth().onAuthStateChanged((user) => {
//     if(user){
//         var uid = user.uid;
//         var docRef = db.collection('users').doc(uid).collection('details').doc('details')
//         docRef.get().then((doc) => {
//             if (doc.exists) {
//             document.getElementById('userName').innerHTML = doc.data().name
//             document.getElementById('userEmail').innerHTML = doc.data().email
//             document.getElementById('userPhone').innerHTML = doc.data().phone
//             } else {
//                 // doc.data() will be undefined in this case
//                 console.log("No such document!");
//             }
//         }).catch((error) => {
//             console.log("Error getting document:", error);
//         });            
//         var eventRef = db.collection('users').doc(uid).collection('eventsRegistered').get()
//             .then((querySnapshot) => {
//             querySnapshot.forEach((doc) => {
//                 var elementId = doc.id;
//                 document.getElementById(elementId).style.display = "none";
//                 const list = document.createElement("li");
//                 const node = document.createTextNode(elementId);
//                 list.appendChild(node);
//                 const element = document.getElementById("userRegEvents");
//                 element.appendChild(list);
//             });
//         });
//         var imageRef = db.collection('users').doc(uid).collection('profileImage').doc('imageUrl')
//         imageRef.get().then((doc) => {
//             if(doc.exists){
//                 document.getElementById('userProfile').src = doc.data().imgUrl
//                 document.getElementById('uploadButton').style.display = 'none';
//             } else{
//                 document.getElementById('userProfile').src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
//             }
//         })               

//         document.getElementById("eventForm").addEventListener("submit", (event) => {
//             event.preventDefault();
//             const checkboxes = document.querySelectorAll('input[name="event"]:checked');
//             let events = [];
//             checkboxes.forEach((checkbox) => {
//                 events.push(checkbox.value);
//             });                
//             events.forEach((event) => {
                
//                 db.collection('Events').doc(event).collection("registeredStudents").doc(user.email).set({
//                     uid:user.uid
//                 })
//                 .then(() => {
//                     db.collection('users').doc(user.uid).collection('eventsRegistered').doc(event).set({
//                         registered: true
//                     })
//                     .then(() => {
//                         console.log("Done")
//                     })
//                     .catch((error) => {
//                         console.error("Error writing document: ", error);
//                     })
//                 })
//                 .catch((error) => {
//                     console.error("Error writing document: ", error);
//                 });
//             })
//             window.alert("You have successfully registered for the events! See ya there");                    
//         })   
    
//     }else{
//         window.location.assign("/");
//     }
// })