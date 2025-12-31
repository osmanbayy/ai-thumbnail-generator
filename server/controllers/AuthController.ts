import { Request, Response } from "express";
import User from "../models/User.js";
import bcrypt from "bcrypt";

export const registerUser = async (request: Request, response: Response) => {
  try {
    const { name, email, password } = request.body;
    if (!name || !email || !password) {
      return response.status(400).json({ message: "All fields are required." });
    }

    // email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return response.status(400).json({
        message: "Invalid email format.",
      });
    }

    // password length check
    if (password.length < 6) {
      return response.status(400).json({
        message: "Password must be at least 6 characters long.",
      });
    }

    // find user by email
    const userIsExist = await User.findOne({ email });
    if (userIsExist) {
      return response.status(400).json({ message: "This email is already in use. Try another one." })
    }

    // encrypt the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // setting user data in session
    request.session.isLoggedIn = true;
    request.session.userId = newUser._id;

    return response.status(201).json({
      message: "Account created successfully.",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      }
    })
  } catch (error) {
    console.error("Error in register user controller: ", error);
    response.status(500).json({ message: "Inernal Server Error." });
  }
}

export const loginUser = async (request: Request, response: Response) => {
  try {
    const { email, password } = request.body;

    // find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return response.status(400).json({ message: "Invalid credentials." });
    }

    // check password correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return response.status(400).json({ message: "Invalid credentials." });
    }

    // setting user data in session
    request.session.isLoggedIn = true;
    request.session.userId = user._id;

    return response.status(201).json({
      message: "Login successful.",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error in login user controller: ", error);
    response.status(500).json({ message: "Inernal Server Error." });
  }
}

export const logoutUser = async (request: Request, response: Response) => {
  request.session.destroy((error: any) => {
    if (error) {
      console.error(error)
      return response.status(500).json({ message: error.message });
    }
  });

  return response.status(201).json({ message: "Logout successful." });

}

export const verifyUser = async (request: Request, response: Response) => {
  try {
    const { userId } = request.session;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return response.status(404).json({ message: "User not found." });
    }

    return response.json({ user });
    
  } catch (error) {
    console.error("Error in verify user controller: ", error);
    response.status(500).json({ message: "Inernal Server Error." });
  }
}
