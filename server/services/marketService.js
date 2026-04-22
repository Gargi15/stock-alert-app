import { getNiftyData, getSensexData, getStockData } from "../stockService.js";
import { calculateChange, shouldAlert } from "../alertService.js";
import { sendMessage } from "../telegramService.js";
import { getState, setState } from "../stateService.js";
import { getAllUsers, removeInvalidToken } from "../userService.js";
import { getMessagingInstance } from "../firebaseAdmin.js";


const userCooldown = new Map(); // userId → last notification timestamp
const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes (tune later)


/**
 * 
 * @param {} user 
 * @returns true if the cooldown period for sending notification for a particular user 
 * has lapsed.
 */
function isCoolDownActive(user){
    const now = Date.now();
    const lastSent = userCooldown.get(user.userId);

    const flag = lastSent && (now - lastSent < COOLDOWN_MS)
    console.log("cooldown flag is: ", flag)
    return flag

}

/**
 * This API checks if the market is open for stock trading
 * @returns true if its open else false
 */
function isMarketOpen() {
    const now = new Date();

    const hours = now.getHours();
    const minutes = now.getMinutes();

    const currentTime = hours * 60 + minutes;

    const start = 9 * 60 + 15;   // 9:15 AM
    const end = 15 * 60 + 30;    // 3:30 PM

    //return currentTime >= start && currentTime <= end;
    return true
}

async function testFCMNotification(users){
    const messaging = getMessagingInstance();

    for (const user of users) {
        for (const token of user.tokens) {
            try {
            await messaging.send({
                token,
                notification: {
                title: "🔥 Cron Test",
                body: "This is from your cron job",
                },
            });
            } catch (err) {
            console.error("Error sending notification:", err.message);
            }
        }
    }
}

/**
 * 
 * @param {*} user : user to whom the firebase notification is sent
 * @param {*} message : Market Alert message with NIFTY, SENSEX and other stock deltas:: 
 * @returns 
 */
async function sendFCMNotification(user, message) {
    if (!user.tokens || user.tokens.length === 0) return;
  
    const messaging = getMessagingInstance();
    for (const token of user.tokens) {
      try {
        await messaging.send({
          token,
          notification: {
            title: "📈 Stock Alert",
            body: message.slice(0, 200), // FCM has size limits
          },
        });
      } catch (err) {
        console.error("FCM error:", {
            userId: user.userId,
            token: token.slice(0, 10) + "...",
            error: err.message,
            code: err.code
          });
  
        // Optional: remove invalid token
        if (err.code === "messaging/registration-token-not-registered") {
            console.error("FCM error:", err.message);
        
          if (
            err.code === "messaging/registration-token-not-registered" ||
            err.code === "messaging/invalid-registration-token"
          ) {
            await removeInvalidToken(user.userId, token);
          }
            }
        }
      }
    }
  

/* sends a telegram notification to the user is valid chat id is present */
async function sendTelegramNotification(user, message) {
    if (!user.chatId) return;
  
    console.log("Sending TELEGRAM to:", user.chatId);
    await sendMessage(user.chatId, message);
  }

/* main function which checks the market and creates the alerts for the stocks, and sends notification based on threshold values*/
async function checkMarket() {
    try {

         // 🛑 Market hours guard
        if (!isMarketOpen()) {
            console.log("Market closed, skipping alerts");
            return;
        }
       
        const users = await getAllUsers();
        const allSymbols = new Set();

        try{
        console.log("Users are: ", users)
        users.forEach(user => {
            user.indices.forEach(i => allSymbols.add(i));
            user.watchlist.forEach(s => allSymbols.add(s));
        });
        }catch(error){
            console.log("Encountered error while iterating through users", error)
            
        }

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

        console.log("Market Data: ", marketData);

        for (let user of users) {

            console.log("Processing user:", user.userId);

            if (!user.chatId && (!user.tokens || user.tokens.length === 0)) {
                console.log(`Skipping user ${user.userId} (no delivery channel)`);
                continue;
            }

            let triggeredSymbols = [];
            let message = "";
           // message += "🚨 Market Alert 🚨\n\n";
            let shouldSend = false;

            const indices = user.indices || [];
            const watchlist = user.watchlist || [];

            if (indices.length === 0 && watchlist.length === 0) {
            console.log(`Skipping ${user.userId} (no symbols)`);
            continue;
            }
        
            const userSymbols = [...indices, ...watchlist];
        
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
                
                // add this condition later: !prevState
                if (alert && !prevState ) {
                    if (!shouldSend) {
                        message += "🚨 Market Alert 🚨\n\n";
                    }
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

            console.log("Should send is: ", shouldSend)
            //shouldSend = true - This is for testing alerts irrespective
        
            // earlier condition: shouldSend || message.length > 25
            if (shouldSend ) {
                if (isCoolDownActive(user)) {
                    console.log(`⏳ Skipping ${user.userId} (cooldown active)`);
                    continue;
                }
                console.log("Sending notifications for user:", user.userId);
                console.log("Message is: ", message)

                // 🔔 Firebase
                await sendFCMNotification(user, message);

                // 📩 Telegram (keep temporarily)
                await sendTelegramNotification(user, message);

                userCooldown.set(user.userId, Date.now());
  
            }
        }

    } catch (error) {
        console.error("❌ checkMarket error:", {
            message: error.message,
            stack: error.stack,
          });
    }
}

export { checkMarket }