const cookieParser = require("cookie-parser");
// const csrf = require("csurf");
const bodyParser = require("body-parser");
const express = require("express");
const admin = require("firebase-admin");

// const serviceAccount = require("./serviceAccountKey.json");

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://oasis-81f3e-default-rtdb.asia-southeast1.firebasedatabase.app",
// });

// const csrfMiddleware = csrf({ cookie: true });

const PORT = process.env.PORT || 5000;
const app = express();

app.engine("html", require("ejs").renderFile);
app.use(express.static("static"));

app.use(bodyParser.json());
app.use(cookieParser());
// app.use(csrfMiddleware);
app.use(express.static(__dirname + '/public'));

// app.all("*", (req, res, next) => {
//   res.cookie("XSRF-TOKEN", req.csrfToken());
//   next();
// });

app.get("/login", function (req, res) {
  res.render("login.html");
});

app.get("/signup", function (req, res) {
  res.render("signup.html");
});

app.get("/profile", function (req, res) {
  res.render("profile.html");
  // const sessionCookie = req.cookies.session || "";

  // admin
  //   .auth()
  //   .verifySessionCookie(sessionCookie, true /** checkRevoked */)
  //   .then(() => {
  //     res.render("profile.html");
  //   })
  //   .catch((error) => {
  //     res.redirect("/login");
  //   });
});

app.get("/", function (req, res) {
  res.render("login.html");
});

// app.post("/sessionLogin", (req, res) => {
//   const idToken = req.body.idToken.toString();

//   const expiresIn = 60 * 60 * 24 * 5 * 1000;

//   admin
//     .auth()
//     .createSessionCookie(idToken, { expiresIn })
//     .then(
//       (sessionCookie) => {
//         const options = { maxAge: expiresIn, httpOnly: true };
//         res.cookie("session", sessionCookie, options);
//         res.end(JSON.stringify({ status: "success" }));
//       },
//       (error) => {
//         res.status(401).send("UNAUTHORIZED REQUEST!");
//       }
//     );
// });

// app.get("/sessionLogout", (req, res) => {
//   res.clearCookie("session");
//   res.redirect("/login");
// });

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});