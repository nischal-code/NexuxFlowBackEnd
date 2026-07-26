export function generateOtp(){
    return Math.floor(100000 +Math.random() * 90000).toString()
}
export function getOtpHtml(otp){
    return `<!DOCTYPE html>
    <html lang="en">
    <style>
        body{
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        h1{
            color: #333;
        }
        p{
            color: #555;
        }
    </style>
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>OTP Verification</title>
    </head>
    <body>
        <h1>OTP Verification</h1>
        <p>Your OTP is: <strong>${otp}</strong></p>
        <p>Please enter this code to verify your email address.</p>
    </body>
</html>
`
}
