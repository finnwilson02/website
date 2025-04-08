const bcrypt = require('bcrypt');
const saltRounds = 10; // Recommended salt rounds
const plainPassword = 'finnwilson'; // Using the same password from before for simplicity

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
    if (err) {
        console.error("Error hashing password:", err);
        return;
    }
    console.log("Plain Password:", plainPassword);
    console.log("Hashed Password:", hash);
    console.log("\nCopy the 'Hashed Password' value and store it securely.");
});