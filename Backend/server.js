const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const storeRoutes = require('./routes/StoreRoutes');
const userRoutes = require('./routes/UserRoutes');

dotenv.config(); // chỉ cần thế này

connectDB();

const app = express();
app.use(express.json());

app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
