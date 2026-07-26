import express from "express"
import morgan from "morgan"
import authRouter from "./routes/auth.routes.js"
import inventoryRouter from "./routes/inventory.routes.js"
import procurementRouter from "./routes/procurement.routes.js"
import supplierRouter from "./routes/supplier.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"
import chatRouter from "./routes/chat.routes.js"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()
app.use(morgan("dev"))

app.use(cors({
    origin(origin, callback) {
        // reflect back whatever origin sent the request (allows all origins)
        return callback(null, true);
    },
    credentials: true,
}));

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
    res.send("Api running")
})

app.use("/api/auth", authRouter)
app.use("/api/inventory", inventoryRouter)
app.use("/api/orders", procurementRouter)
app.use("/api/suppliers", supplierRouter)
app.use("/api/dashboard", dashboardRouter)
app.use("/api/chat", chatRouter)

export default app;