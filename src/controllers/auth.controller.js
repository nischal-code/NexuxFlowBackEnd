import { userModel } from "../models/user.model.js";
import crypto from "crypto"
import jwt from "jsonwebtoken"
import config from "../config/config.js"
import { token } from "morgan";
import sessionModel from "../models/session.model.js";
import sendEmail from "../services/email.service.js";
import { generateOtp, getOtpHtml } from "../utils/utils.js";
import otpModel from "../models/otp.model.js";
import strict from "assert/strict";

export async function register(req, res) {
    const { username, email, password } = req.body;
    const isAlreadyRegister = await userModel.findOne({
        $or: [
            { username },
            { email }
        ]
    })
    if (isAlreadyRegister) {
        return res.status(409).json({
            message: "username or email already exist"
        })
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex")
    const user = await userModel.create({
        username,
        email,
        password: hashedPassword
    })

    // const refreshToken = jwt.sign({
    //     id: user._id,
    // }, config.jwt_Secret,
    //     {
    //         expiresIn: "7d",
    //     })

    // const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    // const session = await sessionModel.create({
    //     user: user._id,
    //     refreshTokenHash,
    //     ip: req.ip,
    //     userAgent: req.headers["user-agent"]
    // })

    // const accessToken = jwt.sign({
    //     id: user._id,
    //     sessionId: session._id
    // }, config.jwt_Secret,
    //     {
    //         expiresIn: "15m"
    //     })

    // res.cookie("refreshToken", refreshToken, {
    //     httpOnly: true,
    //     secure: true,
    //     sameSite: "strict",
    //     maxAge: 7 * 24 * 60 * 60 * 1000
    // })

    const otp = generateOtp();
    console.log(otp)
    const html = getOtpHtml(otp);
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    await otpModel.create({
        email,
        user: user._id,
        otpHash
    })

    await sendEmail(email, "OTP verification", `your otp is ${otp}`, html)
    res.status(201).json({
        message: "User registered successfully.",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        },
        // accessToken,
    })
}
export async function login(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email })
    if (!user) {
        return res.status(401).json({
            message: "invalid email or password"
        })
    }
    if (!user.verified) {
        return res.status(401).json({
            message: "User not verified."
        })
    }

    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    const isPasswordValid = hashedPassword === user.password;

    if (!isPasswordValid) {
        return res.status(401).json({
            message: "invalid email or password"
        })
    }
    const refreshToken = jwt.sign({
        id: user._id,
    }, config.jwt_Secret, {
        expiresIn: "7d"
    }
    )
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.create({
        user: user._id,
        refreshTokenHash,
        ip: req.ip,
        userAgent: req.headers["user-agent"]
    })

    const accessToken = jwt.sign({
        id: user._id,
        sessionId: session._id
    }, config.jwt_Secret, {
        expiresIn: "15m"
    })
    res.cookie("refreshToken", refreshToken, config.refreshCookieOptions)

    res.status(200).json({
        message: "loged in successfully.",
        user: {
            username: user.username,
            email: user.email
        },
        accessToken
    })
}
export async function getMe(req, res) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            message: "token not found"
        })
    }
    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt_Secret)
    } catch (err) {
        return res.status(401).json({
            message: "invalid or expired token"
        })
    }
    const user = await userModel.findById(decoded.id)
    if (!user) {
        return res.status(401).json({
            message: "user not found"
        })
    }
    res.status(200).json({
        message: "user fetched successfully.",
        user: {
            username: user.username,
            email: user.email,
        }
    })
}

export async function refreshToken(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "refresh token not found"
        })
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, config.jwt_Secret)
    } catch (err) {
        // expired/tampered refresh token -> clean 401 instead of an
        // unhandled throw inside this async handler
        res.clearCookie("refreshToken", config.refreshCookieOptions)
        return res.status(401).json({
            message: "invalid or expired refresh token"
        })
    }

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false
    })
    if (!session) {
        return res.status(401).json({
            message: "Invalid refresh token"
        })
    }

    const accessToken = jwt.sign({
        id: decoded.id
    }, config.jwt_Secret,
        {
            expiresIn: "15m"
        })


    const newRefreshToken = jwt.sign({
        id: decoded.id
    }, config.jwt_Secret,
        {
            expiresIn: "7d"
        })

    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();
    res.cookie("refreshToken", newRefreshToken, config.refreshCookieOptions)
    res.status(200).json({
        message: "Access token refreshed successfully.",
        accessToken
    })
}

export async function logout(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({
            message: "refresh token not found"
        })
    }
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const session = await sessionModel.findOne({
        refreshTokenHash,
        revoked: false,
    })
    if (!session) {
        return res.status(400).json({
            message: "invalid refresh token"
        })
    }
    session.revoked = true;
    await session.save()

    res.clearCookie("refreshToken", config.refreshCookieOptions)
    res.status(200).json({
        message: "Logged out successfully"
    })
}

export async function logoutAll(req, res) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({
            message: "Refresh token not found"
        })

    }
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, config.jwt_Secret)
    } catch (err) {
        res.clearCookie("refreshToken", config.refreshCookieOptions)
        return res.status(401).json({
            message: "invalid or expired refresh token"
        })
    }

    await sessionModel.updateMany({
        user: decoded.id,
        revoked: false
    }, {
        revoked: true
    })
    res.clearCookie("refreshToken", config.refreshCookieOptions)
    res.status(200).json({
        message: "logged out from all devices successfully"
    })
}

export async function verifyEmail(req, res) {
    const { otp, email } = req.body;
    console.log(otp)

    if (!otp || !email) {
        return res.status(400).json({
            message: "Email and OTP are required"
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const otpHash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");

    const otpDoc = await otpModel.findOne({
        email: normalizedEmail,
        otpHash
    });

    if (!otpDoc) {
        return res.status(400).json({
            message: "Invalid OTP"
        });
    }

    const user = await userModel.findByIdAndUpdate(
        otpDoc.user,
        { verified: true },
        { new: true } // return the updated doc, not the old one
    );

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    await otpModel.deleteMany({ email: normalizedEmail });

    return res.status(200).json({
        message: "email verified successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    });
}

