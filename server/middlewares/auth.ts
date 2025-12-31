import { NextFunction, Request, Response } from "express";

const protect = async (request: Request, response: Response, next: NextFunction) => {
  const { isLoggedIn, userId } = request.session;
  if(!isLoggedIn || !userId) {
    return response.status(401).json({ message: "You are not logged in." });
  }

  next();
}

export default protect