import express from "express";
import { partyRouter, layoutRouter, userRouter } from "./routes";
import authMiddleware from "./middlewares/authMiddlewre";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "*", // Adjust this to your frontend URL
    methods: "GET,POST,PUT,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(authMiddleware);
app.use("/layout", layoutRouter);
app.use("/party", partyRouter);
app.use("/user", userRouter);

app.listen(PORT, (error) => {
  if (error) {
    console.error(`Error starting server: ${error}`);
  } else {
    console.log(`Server is running on http://localhost:${PORT}`);
  }
});
