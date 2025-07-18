const bcrypt = require('bcrypt');
const saltRounds = 10;
const password = 'E=mc@0101';

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error generating hash:', err);
        return;
    }
    console.log('Generated hash:', hash);
});