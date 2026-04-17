import "dotenv/config";
import axios from "axios";

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

async function sendTestMessage() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    console.log("URL is: ", url);

    try {
        const response = await axios.post(url, {
            chat_id: CHAT_ID,
            text: "🚀 Hello Gargi! Your Stock Alert App is alive!"
        });

        console.log("Message sent!", response.data);
    } catch (error) {
        console.error("Error sending message:", error.message);
    }
}

sendTestMessage();