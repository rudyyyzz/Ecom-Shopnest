<!-- authroutes.js -->
const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getUsers } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { admin } = require("./adminMiddleware");


router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/users", protect , admin , getUsers);

module.exports = router;
<!-- adminMiddleware.js -->
const admin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();     
    } else {
        res.status(403).json({ message: "Access denied. Admins only." });
    }   
};

module.exports = { admin };  


<!-- authmiddleware.js -->
const jwt = require("jsonwebtoken");
const User = require("../model/User");

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select("-password");
            next();
        } catch (error) {
            res.status(401).json({ message: "Not authorized, token failed" });
        }
    } else {
        res.status(401).json({ message: "Not authorized, no token" });
    }
};

module.exports = { protect };

<!-- index.js -->
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
dotenv.config();
connectDB();


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/", (req, res) => {
  res.send("Shopnest Backend is working properly!"); 
});


app.use('/api/auth', require('./routes/authRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

<!-- db.js -->
const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected successfully`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

<!-- user.js -->
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    verified: {
      type: Boolean,
      default: false
    },
    
  
});

module.exports = mongoose.model("User", userSchema);

<!-- authController.js -->
const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");


const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d"
    });
};
// Register a new user
const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    // TODO: Hash the password before saving it to the database for security reasons.
    // TODO: Implement JWT token generation and return it in the response for authentication purposes.
    // TODO: OTP verification can be implemented here if required.
    // TODO: Welcome email can be sent to the user after successful registration.


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);



    const user = User.create({ name, email, password: hashedPassword });
    if(user){
        const opt = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

        const message = `
        Welcome to Shopnest, ${name}! Your registration was successful.
        Your OTP for Shopnest registration is: ${opt}. Please do not share this OTP with anyone.`;

        await sendEmail(email, "Welcome to Shopnest - OTP Verification", message);
        
        res.status(201).json({ 
            _id: user._id,
            name: user.name,
            email: user.email, 
            role: user.role,
            token: generateToken(user._id),       
         }); 
    }
    else{
        res.status(400).json({ message: "Invalid user data" });
    }

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

//Login a user
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try{
        const user = await User.findOne({ email });
        if(user && (await bcrypt.compare(password, user.password))){
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        }else{
            res.status(400).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(400).json({ message: "Server error" }); 
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select("-password"); // Exclude password field from the response
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { registerUser, loginUser, getUsers };
<!-- sendEmail.js -->
const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try{
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        }
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error("Failed to send email");
  }
};