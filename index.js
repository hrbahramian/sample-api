const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const api = require('./api');

passport.use(new LocalStrategy(
   { usernameField: 'email' },
   (email, password, done) => {
      console.log('Inside local strategy callback');     
      api.login(email, password)
         .then(x => {
            console.log(x);
            if (x.isValid) {
               let user = { id: x.id, name: x.name, email: email };
               console.log(user);
               return done(null, user);
            } else {
               console.log('The email or password is not valid.');
               return done(null, false, 'The email or password was invalid');
            }
         })
         .catch(e => {
            console.log(e);
            return done(e);
         });
   }
));

passport.serializeUser((user, done) => {
   console.log('Inside serializeUser callback. User id is save to the session file store here')
   done(null, user.id);
});
passport.deserializeUser((id, done) => {
   console.log('Inside deserializeUser callback')
   console.log(`The user id passport saved in the session file store is: ${id}`)
   const user = {id: id}; 
   done(null, user);
 });

const application = express();
const port = process.env.PORT || 4002;

application.use(express.json());
application.use(cors());

application.use(session({
   genid: (request) => {
      //console.log(request); 
      console.log('Inside session middleware genid function')
      console.log(`Request object sessionID from client: ${request.sessionID}`)

      return uuid(); // use UUIDs for session IDs
   },
   store: new FileStore(),
   secret: 'some random string',
   resave: false,
   saveUninitialized: true
}));
application.use(passport.initialize());
application.use(passport.session());

application.get('/add/:n/:m', (request, response) => {
   if(request.isAuthenticated()) {
      let n = Number(request.params.n);
      let m = Number(request.params.m);
      let sum = api.add(n, m);
      response.send(`${n} + ${m} = ${sum}`);
   } else {
      response.status(401).json({done: false, message: 'Please sign in first.'});
   }
   
});


application.get('/customers', (request, response) => {
   api.getCustomers()
      .then(x => {
         console.log(x);
         response.json(x);
      })
      .catch(e => {
         console.log(e);
         response.status(500).json({ message: 'There was an error in retrieving the customers.' });
      });
});


application.post('/register', (request, response) => {
   let name = request.body.name;
   let email = request.body.email;
   let password = request.body.password;
   api.addCustomer(name, email, password)
      .then(x => response.json({ done: true, message: 'The customer added.' }))
      .catch(e => {
         console.log(e);
         response.json({ done: false, message: 'We could not add the customer to the system.' });
      });
});

application.get('/login', (req, res) => {
   console.log('Inside GET /login callback')
   console.log(req.sessionID)
   res.send(`You got the login page!\n`)
 })


application.post('/login', (request, response, next) => {
   console.log('Inside POST /login callback')
   passport.authenticate('local', (err, user, info) => {
     console.log('Inside passport.authenticate() callback');
     console.log(`req.session.passport: ${JSON.stringify(request.session.passport)}`);
     console.log(`req.user: ${JSON.stringify(request.user)}`);
     request.login(user, (err) => {
       console.log('Inside req.login() callback')
       console.log(`req.session.passport: ${JSON.stringify(request.session.passport)}`)
       console.log(`req.user: ${JSON.stringify(request.user)}`)
       return response.json({ done: true, message: 'The customer logged in.' });;
     })
   })(request, response, next);   
});


application.listen(port, () => console.log(`The application is listening to port ${port}`));

let PrivateRoute = ({ children, ...rest }) => {
  let customer = localStorage.getItem('customer');
  return (
    <Route
      {...rest}
      render={({ location }) =>
        customer ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: location }
            }}
          />
        )
      }
    />
  );
}

