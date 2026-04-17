import { getNiftyData, getSensexData, getStockData } from "./stockService.js";
import { calculateChange, shouldAlert } from "./alertService.js";
import { sendMessage } from "./telegramService.js";
import { getState, setState } from "./stateService.js";
import { getAllUsers } from "./userService.js";


function isMarketOpen() {
    const now = new Date();

    const hours = now.getHours();
    const minutes = now.getMinutes();

    const currentTime = hours * 60 + minutes;

    const start = 9 * 60 + 15;   // 9:15 AM
    const end = 15 * 60 + 30;    // 3:30 PM

    return currentTime >= start && currentTime <= end;
    //return true
}

async function checkMarket() {
    try {

         // 🛑 Market hours guard
        if (!isMarketOpen()) {
            console.log("Market closed, skipping alerts");
            return;
        }

        const users = await getAllUsers();
        const allSymbols = new Set();
        users.forEach(user => {
            user.indices.forEach(i => allSymbols.add(i));
            user.watchlist.forEach(s => allSymbols.add(s));
        });

        console.log("All Symbols looks like this uer:", allSymbols);

        const marketData = {};

        for (let symbol of allSymbols) {
            if (symbol === "NIFTY") {
                marketData[symbol] = await getNiftyData();
            } else if (symbol === "SENSEX") {
                marketData[symbol] = await getSensexData();
            }else {
                marketData[symbol] = await getStockData(symbol);
            }
        }


        for (let user of users) {

            console.log("Processing user:", user.userId);
            let triggeredSymbols = [];
            let message = "";
            message += "🚨 Market Alert 🚨\n\n";
            let shouldSend = false;
        
            const userSymbols = [...user.indices, ...user.watchlist];
        
            for (let symbol of userSymbols) {
        
                const data = marketData[symbol];
                if (!data) continue;
        
                const change = calculateChange(data.price, data.prevClose);
                const alert = shouldAlert(change, user.threshold);
                console.log("Alert is: ", alert)
                console.log("Change is: ", change)
        
                const key = user.userId + "_" + symbol;
                const prevState = await getState(key);
                console.log("prev state is: ", prevState)
        
                if (alert && !prevState) {
                    const direction = change >= 0 ? "📈" : "📉";
                    const sign = change >= 0 ? "+" : "-";
                    const line = `${direction} ${symbol}: ${sign}${change.toFixed(2)}%\n`;
                    message += line;
                    console.log("message :", message);
                    shouldSend = true;
                    triggeredSymbols.push(key);
                    await setState(key, true);
                }
        
                if (!alert && prevState) {
                    await setState(key, false);
                }
            }

            console.log("Message is: \t", message)
            console.log("Should send is: ", shouldSend)
            console.log("TriggeredSymbols are:", triggeredSymbols)
        
            if (shouldSend || message.length > 25) {
                console.log("User id is: ", user.chatId)
                console.log("Message is: ", message)
                await sendMessage(user.chatId, message);

                for (let key of triggeredSymbols) {
                    await setState(key, true);
                }
            }
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

checkMarket();