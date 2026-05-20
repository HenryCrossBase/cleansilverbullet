const { sendChannelTelegramAlert } = require("./routes/shared");

async function run() {
    console.log("Sending test channel notification to @sbmrkt...");
    const message = `🚀 <b>CodeOpsHub</b> have added <b>7 POF(Unpaid)</b>!`;
    const result = await sendChannelTelegramAlert(message);
    console.log("Result:", result);
}

run();
