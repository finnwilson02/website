const bcrypt = require('bcrypt');
const saltRounds = 10; // Matches your $2b$10$ (cost factor 10)
const myPassword = 'Pegasus2015'; // Change this

bcrypt.hash(myPassword, saltRounds, (err, hash) => {
  if (err) console.error(err);
  console.log('New Hash:', hash);
});
