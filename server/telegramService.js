import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

export async function sendMessage(chat_id, message) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    console.log("CHAT_ID env:", CHAT_ID, "type:", typeof CHAT_ID);
    console.log("chatId mongo:", chat_id, "type:", typeof chat_id);
    console.log("same as string?", String(CHAT_ID) === String(chat_id));

    await axios.post(url, {
        chat_id: chat_id,
        text: message
    });
}