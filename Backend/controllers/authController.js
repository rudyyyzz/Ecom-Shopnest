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
  console.log(req.body);  
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



    const user = await User.create({ name, email, password: hashedPassword });
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
