import express from "express";
import {
  partyRouter,
  layoutRouter,
  userRouter,
  authRouter,
  googleRouter,
  calendarRouter,
  MomentRouter,
  hostInvitationsRouter,
  testRouter,
  invitationsRouter,
  guestRouter,
} from "./routes";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: "GET,POST,PUT,DELETE",
    credentials: true, // Allow cookies to be sent
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/", testRouter);
app.use("/layout", layoutRouter);
app.use("/party", partyRouter);
app.use("/guest", guestRouter);
app.use("/user", userRouter);
app.use("/auth", authRouter);
app.use("/google", googleRouter);
app.use("/calendar", calendarRouter);
app.use("/moment", MomentRouter);
app.use("/host-invitations", hostInvitationsRouter);
app.use("/invitations", invitationsRouter);

app.listen(PORT, (error) => {
  if (error) {
    console.error(`Error starting server: ${error}`);
  } else {
    console.log(`Server is running on http://localhost:${PORT}`);
  }
});
